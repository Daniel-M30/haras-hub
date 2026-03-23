import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME, verifyAuthToken } from "@/src/lib/auth";

export async function proxy(request: NextRequest) {
  const authToken = request.cookies.get(AUTH_TOKEN_COOKIE_NAME)?.value;
  const authPayload = await verifyAuthToken(authToken);
  const isAuthenticated = authPayload !== null;
  const isLoginPage = request.nextUrl.pathname === "/admin/login";

  if (!isAuthenticated && !isLoginPage) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/admin/login";
    loginUrl.searchParams.set("next", `${request.nextUrl.pathname}${request.nextUrl.search}`);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthenticated && isLoginPage) {
    const adminUrl = request.nextUrl.clone();
    adminUrl.pathname = "/admin";
    adminUrl.search = "";
    return NextResponse.redirect(adminUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
