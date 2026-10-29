import { query } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { readId, getSourceForUser } from "@/lib/projects";

// GET /api/sources/:id/details
// Everything the source page shows except similar sources:
// the source with its project, authors and tags, the browse path that led to it,
// the sources it cites and the sources that cite it.
// The owner and the admin can see it; canEdit is true only for the owner.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sourceId = await readId(params);
  const source = sourceId && (await getSourceForUser(sourceId, user));
  if (!source) return Response.json({ error: "Source not found." }, { status: 404 });

  const [[extra], path, cites, citedBy] = await Promise.all([
    // Project title, authors in order, tags
    query(
      `SELECT p.title AS project_title,
              (SELECT string_agg(a.author_name, ', ' ORDER BY sa.author_order)
                 FROM source_authors sa JOIN authors a ON a.author_id = sa.author_id
                WHERE sa.source_id = $1) AS authors,
              (SELECT COALESCE(array_agg(t.name ORDER BY t.name), '{}')
                 FROM source_tags st JOIN tags t ON t.tag_id = st.tag_id
                WHERE st.source_id = $1) AS tags
       FROM projects p
       WHERE p.project_id = $2`,
      [sourceId, source.project_id]
    ),

    // Browse path from the start of the trail to this source (recursive function in the SQL file)
    query("SELECT step, source_id, title FROM get_browse_path($1)", [sourceId]),

    // Citation graph, outgoing: sources this one cites
    query(
      `SELECT s.source_id, s.title, s.type, s.publication_year
       FROM citations c
       JOIN sources s ON s.source_id = c.cited_source_id
       WHERE c.citing_source_id = $1
       ORDER BY s.publication_year DESC NULLS LAST, s.title`,
      [sourceId]
    ),

    // Citation graph, incoming: sources that cite this one
    query(
      `SELECT s.source_id, s.title, s.type, s.publication_year
       FROM citations c
       JOIN sources s ON s.source_id = c.citing_source_id
       WHERE c.cited_source_id = $1
       ORDER BY s.publication_year DESC NULLS LAST, s.title`,
      [sourceId]
    ),
  ]);

  return Response.json({
    source: {
      source_id: source.source_id,
      project_id: source.project_id,
      title: source.title,
      url: source.url,
      type: source.type,
      abstract: source.abstract,
      note: source.note,
      publication_year: source.publication_year,
      time_spent_min: source.time_spent_min,
      visited_at: source.visited_at,
      canEdit: source.canEdit,
      ...extra,
    },
    path,
    cites,
    citedBy,
  });
}
