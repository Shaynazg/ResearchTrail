import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

// POST /api/auth/login  body: { email, password }
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");

  if (!email || !password) {
    return Response.json({ error: "Email and password are required." }, { status: 400 });
  }

  const rows = await query(
    "SELECT user_id, name, role, password_hash FROM users WHERE email = $1",
    [email]
  );
  const user = rows[0];

  // Same message whether the email or the password is wrong,
  // so nobody can find out which emails have accounts
  const passwordOk = user && (await bcrypt.compare(password, user.password_hash));
  if (!passwordOk) {
    return Response.json({ error: "Invalid email or password." }, { status: 401 });
  }

  await createSession(user);
  return Response.json({ user: { user_id: user.user_id, name: user.name, role: user.role } });
}