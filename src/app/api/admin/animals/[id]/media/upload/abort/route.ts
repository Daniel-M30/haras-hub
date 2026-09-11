import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { abortAnimalMediaUpload } from "@/src/lib/storage";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import type { AdminAnimalMediaRouteContext } from "@/src/types";

export async function POST(request: Request, { params }: AdminAnimalMediaRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  try {
    await assertAdminPermission("animals", session.permissions, "update");
    const { id } = await params;
    const animal = await prisma.animal.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
      },
    });

    if (!animal) {
      return NextResponse.json({ error: "Animal nao encontrado." }, { status: 404 });
    }

    const body = (await request.json().catch(() => null)) as
      | {
          sessionId?: unknown;
          storageKey?: unknown;
          totalChunks?: unknown;
        }
      | null;
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const storageKey = typeof body?.storageKey === "string" ? body.storageKey.trim() : "";
    const totalChunks =
      typeof body?.totalChunks === "number"
        ? body.totalChunks
        : typeof body?.totalChunks === "string"
          ? Number.parseInt(body.totalChunks, 10)
          : Number.NaN;

    if (!storageKey.startsWith(`animals/${id}/`)) {
      return NextResponse.json({ error: "Chave de armazenamento invalida para este animal." }, { status: 400 });
    }

    await abortAnimalMediaUpload({
      sessionId,
      storageKey,
      totalChunks,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
