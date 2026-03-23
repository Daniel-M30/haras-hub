import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { Readable } from "node:stream";
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { MediaKind } from "@/src/generated/prisma/enums";
import type { MediaResponsePayload } from "@/src/types";

function getStorageBucket() {
  return process.env.AWS_S3_BUCKET ?? "";
}

function getStorageRegion() {
  return process.env.AWS_REGION ?? "";
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

function getS3Client() {
  return new S3Client({
    region: getStorageRegion(),
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
    },
  });
}

function ensureStorageConfigured() {
  if (!getStorageBucket() || !getStorageRegion()) {
    throw new Error("Configure AWS_S3_BUCKET e AWS_REGION para habilitar o upload de midias.");
  }
}

function getMediaKindFromMimeType(mimeType: string) {
  if (mimeType.startsWith("image/")) {
    return MediaKind.image;
  }

  if (mimeType.startsWith("video/")) {
    return MediaKind.video;
  }

  throw new Error("Somente imagens e videos sao permitidos.");
}

function normalizeStorageKey(storageKey: string) {
  return storageKey.trim();
}

function isLocalStorageKey(storageKey: string) {
  return storageKey.startsWith("/");
}

function getMediaApiUrl(storageKey: string) {
  const normalizedKey = normalizeStorageKey(storageKey);

  if (!normalizedKey) {
    return "";
  }

  return `/api/media?key=${encodeURIComponent(normalizedKey)}`;
}

function getPublicMediaUrl(storageKey: string) {
  return getMediaApiUrl(storageKey);
}

function getMimeTypeFromFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase();

  switch (extension) {
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".png":
      return "image/png";
    case ".gif":
      return "image/gif";
    case ".webp":
      return "image/webp";
    case ".svg":
      return "image/svg+xml";
    case ".mp4":
      return "video/mp4";
    case ".webm":
      return "video/webm";
    case ".mov":
      return "video/quicktime";
    case ".m4v":
      return "video/x-m4v";
    default:
      return "application/octet-stream";
  }
}

function parseRangeHeader(rangeHeader: string | null, fileSize: number) {
  if (!rangeHeader?.startsWith("bytes=")) {
    return null;
  }

  const [startPart, endPart] = rangeHeader.replace("bytes=", "").split("-");
  const start = Number.parseInt(startPart ?? "", 10);
  const end = endPart ? Number.parseInt(endPart, 10) : fileSize - 1;

  if (Number.isNaN(start) || Number.isNaN(end) || start < 0 || end < start || start >= fileSize) {
    return null;
  }

  return {
    end: Math.min(end, fileSize - 1),
    start,
  };
}

function resolveLocalMediaPath(storageKey: string) {
  const normalizedKey = normalizeStorageKey(storageKey);

  if (!normalizedKey.startsWith("/")) {
    throw new Error("Chave local de midia invalida.");
  }

  const publicDirectory = path.resolve(process.cwd(), "public");
  const resolvedPath = path.resolve(publicDirectory, normalizedKey.replace(/^\/+/, ""));

  if (!resolvedPath.startsWith(publicDirectory)) {
    throw new Error("Caminho local de midia invalido.");
  }

  return resolvedPath;
}

async function getLocalMediaResponse(storageKey: string, rangeHeader: string | null): Promise<MediaResponsePayload> {
  const filePath = resolveLocalMediaPath(storageKey);
  const fileStats = await stat(filePath);
  const range = parseRangeHeader(rangeHeader, fileStats.size);
  const stream = createReadStream(
    filePath,
    range
      ? {
          end: range.end,
          start: range.start,
        }
      : undefined,
  );

  return {
    body: Readable.toWeb(stream) as ReadableStream<Uint8Array>,
    contentLength: range ? range.end - range.start + 1 : fileStats.size,
    contentRange: range ? `bytes ${range.start}-${range.end}/${fileStats.size}` : undefined,
    contentType: getMimeTypeFromFileName(filePath),
    etag: `W/"${fileStats.size}-${fileStats.mtimeMs}"`,
    lastModified: fileStats.mtime.toUTCString(),
    status: range ? 206 : 200,
  };
}

async function getRemoteMediaResponse(storageKey: string, rangeHeader: string | null): Promise<MediaResponsePayload> {
  ensureStorageConfigured();

  const client = getS3Client();
  const response = await client.send(
    new GetObjectCommand({
      Bucket: getStorageBucket(),
      Key: storageKey,
      Range: rangeHeader ?? undefined,
    }),
  );

  if (!response.Body) {
    throw new Error("Midia nao encontrada no bucket.");
  }

  return {
    body: response.Body.transformToWebStream(),
    contentLength: response.ContentLength ? Number(response.ContentLength) : undefined,
    contentRange: response.ContentRange ?? undefined,
    contentType: response.ContentType ?? getMimeTypeFromFileName(storageKey),
    etag: response.ETag ?? undefined,
    lastModified: response.LastModified?.toUTCString(),
    status: response.ContentRange ? 206 : 200,
  };
}

async function getMediaResponse(storageKey: string, rangeHeader: string | null): Promise<MediaResponsePayload> {
  const normalizedKey = normalizeStorageKey(storageKey);

  if (!normalizedKey || /^https?:\/\//.test(normalizedKey)) {
    throw new Error("Chave de midia invalida.");
  }

  return isLocalStorageKey(normalizedKey)
    ? getLocalMediaResponse(normalizedKey, rangeHeader)
    : getRemoteMediaResponse(normalizedKey, rangeHeader);
}

function getMediaCacheHeaders() {
  return {
    "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=86400, immutable",
  };
}

async function uploadAnimalMedia({ animalId, file }: { animalId: string; file: File }) {
  ensureStorageConfigured();

  const bucket = getStorageBucket();
  const fileName = sanitizeFileName(file.name || "arquivo");
  const storageKey = `animals/${animalId}/${Date.now()}-${crypto.randomUUID()}-${fileName}`;
  const contentType = file.type || "application/octet-stream";
  const body = Buffer.from(await file.arrayBuffer());
  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Body: body,
      Bucket: bucket,
      ContentType: contentType,
      Key: storageKey,
    }),
  );

  return {
    bucket,
    contentType,
    fileName: file.name || fileName,
    kind: getMediaKindFromMimeType(contentType),
    storageKey,
  };
}

async function deleteStorageObject(storageKey: string) {
  const normalizedKey = normalizeStorageKey(storageKey);

  if (!normalizedKey || /^https?:\/\//.test(normalizedKey) || normalizedKey.startsWith("/")) {
    return;
  }

  ensureStorageConfigured();

  const client = getS3Client();
  await client.send(
    new DeleteObjectCommand({
      Bucket: getStorageBucket(),
      Key: normalizedKey,
    }),
  );
}

async function deleteStorageObjects(storageKeys: string[]) {
  const keys = [
    ...new Set(
      storageKeys
        .map(normalizeStorageKey)
        .filter(key => key && !/^https?:\/\//.test(key) && !key.startsWith("/")),
    ),
  ];

  if (!keys.length) {
    return;
  }

  ensureStorageConfigured();

  const client = getS3Client();

  await client.send(
    new DeleteObjectsCommand({
      Bucket: getStorageBucket(),
      Delete: {
        Objects: keys.map(Key => ({ Key })),
      },
    }),
  );
}

export {
  deleteStorageObject,
  deleteStorageObjects,
  getMediaCacheHeaders,
  getMediaKindFromMimeType,
  getMediaResponse,
  getPublicMediaUrl,
  getStorageBucket,
  uploadAnimalMedia,
};
