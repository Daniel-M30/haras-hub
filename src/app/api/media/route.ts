import { NextRequest, NextResponse } from "next/server";
import { getMediaCacheHeaders, getMediaResponse } from "@/src/lib/storage";

export const runtime = "nodejs";

function buildHeaders(media: Awaited<ReturnType<typeof getMediaResponse>>) {
  return {
    ...getMediaCacheHeaders(),
    "Accept-Ranges": "bytes",
    ...(media.contentLength ? { "Content-Length": String(media.contentLength) } : {}),
    ...(media.contentRange ? { "Content-Range": media.contentRange } : {}),
    ...(media.contentType ? { "Content-Type": media.contentType } : {}),
    ...(media.etag ? { ETag: media.etag } : {}),
    ...(media.lastModified ? { "Last-Modified": media.lastModified } : {}),
  };
}

async function resolveMediaRequest(request: NextRequest) {
  const storageKey = request.nextUrl.searchParams.get("key") ?? "";

  if (!storageKey) {
    return NextResponse.json({ error: "Informe a chave da midia." }, { status: 400 });
  }

  try {
    const media = await getMediaResponse(storageKey, request.headers.get("range"));

    return new NextResponse(media.body, {
      headers: buildHeaders(media),
      status: media.status,
    });
  } catch {
    return NextResponse.json({ error: "Midia nao encontrada." }, { status: 404 });
  }
}

export async function GET(request: NextRequest) {
  return resolveMediaRequest(request);
}

export async function HEAD(request: NextRequest) {
  const response = await resolveMediaRequest(request);

  return new NextResponse(null, {
    headers: response.headers,
    status: response.status,
  });
}
