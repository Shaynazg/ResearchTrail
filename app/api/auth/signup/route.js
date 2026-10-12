import bcrypt from "bcryptjs";
import { query } from "@/lib/db";
import { createSession } from "@/lib/auth";

// POST /api/auth/signup  body: { name, email, password, institution }
export async function POST(request) {
  const body = await request.json().catch(() => ({}));
  const name = String(body.name ?? "").trim();
  const email = String(body.email ?? "").trim().toLowerCase();
  const password = String(body.password ?? "");
  const institution = String(body.institution ?? "").trim() || null;

  if (!name || !email || !password) {
    return Response.json({ error: "Name, email and password are required." }, { status: 400 });
  }
  if (password.length < 8) {
    return Response.json({ error: "Password must be at least 8 characters." }, { status: 400 });
  }

  // Store only a bcrypt hash, never the password itself
  const passwordHash = await bcrypt.hash(password, 12);

  try {
    // role is not sent by the browser: every new account gets the default 'researcher'
    const rows = await query(
      `INSERT INTO users (name, email, password_hash, institution)
       VALUES ($1, $2, $3, $4)
       RETURNING user_id, name, role`,
      [name, email, passwordHash, institution]
    );
    await createSession(rows[0]);
    return Response.json({ user: rows[0] }, { status: 201 });
  } catch (error) {
    // Errors raised by the database constraints
    if (error.code === "23505") {
      return Response.json({ error: "An account with this email already exists." }, { status: 409 });
    }
    if (error.code === "23514") {
      return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    if (error.code === "22001") {
      return Response.json({ error: "One of the fields is too long." }, { status: 400 });
    }
    throw error;
  }
}