import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";
import { readId, getProjectForUser } from "@/lib/projects";

function notFound() {
  return Response.json({ error: "Project not found." }, { status: 404 });
}

// GET /api/projects/:id
// The project and its sources (with authors, tags and citation counts).
// The owner and the admin can see it; canEdit is true only for the owner.
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const projectId = await readId(params);
  if (!projectId) return notFound();

  const project = await getProjectForUser(projectId, user);
  if (!project) return notFound();

  const sources = await query(
    `SELECT s.source_id, s.parent_source_id, s.title, s.url, s.type,
            s.publication_year, s.time_spent_min, s.visited_at,
            (SELECT string_agg(a.author_name, ', ' ORDER BY sa.author_order)
               FROM source_authors sa JOIN authors a ON a.author_id = sa.author_id
              WHERE sa.source_id = s.source_id) AS authors,
            (SELECT array_agg(t.name ORDER BY t.name)
               FROM source_tags st JOIN tags t ON t.tag_id = st.tag_id
              WHERE st.source_id = s.source_id) AS tags,
            (SELECT COUNT(*)::int FROM citations c
              WHERE c.citing_source_id = s.source_id) AS cites_count,
            (SELECT COUNT(*)::int FROM citations c
              WHERE c.cited_source_id = s.source_id) AS cited_by_count
     FROM sources s
     WHERE s.project_id = $1
     ORDER BY s.visited_at DESC`,
    [projectId]
  );

  return Response.json({ project, sources });
}

// PATCH /api/projects/:id  body: { status }
// Only the project's owner can change it.
export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role === "admin") return forbidden();

  const projectId = await readId(params);
  if (!projectId) return notFound();

  const body = await request.json().catch(() => ({}));
  const status = String(body.status ?? "");

  try {
    // "AND owner_id = $3" makes sure nobody can change someone else's project
    const rows = await query(
      `UPDATE projects SET status = $1
       WHERE project_id = $2 AND owner_id = $3
       RETURNING project_id, status`,
      [status, projectId, user.userId]
    );
    if (rows.length === 0) return notFound();
    return Response.json({ project: rows[0] });
  } catch (error) {
    if (error.code === "23514") {
      return Response.json({ error: "Status must be active, completed or archived." }, { status: 400 });
    }
    throw error;
  }
}

// DELETE /api/projects/:id
// Only the owner can delete. Its sources, citations and links are removed
// automatically by ON DELETE CASCADE.
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role === "admin") return forbidden();

  const projectId = await readId(params);
  if (!projectId) return notFound();

  const rows = await query(
    "DELETE FROM projects WHERE project_id = $1 AND owner_id = $2 RETURNING project_id",
    [projectId, user.userId]
  );
  if (rows.length === 0) return notFound();
  return Response.json({ ok: true });
}