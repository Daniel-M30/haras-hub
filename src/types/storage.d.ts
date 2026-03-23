type MediaResponsePayload = {
  body: BodyInit | ReadableStream<Uint8Array>;
  contentLength?: number;
  contentRange?: string;
  contentType: string;
  etag?: string;
  lastModified?: string;
  status: number;
};

export type { MediaResponsePayload };
