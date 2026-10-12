import { query } from "@/lib/db";
import { getCurrentUser, unauthorized, forbidden } from "@/lib/auth";

// GET /api/projects
// Researchers get their own projects; the admin gets every project.
// Counts come from the view v_project_stats.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();

  const rows = await query(
    `SELECT v.project_id, v.title, p.description, v.owner, v.status,
            v.source_count::int   AS source_count,
            v.citation_count::int AS citation_count,
            v.total_minutes::int  AS total_minutes,
            p.created_at
     FROM v_project_stats v
     JOIN projects p ON p.project_id = v.project_id
     WHERE $1 = 'admin' OR p.owner_id = $2
     ORDER BY p.created_at DESC`,
    [user.role, user.userId]
  );
  return Response.json({ projects: rows });
}

// POST /api/projects  body: { title, description }
// Creates a project owned by the logged-in researcher.
export async function POST(request) {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  if (user.role === "admin") return forbidden(); // the admin only views projects

  const body = await request.json().catch(() => ({}));
  const title = String(body.title ?? "").trim();
  const description = String(body.description ?? "").trim() || null;

  if (!title) {
    return Response.json({ error: "Project title is required." }, { status: 400 });
  }

  try {
    const rows = await query(
      `INSERT INTO projects (owner_id, title, description)
       VALUES ($1, $2, $3)
       RETURNING project_id, title, description, status, created_at`,
      [user.userId, title, description]
    );
    return Response.json({ project: rows[0] }, { status: 201 });
  } catch (error) {
    if (error.code === "23514") {
      return Response.json({ error: "Project title cannot be blank." }, { status: 400 });
    }
    if (error.code === "22001") {
      return Response.json({ error: "Project title is too long (max 200 characters)." }, { status: 400 });
    }
    throw error;
  }
}