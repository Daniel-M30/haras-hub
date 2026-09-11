import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import { abortAnimalMediaUpload, commitAnimalMediaUpload, deleteStorageObject } from "@/src/lib/storage";
import type { AdminAnimalMediaRouteContext, RegisteredAnimalMediaUploadInput } from "@/src/types";

export async function POST(request: Request, { params }: AdminAnimalMediaRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as RegisteredAnimalMediaUploadInput | null;
  const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
  const contentType = typeof body?.contentType === "string" ? body.contentType.trim().toLowerCase() : "";
  const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
  const storageKey = typeof body?.storageKey === "string" ? body.storageKey.trim() : "";
  const totalChunks = typeof body?.totalChunks === "number" ? body.totalChunks : Number.parseInt(String(body?.totalChunks ?? ""), 10);

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

    if (!fileName || !contentType || !sessionId || !storageKey || !Number.isInteger(totalChunks) || totalChunks <= 0) {
      return NextResponse.json({ error: "Dados de upload invalidos." }, { status: 400 });
    }

    if (!storageKey.startsWith(`animals/${id}/`)) {
      return NextResponse.json({ error: "Chave de armazenamento invalida para este animal." }, { status: 400 });
    }

    const uploadResult = await commitAnimalMediaUpload({
      contentType,
      fileName,
      sessionId,
      storageKey,
      totalChunks,
    });

    await prisma.animalMedia.create({
      data: {
        animalId: id,
        bucket: uploadResult.bucket,
        contentType: uploadResult.contentType,
        fileName: uploadResult.fileName,
        kind: uploadResult.kind,
        storageKey: uploadResult.storageKey,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    await abortAnimalMediaUpload({
      sessionId,
      storageKey,
      totalChunks,
    });
    await deleteStorageObject(storageKey);

    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
