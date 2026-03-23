import jwt from "jsonwebtoken";
import type { AuthTokenPayload } from "@/src/types";

export const AUTH_TOKEN_COOKIE_NAME = "admin_token";
const AUTH_TOKEN_MAX_AGE = 60 * 60 * 8;

function getAuthSecret() {
  return process.env.AUTH_SECRET ?? "dev-secret-change-me";
}

export async function createAuthToken(payload: AuthTokenPayload) {
  return jwt.sign(payload, getAuthSecret(), {
    algorithm: "HS256",
    expiresIn: AUTH_TOKEN_MAX_AGE,
  });
}

export async function verifyAuthToken(token?: string) {
  if (!token) {
    return null;
  }

  try {
    const payload = jwt.verify(token, getAuthSecret(), {
      algorithms: ["HS256"],
    });

    if (!payload || typeof payload !== "object") {
      return null;
    }

    const decodedPayload = payload as AuthTokenPayload;

    if (!decodedPayload.sub) {
      return null;
    }

    return decodedPayload;
  } catch {
    return null;
  }
}

export function getAuthCookieOptions() {
  return {
    httpOnly: true,
    maxAge: AUTH_TOKEN_MAX_AGE,
    path: "/",
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
  };
}
