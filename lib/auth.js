import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";

// Name of the browser cookie that holds the logged-in user's session
export const SESSION_COOKIE = "session";
const ONE_WEEK_IN_SECONDS = 60 * 60 * 24 * 7;

// The secret used to sign session tokens, read from .env.local
function secretKey() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) throw new Error("SESSION_SECRET is missing from .env.local");
  return new TextEncoder().encode(secret);
}

// After signup or login: put a signed token with the user's id, name and role
// in an httpOnly cookie (browser JavaScript cannot read it).
export async function createSession(user) {
  const token = await new SignJWT({
    userId: user.user_id,
    name: user.name,
    role: user.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secretKey());

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ONE_WEEK_IN_SECONDS,
  });
}

// Check a token's signature and expiry. Returns { userId, name, role } or null.
export async function verifyToken(token) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey());
    return { userId: payload.userId, name: payload.name, role: payload.role };
  } catch {
    return null;
  }
}

// The logged-in user for the current request, or null if nobody is logged in.
// Use this at the top of every API route and server page.
export async function getCurrentUser() {
  const cookieStore = await cookies();
  return verifyToken(cookieStore.get(SESSION_COOKIE)?.value);
}

// Logout: remove the cookie
export async function deleteSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

// Standard error responses for API routes
export function unauthorized() {
  return Response.json({ error: "Please log in first." }, { status: 401 });
}

export function forbidden() {
  return Response.json({ error: "You do not have permission to do this." }, { status: 403 });
}