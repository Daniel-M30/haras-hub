import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME, getAuthCookieOptions } from "@/src/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });

  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, "", {
    ...getAuthCookieOptions(),
    maxAge: 0,
  });

  return response;
}
