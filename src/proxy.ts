import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Pass pathname (+ search for auth bounce) to RSC.
 * x-pathname stays path-only (layout isAuthRoute).
 * x-search is from nextUrl only — never client-supplied headers.
 */
export function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
  requestHeaders.set("x-search", request.nextUrl.search);
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export const config = {
  matcher: [
    /*
     * Skip static assets; run on app routes including /login.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)",
  ],
};
