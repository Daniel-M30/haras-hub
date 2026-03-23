import bcrypt from "bcryptjs";
import { NextResponse } from "next/server";
import { AUTH_TOKEN_COOKIE_NAME, createAuthToken, getAuthCookieOptions } from "@/src/lib/auth";
import { prisma } from "@/src/lib/prisma";
import z from "zod";

const loginSchema = z.object({
  email: z.email(),
  password: z.string(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const result = loginSchema.safeParse(body);

  if (!result.success) {
    return NextResponse.json(
      { error: result.error },
      {
        status: 400,
      },
    );
  }

  const { email, password } = result.data;

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      password: true,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "Credenciais invalidas." },
      {
        status: 401,
      },
    );
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);

  if (!isPasswordValid) {
    return NextResponse.json(
      { error: "Credenciais invalidas." },
      {
        status: 401,
      },
    );
  }

  const authToken = await createAuthToken({ sub: user.id });

  const response = NextResponse.json({ success: true });
  response.cookies.set(AUTH_TOKEN_COOKIE_NAME, authToken, getAuthCookieOptions());

  return response;
}
