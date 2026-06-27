const BASE_URL = import.meta.env.VITE_API_URL || "";

interface FetchOptions extends RequestInit {
  json?: unknown;
}

async function request<T>(path: string, opts: FetchOptions = {}): Promise<T> {
  const { json, ...rest } = opts;
  const headers: Record<string, string> = {
    ...(rest.headers as Record<string, string>),
  };
  if (json !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    ...rest,
    headers,
    credentials: "include",
    body: json !== undefined ? JSON.stringify(json) : rest.body,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw Object.assign(new Error(err.error || "Request gagal"), { status: res.status, data: err });
  }

  // 204 No Content
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export const api = {
  get: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, json?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "POST", json }),
  put: <T>(path: string, json?: unknown, opts?: FetchOptions) => request<T>(path, { ...opts, method: "PUT", json }),
  delete: <T>(path: string, opts?: FetchOptions) => request<T>(path, { ...opts, method: "DELETE" }),
};
