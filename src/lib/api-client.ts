import type { ApiResponse, RequestBody } from "@/src/types";

function isNativeBody(value: RequestBody): value is BodyInit | FormData {
  return (
    value instanceof FormData ||
    typeof value === "string" ||
    value instanceof Blob ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value) ||
    value instanceof URLSearchParams ||
    value instanceof ReadableStream
  );
}

function buildRequestInit(method: string, body?: RequestBody, init?: RequestInit) {
  if (body === undefined) {
    return {
      ...init,
      method,
    };
  }

  if (isNativeBody(body)) {
    return {
      ...init,
      body,
      method,
    };
  }

  return {
    ...init,
    body: JSON.stringify(body),
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    method,
  };
}

async function request<TData>(input: string, method: string, body?: RequestBody, init?: RequestInit): Promise<ApiResponse<TData>> {
  try {
    const response = await fetch(input, buildRequestInit(method, body, init));
    const contentType = response.headers.get("content-type") ?? "";
    const result = contentType.includes("application/json") ? ((await response.json().catch(() => null)) as { error?: string } | TData | null) : null;

    if (!response.ok) {
      return {
        data: null,
        error:
          result && typeof result === "object" && "error" in result && typeof result.error === "string"
            ? result.error
            : "Nao foi possivel concluir a requisicao.",
      };
    }

    return {
      data: result as TData | null,
      error: null,
    };
  } catch {
    return {
      data: null,
      error: "Nao foi possivel concluir a requisicao.",
    };
  }
}

export function apiGet<TData>(input: string, init?: RequestInit) {
  return request<TData>(input, "GET", undefined, init);
}

export function apiPost<TData>(input: string, body?: RequestBody, init?: RequestInit) {
  return request<TData>(input, "POST", body, init);
}

export function apiPatch<TData>(input: string, body?: RequestBody, init?: RequestInit) {
  return request<TData>(input, "PATCH", body, init);
}

export function apiDelete<TData>(input: string, init?: RequestInit) {
  return request<TData>(input, "DELETE", undefined, init);
}
