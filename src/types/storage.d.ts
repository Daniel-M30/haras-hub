type MediaResponsePayload = {
  body: BodyInit | ReadableStream<Uint8Array>;
  contentLength?: number;
  contentRange?: string;
  contentType: string;
  etag?: string;
  lastModified?: string;
  status: number;
};

type AnimalMediaUploadSessionPayload = {
  contentType: string;
  fileName: string;
  kind: "image" | "video";
  sessionId: string;
  storageKey: string;
  totalChunks: number;
};

type RegisteredAnimalMediaUploadInput = {
  contentType: string;
  fileName: string;
  sessionId: string;
  storageKey: string;
  totalChunks: number;
};

type AnimalMediaUploadChunkInput = {
  chunkIndex: number;
  sessionId: string;
  storageKey: string;
};

export type {
  AnimalMediaUploadChunkInput,
  AnimalMediaUploadSessionPayload,
  MediaResponsePayload,
  RegisteredAnimalMediaUploadInput,
};
