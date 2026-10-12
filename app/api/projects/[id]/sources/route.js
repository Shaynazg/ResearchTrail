import { withTransaction } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";
import { readId, getProjectForUser } from "@/lib/projects";
import { dbErrorResponse } from "@/lib/dbErrors";
import { parseSourceBody, saveSourceLinks } from "@/lib/sources";

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

  const { values, error } = parseSourceBody(await request.json().catch(() => ({})));
  if (error) return Response.json({ error }, { status: 400 });

  try {
    const sourceId = await withTransaction(async (client) => {
      // The trigger trg_parent_project rejects a parent from another project;
      // CHECK constraints reject a bad URL / year / type / minutes.
      const inserted = await client.query(
        `INSERT INTO sources (project_id, parent_source_id, title, url, type,
                              abstract, note, publication_year, time_spent_min)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING source_id`,
        [projectId, values.parentId, values.title, values.url, values.type,
         values.abstract, values.note, values.year, values.minutes]
      );
      const newId = inserted.rows[0].source_id;

      await saveSourceLinks(client, newId, projectId, values);
      return newId;
    });

    return Response.json({ source_id: sourceId }, { status: 201 });
  } catch (error) {
    return dbErrorResponse(error);
  }
}