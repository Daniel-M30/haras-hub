import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import { deleteStorageObject } from "@/src/lib/storage";
import type { AdminAnimalMediaItemRouteContext } from "@/src/types";

export async function DELETE(_request: Request, { params }: AdminAnimalMediaItemRouteContext) {
  const session = await getAdminSession();

  if (!session) {
    return NextResponse.json({ error: "Sessao expirada." }, { status: 401 });
  }

  try {
    await assertAdminPermission("animals", session.permissions, "update");
    const { id, mediaId } = await params;
    const media = await prisma.animalMedia.findFirst({
      where: {
        animalId: id,
        id: mediaId,
      },
      select: {
        id: true,
        storageKey: true,
      },
    });

    if (!media) {
      return NextResponse.json({ error: "Midia nao encontrada." }, { status: 404 });
    }

    await deleteStorageObject(media.storageKey);
    await prisma.animalMedia.delete({
      where: {
        id: mediaId,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
