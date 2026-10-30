import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";

// GET /api/admin/users  (admin only)
// Every user with how many projects and sources they have, their reading time
// and when they last logged a source. LEFT JOINs keep users with no projects (counts of 0).
// COUNT(DISTINCT ...) is needed because joining sources repeats each project once per source.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden(); // proxy.js protects the page, not this route

  const users = await query(
    `SELECT u.user_id, u.name, u.email, u.role, u.institution, u.created_at,
            COUNT(DISTINCT p.project_id)::int        AS project_count,
            COUNT(s.source_id)::int                  AS source_count,
            COALESCE(SUM(s.time_spent_min), 0)::int  AS total_minutes,
            MAX(s.visited_at)                        AS last_active
     FROM users u
     LEFT JOIN projects p ON p.owner_id = u.user_id
     LEFT JOIN sources s  ON s.project_id = p.project_id
     GROUP BY u.user_id
     ORDER BY u.role, u.name`
  );

  return Response.json({ users });
}
