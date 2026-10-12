import { deleteSession } from "@/lib/auth";

// POST /api/auth/logout
export async function POST() {
  await deleteSession();
  return Response.json({ ok: true });
}