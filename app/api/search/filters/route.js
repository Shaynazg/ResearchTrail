import { query } from "@/lib/db";
import { getCurrentUser, unauthorized } from "@/lib/auth";

// GET /api/search/filters
// Choices for the search page's dropdowns: the projects the user can see,
// and the tags used on sources in those projects (with how often each is used).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const [projects, tags] = await Promise.all([
    query(
      `SELECT project_id, title
       FROM projects
       WHERE $1 = 'admin' OR owner_id = $2
       ORDER BY title`,
      [user.role, user.userId]
    ),
    query(
      `SELECT t.name, COUNT(*)::int AS uses
       FROM tags t
       JOIN source_tags st ON st.tag_id = t.tag_id
       JOIN sources s      ON s.source_id = st.source_id
       JOIN projects p     ON p.project_id = s.project_id
       WHERE $1 = 'admin' OR p.owner_id = $2
       GROUP BY t.name
       ORDER BY t.name`,
      [user.role, user.userId]
    ),
  ]);

  return Response.json({ projects, tags });
}
