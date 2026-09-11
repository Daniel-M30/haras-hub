import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { assertAdminPermission, getAdminSession, toAdminError } from "@/src/lib/admin";
import { createAnimalMediaUploadSession } from "@/src/lib/storage";
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
          contentType?: unknown;
          fileName?: unknown;
          size?: unknown;
        }
      | null;
    const fileName = typeof body?.fileName === "string" ? body.fileName.trim() : "";
    const contentType = typeof body?.contentType === "string" ? body.contentType.trim() : "";
    const fileSize =
      typeof body?.size === "number"
        ? body.size
        : typeof body?.size === "string"
          ? Number(body.size)
          : Number.NaN;

    if (!fileName) {
      return NextResponse.json({ error: "Informe um arquivo valido." }, { status: 400 });
    }

    const uploadSession = createAnimalMediaUploadSession({
      animalId: id,
      contentType,
      fileName,
      fileSize,
    });

    return NextResponse.json(uploadSession);
  } catch (error) {
    const resolvedError = toAdminError(error);
    return NextResponse.json({ error: resolvedError.message }, { status: resolvedError.status });
  }
}
