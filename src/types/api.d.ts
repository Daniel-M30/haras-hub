type ApiResponse<TData> = {
  data: TData | null;
  error: string | null;
};

type RequestBody = BodyInit | FormData | Record<string, unknown> | undefined;

export type { ApiResponse, RequestBody };
