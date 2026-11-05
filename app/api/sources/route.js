import { query } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";

// GET /api/sources
// Every source in the logged-in researcher's own projects, with the project name.
// Used for the "came from" list, which offers sources from all projects.
// Picking one from another project is rejected by the trigger trg_parent_project.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const rows = await query(
    `SELECT s.source_id, s.title, s.project_id, p.title AS project_title
     FROM sources s
     JOIN projects p ON p.project_id = s.project_id
     WHERE p.owner_id = $1
     ORDER BY p.title, s.source_id`,
    [user.userId]
  );
  return Response.json({ sources: rows });
}