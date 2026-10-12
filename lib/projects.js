import { query } from "@/lib/db";

// Read the [id] from a route's params and turn it into a positive whole number (or null)
export async function readId(params, name = "id") {
  const value = Number((await params)[name]);
  return Number.isInteger(value) && value > 0 ? value : null;
}

// Load a project the user is allowed to see.
// Owner: can view and edit. Admin: can view only. Anyone else: null (treated as "not found").
export async function getProjectForUser(projectId, user) {
  const rows = await query(
    "SELECT project_id, owner_id, title, description, status FROM projects WHERE project_id = $1",
    [projectId]
  );
  const project = rows[0];
  if (!project) return null;

  const isOwner = project.owner_id === user.userId;
  if (!isOwner && user.role !== "admin") return null;

  return { ...project, canEdit: isOwner };
}