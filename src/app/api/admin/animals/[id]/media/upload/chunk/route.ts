import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import { uploadAnimalMediaChunk } from "@/src/lib/storage";
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

    const sessionId = request.headers.get("x-upload-session-id")?.trim() ?? "";
    const storageKey = request.headers.get("x-upload-storage-key")?.trim() ?? "";
    const chunkIndex = Number.parseInt(request.headers.get("x-upload-chunk-index") ?? "", 10);
    const chunkBuffer = Buffer.from(await request.arrayBuffer());

    if (!storageKey.startsWith(`animals/${id}/`)) {
      return NextResponse.json({ error: "Chave de armazenamento invalida para este animal." }, { status: 400 });
    }

    await uploadAnimalMediaChunk({
      chunkBody: chunkBuffer,
      chunkIndex,
      sessionId,
      storageKey,
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
