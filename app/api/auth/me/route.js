import { getCurrentUser, unauthorized } from "@/lib/auth";

// GET /api/auth/me - who is logged in right now
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return Response.json({ user });
}