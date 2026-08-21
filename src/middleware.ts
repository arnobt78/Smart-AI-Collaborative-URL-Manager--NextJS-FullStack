import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Pass pathname to root layout so /login can skip Navbar/Footer. */
export function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", request.nextUrl.pathname);
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
