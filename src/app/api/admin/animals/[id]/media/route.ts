import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import { uploadAnimalMedia } from "@/src/lib/storage";
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

    const formData = await request.formData();
    const files = formData
      .getAll("files")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (!files.length) {
      return NextResponse.json({ error: "Selecione ao menos um arquivo." }, { status: 400 });
    }

    for (const file of files) {
      const uploadResult = await uploadAnimalMedia({
        animalId: id,
        file,
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
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
