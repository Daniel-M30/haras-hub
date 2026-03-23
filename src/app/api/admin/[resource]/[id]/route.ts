import { NextResponse } from "next/server";
import {
  assertAdminPermission,
  deleteObjectByClass,
  getAdminSession,
  isAdminClassId,
  toAdminError,
  updateObjectByClass,
} from "@/src/lib/admin";
import type { AdminResourceWithIdRouteContext } from "@/src/types";

export async function PATCH(request: Request, { params }: AdminResourceWithIdRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  try {
    const { id, resource } = await params;

    if (!isAdminClassId(resource)) {
      return NextResponse.json({ error: "Recurso administrativo invalido." }, { status: 404 });
    }

    await assertAdminPermission(resource, session.permissions, "update");
    const body = await request.json().catch(() => null);
    const result = await updateObjectByClass(resource, id, body);

    return NextResponse.json(result);
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}

export async function DELETE(_request: Request, { params }: AdminResourceWithIdRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  try {
    const { id, resource } = await params;

    if (!isAdminClassId(resource)) {
      return NextResponse.json({ error: "Recurso administrativo invalido." }, { status: 404 });
    }

    await assertAdminPermission(resource, session.permissions, "delete");
    await deleteObjectByClass(resource, id, session);

    return NextResponse.json({ ok: true });
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
