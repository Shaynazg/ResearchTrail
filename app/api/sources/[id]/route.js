import { query, withTransaction } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { readId, getSourceForUser } from "@/lib/projects";
import { dbErrorResponse } from "@/lib/dbErrors";
import { parseSourceBody, saveSourceLinks } from "@/lib/sources";

function notFound() {
  return Response.json({ error: "Source not found." }, { status: 404 });
}

// GET /api/sources/:id
// One source with its authors, tags and the ids it cites (used by the edit form)
export async function GET(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sourceId = await readId(params);
  const source = sourceId && (await getSourceForUser(sourceId, user));
  if (!source) return notFound();

  const [extra] = await query(
    `SELECT
       (SELECT string_agg(a.author_name, ', ' ORDER BY sa.author_order)
          FROM source_authors sa JOIN authors a ON a.author_id = sa.author_id
         WHERE sa.source_id = $1) AS authors,
       (SELECT COALESCE(array_agg(t.name ORDER BY t.name), '{}')
          FROM source_tags st JOIN tags t ON t.tag_id = st.tag_id
         WHERE st.source_id = $1) AS tags,
       (SELECT COALESCE(array_agg(c.cited_source_id), '{}')
          FROM citations c WHERE c.citing_source_id = $1) AS cites`,
    [sourceId]
  );

  return Response.json({
    source: {
      source_id: source.source_id,
      project_id: source.project_id,
      parent_source_id: source.parent_source_id,
      title: source.title,
      url: source.url,
      type: source.type,
      abstract: source.abstract,
      note: source.note,
      publication_year: source.publication_year,
      time_spent_min: source.time_spent_min,
      canEdit: source.canEdit,
      ...extra,
    },
  });
}

// PUT /api/sources/:id
// Edit a source. In ONE transaction: update the row, then replace its
// authors, tags and citations with the ones in the form.
export async function PUT(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sourceId = await readId(params);
  const source = sourceId && (await getSourceForUser(sourceId, user));
  if (!source || !source.canEdit) return notFound();

  const { values, error } = parseSourceBody(await request.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });

  // Moving a source under one of its own descendants would create a loop in the
  // browse tree. A recursive query finds every source below this one.
  if (values.parentId) {
    const loop = await query(
      `WITH RECURSIVE below AS (
         SELECT source_id FROM sources WHERE parent_source_id = $1
         UNION ALL
         SELECT s.source_id FROM sources s JOIN below b ON s.parent_source_id = b.source_id
       )
       SELECT 1 FROM below WHERE source_id = $2`,
      [sourceId, values.parentId]
    );
    if (loop.length > 0) {
      return Response.json(
        { error: "A source cannot come from one of the sources that came from it." },
        { status: 400 }
      );
    }
  }

  try {
    await withTransaction(async (client) => {
      await client.query(
        `UPDATE sources
         SET parent_source_id = $2, title = $3, url = $4, type = $5, abstract = $6,
             note = $7, publication_year = $8, time_spent_min = $9
         WHERE source_id = $1`,
        [sourceId, values.parentId, values.title, values.url, values.type,
         values.abstract, values.note, values.year, values.minutes]
      );

      // Replace the old links with the new ones
      await client.query("DELETE FROM source_authors WHERE source_id = $1", [sourceId]);
      await client.query("DELETE FROM source_tags WHERE source_id = $1", [sourceId]);
      await client.query("DELETE FROM citations WHERE citing_source_id = $1", [sourceId]);
      await saveSourceLinks(client, sourceId, source.project_id, values);
    });

    return Response.json({ ok: true, project_id: source.project_id });
  } catch (error) {
    return dbErrorResponse(error);
  }
}

// DELETE /api/sources/:id
// In ONE transaction: move this source's children up to its own parent
// (so the browse trail is not broken), then delete it. Its citations and
// author/tag links are removed by ON DELETE CASCADE.
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const sourceId = await readId(params);
  const source = sourceId && (await getSourceForUser(sourceId, user));
  if (!source || !source.canEdit) return notFound();

  try {
    await withTransaction(async (client) => {
      await client.query(
        "UPDATE sources SET parent_source_id = $2 WHERE parent_source_id = $1",
        [sourceId, source.parent_source_id]
      );
      await client.query("DELETE FROM sources WHERE source_id = $1", [sourceId]);
    });
    return Response.json({ ok: true, project_id: source.project_id });
  } catch (error) {
    return dbErrorResponse(error);
  }
}