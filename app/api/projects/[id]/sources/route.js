import { withTransaction } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { readId, getProjectForUser } from "@/lib/projects";
import { dbErrorResponse } from "@/lib/dbErrors";

// Split "a, b, c" into ["a", "b", "c"]: trimmed, no blanks, no repeats
function splitList(text) {
  const items = String(text ?? "").split(",").map((item) => item.trim()).filter(Boolean);
  return [...new Set(items)];
}

// Empty input -> null, otherwise a whole number (NaN if it is not one)
function optionalInt(value) {
  if (value === undefined || value === null || String(value).trim() === "") return null;
  return Number(value);
}

// POST /api/projects/:id/sources
// body: { title, url, type, publication_year, time_spent_min, abstract, note,
//         parent_source_id, authors: "A, B", tags: "x, y", cites: [source ids] }
//
// Saves the source, its authors, tags and citations in ONE transaction:
// if any step fails, nothing is saved.
export async function POST(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const projectId = await readId(params);
  const project = projectId && (await getProjectForUser(projectId, user));
  if (!project || !project.canEdit) {
    return Response.json({ error: "Project not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const url = String(body.url ?? "").trim() || null;
  const type = String(body.type ?? "paper");
  const abstract = String(body.abstract ?? "").trim() || null;
  const note = String(body.note ?? "").trim() || null;
  const year = optionalInt(body.publication_year);
  const minutes = optionalInt(body.time_spent_min) ?? 0;
  const parentId = optionalInt(body.parent_source_id);
  const authors = splitList(body.authors);
  const tags = splitList(String(body.tags ?? "").toLowerCase());
  const cites = (Array.isArray(body.cites) ? body.cites : []).map(Number).filter(Number.isInteger);

  if (!title) {
    return Response.json({ error: "Title is required." }, { status: 400 });
  }
  if (Number.isNaN(year) || Number.isNaN(minutes) || Number.isNaN(parentId)) {
    return Response.json({ error: "Year, time spent and parent must be numbers." }, { status: 400 });
  }

  try {
    const sourceId = await withTransaction(async (client) => {
      // 1. The source itself. The trigger trg_parent_project rejects a parent
      //    from another project; CHECK constraints reject bad URL / year / type.
      const inserted = await client.query(
        `INSERT INTO sources (project_id, parent_source_id, title, url, type,
                              abstract, note, publication_year, time_spent_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING source_id`,
        [projectId, parentId, title, url, type, abstract, note, year, minutes]
      );
      const newId = inserted.rows[0].source_id;

      // 2. Authors, in the order typed. Existing authors are reused, new ones created.
      for (const [index, name] of authors.entries()) {
        const author = await client.query(
          `INSERT INTO authors (author_name) VALUES ($1)
           ON CONFLICT (author_name) DO UPDATE SET author_name = EXCLUDED.author_name
           RETURNING author_id`,
          [name]
        );
        await client.query(
          "INSERT INTO source_authors (source_id, author_id, author_order) VALUES ($1, $2, $3)",
          [newId, author.rows[0].author_id, index + 1]
        );
      }

      // 3. Tags: create any that do not exist yet, then link them all
      if (tags.length > 0) {
        await client.query(
          "INSERT INTO tags (name) SELECT unnest($1::varchar[]) ON CONFLICT (name) DO NOTHING",
          [tags]
        );
        await client.query(
          `INSERT INTO source_tags (source_id, tag_id)
           SELECT $1, tag_id FROM tags WHERE name = ANY($2::varchar[])`,
          [newId, tags]
        );
      }

      // 4. Citations: only to sources in the SAME project
      if (cites.length > 0) {
        await client.query(
          `INSERT INTO citations (citing_source_id, cited_source_id)
           SELECT $1, source_id FROM sources
           WHERE project_id = $2 AND source_id = ANY($3::int[])`,
          [newId, projectId, cites]
        );
      }

      return newId;
    });

    return Response.json({ source_id: sourceId }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error);
  }
}