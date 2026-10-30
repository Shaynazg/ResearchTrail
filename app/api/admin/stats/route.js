import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";

// GET /api/admin/stats  (admin only)
// Site-wide numbers for the admin page: totals, sources by type,
// popular tags and the most-cited sources.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role !== "admin") return forbidden(); // proxy.js protects the page, not this route

  const [[totals], byType, popularTags, mostCited] = await Promise.all([
    // One row of counts, each from its own subquery
    query(
      `SELECT (SELECT COUNT(*) FROM users)::int                              AS users,
              (SELECT COUNT(*) FROM users WHERE role = 'researcher')::int    AS researchers,
              (SELECT COUNT(*) FROM projects)::int                           AS projects,
              (SELECT COUNT(*) FROM projects WHERE status = 'active')::int   AS active_projects,
              (SELECT COUNT(*) FROM sources)::int                            AS sources,
              (SELECT COUNT(*) FROM sources WHERE embedding IS NOT NULL)::int AS embedded_sources,
              (SELECT COUNT(*) FROM citations)::int                          AS citations,
              (SELECT COUNT(*) FROM authors)::int                            AS authors,
              (SELECT COUNT(*) FROM tags)::int                               AS tags,
              (SELECT COALESCE(SUM(time_spent_min), 0) FROM sources)::int    AS total_minutes`
    ),

    // GROUP BY: how many sources of each type
    query(
      `SELECT type, COUNT(*)::int AS count
       FROM sources
       GROUP BY type
       ORDER BY count DESC, type`
    ),

    // GROUP BY + HAVING: tags used on at least 2 sources
    query(
      `SELECT t.name, COUNT(*)::int AS uses
       FROM tags t
       JOIN source_tags st ON st.tag_id = t.tag_id
       GROUP BY t.name
       HAVING COUNT(*) >= 2
       ORDER BY uses DESC, t.name`
    ),

    // Citation graph: the sources cited most often, with their project
    query(
      `SELECT s.source_id, s.title, p.title AS project_title, COUNT(*)::int AS times_cited
       FROM citations c
       JOIN sources s  ON s.source_id = c.cited_source_id
       JOIN projects p ON p.project_id = s.project_id
       GROUP BY s.source_id, s.title, p.title
       ORDER BY times_cited DESC, s.title
       LIMIT 5`
    ),
  ]);

  return Response.json({ totals, byType, popularTags, mostCited });
}
