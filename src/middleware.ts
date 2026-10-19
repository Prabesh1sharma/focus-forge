import { auth } from "@/lib/auth/config";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login", "/register", "/forgot-password"];
const AUTH_ROUTES = ["/login", "/register"];

export default auth((req: NextRequest & { auth: unknown }) => {
  const { pathname } = req.nextUrl;
  const isAuthenticated = !!req.auth;

  // Allow public asset routes
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/auth") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && AUTH_ROUTES.some((r) => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && !PUBLIC_ROUTES.some((r) => pathname.startsWith(r)) && pathname !== "/") {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
