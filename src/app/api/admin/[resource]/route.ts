import { NextResponse } from "next/server";
import { assertAdminPermission, createObjectByClass, getAdminSession, isAdminClassId, toAdminError } from "@/src/lib/admin";
import type { AdminResourceRouteContext } from "@/src/types";

export async function POST(request: Request, { params }: AdminResourceRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  try {
    const { resource } = await params;

    if (!isAdminClassId(resource)) {
      return NextResponse.json({ error: "Recurso administrativo invalido." }, { status: 404 });
    }

    await assertAdminPermission(resource, session.permissions, "create");
    const body = await request.json().catch(() => null);
    const result = await createObjectByClass(resource, body);

    return NextResponse.json(result);
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
