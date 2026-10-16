import { NextResponse } from "next/server";
import { verifyToken, SESSION_COOKIE } from "@/lib/auth";

// Runs before every page listed in config.matcher below.
// Logged-out users go to /login. Non-admins on /admin pages go to /dashboard.
export async function proxy(request) {
  const user = await verifyToken(request.cookies.get(SESSION_COOKIE)?.value);

  if (!user) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  if (request.nextUrl.pathname.startsWith("/admin") && user.role !== "admin") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }
  return NextResponse.next();
}

// Pages that need a logged-in user
export const config = {
  matcher: ["/dashboard/:path*", "/projects/:path*", "/sources/:path*", "/admin/:path*"],
};