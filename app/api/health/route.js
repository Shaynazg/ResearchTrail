import { query } from "@/lib/db";

// GET /api/health - checks the app can reach the database
export async function GET() {
  try {
    const rows = await query("SELECT project_id, title, source_count FROM v_project_stats ORDER BY project_id");
    return Response.json({ ok: true, projects: rows });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}