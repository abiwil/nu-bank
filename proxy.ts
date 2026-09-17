import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  if (
    !request.cookies.has("session") &&
    request.nextUrl.pathname.startsWith("/account")
  ) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/account/:path*"],
};
