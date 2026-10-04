import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const sessionToken =
    request.cookies.get("authjs.session-token")?.value ||
    request.cookies.get("__Secure-authjs.session-token")?.value ||
    request.cookies.get("next-auth.session-token")?.value ||
    request.cookies.get("__Secure-next-auth.session-token")?.value;

  // Protect both portals — redirect to login if no session cookie
  if ((pathname.startsWith("/dashboard") || pathname.startsWith("/staff")) && !sessionToken) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Do NOT redirect from /login based on a raw cookie check — the cookie may
  // be stale/invalid, which caused an infinite redirect loop on Safari.
  // The login page handles post-login redirect client-side via getSession().

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
