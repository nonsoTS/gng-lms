import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic, cookie-only check — no DB call here (Next 16 proxy.ts is meant
// to stay thin). Real session + role checks happen in Server Components.
const PUBLIC_PATHS = ["/sign-in"];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (PUBLIC_PATHS.some((path) => pathname === path)) {
    return NextResponse.next();
  }

  const sessionCookie = getSessionCookie(request);
  if (!sessionCookie) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // api/access-requests has its own auth (a shared secret, checked in the
  // route itself) — it's called server-to-server by the marketing site, so
  // there's never a session cookie to check here.
  matcher: ["/((?!api/auth|api/access-requests|_next/static|_next/image|favicon.ico).*)"],
};
