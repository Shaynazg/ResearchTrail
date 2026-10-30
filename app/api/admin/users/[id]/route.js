import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";
import { readId } from "@/lib/projects";

// DELETE /api/admin/users/:id  (admin only)
// Deletes a researcher. ON DELETE CASCADE in the schema then removes their projects,
// and through those their sources, citations and author/tag links, in the same statement.
// Admin accounts cannot be deleted here, so the site always keeps its admin.
export async function DELETE(request, { params }) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden();

  const userId = await readId(params);
  if (!userId) return Response.json({ error: "User not found." }, { status: 404 });

  const rows = await query(
    "DELETE FROM users WHERE user_id = $1 AND role = 'researcher' RETURNING user_id, name",
    [userId]
  );
  if (rows.length === 0) {
    return Response.json({ error: "User not found, or is an admin." }, { status: 404 });
  }
  return Response.json({ ok: true, deleted: rows[0] });
}
