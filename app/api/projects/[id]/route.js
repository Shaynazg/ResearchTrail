import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";

// Turn the [id] part of the URL into a number, or null if it is not one
async function readProjectId(params) {
  const { id } = await params;
  const projectId = Number(id);
  return Number.isInteger(projectId) && projectId > 0 ? projectId : null;
}

function notFound() {
  return Response.json({ error: "Project not found." }, { status: 404 });
}

// PATCH /api/projects/:id  body: { status }
// Only the project's owner can change it.
export async function PATCH(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role === "admin") return forbidden();

  const projectId = await readProjectId(params);
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

  const projectId = await readProjectId(params);
  if (!projectId) return notFound();

  const rows = await query(
    "DELETE FROM projects WHERE project_id = $1 AND owner_id = $2 RETURNING project_id",
    [projectId, user.userId]
  );
  if (rows.length === 0) return notFound();
  return Response.json({ ok: true });
}