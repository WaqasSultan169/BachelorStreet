import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import { authConfig } from "@/auth.config";

const PROTECTED_PREFIXES = [
  "/account",
  "/admin",
  "/dashboard",
  "/delivery",
] as const;

// Session-reading proxy. The full App Router runs with the Node.js runtime
// (Next 16), so this is safe here. It is a coarse login gate only — real
// authorization re-verifies role + ownership inside route handlers, layouts
// and server actions (see SECURITY.md §3).
export const proxy = NextAuth(authConfig).auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const pathname = nextUrl.pathname;

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

  if (isProtected && !isLoggedIn) {
    const signInUrl = new URL("/login", nextUrl);
    signInUrl.searchParams.set("callbackUrl", `${pathname}${nextUrl.search}`);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/account/:path*",
    "/admin/:path*",
    "/dashboard/:path*",
    "/delivery/:path*",
  ],
};