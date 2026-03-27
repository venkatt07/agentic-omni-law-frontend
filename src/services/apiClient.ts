import { useAppStore } from "@/store";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL as string | undefined) || "http://127.0.0.1:5000/api";

type RequestOptions = RequestInit & {
  skipAuth?: boolean;
  timeoutMs?: number;
};

type DownloadOptions = {
  skipAuth?: boolean;
  filename?: string;
  openInNewTab?: boolean;
  headers?: HeadersInit;
};

function resolveUrl(pathOrUrl: string) {
  return /^https?:\/\//i.test(pathOrUrl) ? pathOrUrl : `${API_BASE_URL}${pathOrUrl}`;
}

function mapRequestError(error: unknown, url: string) {
  const message = error instanceof Error ? error.message : String(error || "Unknown request error");
  if (/aborted|timeout/i.test(message)) {
    return new Error("The backend request took too long. Please retry once the current analysis finishes syncing.");
  }
  if (/failed to fetch|networkerror|load failed/i.test(message)) {
    const endpoint = (() => {
      try {
        const parsed = new URL(url);
        return `${parsed.protocol}//${parsed.host}`;
      } catch {
        return "the backend service";
      }
    })();
    return new Error(`Cannot reach the backend service (${endpoint}). Confirm the backend server is running and try again.`);
  }
  return error instanceof Error ? error : new Error(message);
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const token = useAppStore.getState().authToken;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (!options.skipAuth && token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const url = resolveUrl(path);
  let response: Response;
  const controller = new AbortController();
  const timeoutMs = Math.max(5_000, Number(options.timeoutMs || (options.body instanceof FormData ? 60_000 : 20_000)));
  const timeout = window.setTimeout(() => controller.abort(new Error(`Request timeout after ${timeoutMs}ms`)), timeoutMs);
  try {
    response = await fetch(url, {
      ...options,
      headers,
      signal: options.signal || controller.signal,
    });
  } catch (error) {
    throw mapRequestError(error, url);
  } finally {
    window.clearTimeout(timeout);
  }

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const payload = await response.json();
      message = payload?.message || message;
    } catch {}
    throw new Error(message);
  }

  if (response.status === 204) return undefined as T;
  return response.json() as Promise<T>;
}

export const apiClient = {
  baseUrl: API_BASE_URL,
  get: <T>(path: string, options?: RequestOptions) => request<T>(path, { ...options, method: "GET" }),
  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "POST",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>(path, {
      ...options,
      method: "PATCH",
      body: body instanceof FormData ? body : body === undefined ? undefined : JSON.stringify(body),
    }),
  download: async (pathOrUrl: string, options: DownloadOptions = {}) => {
    const token = useAppStore.getState().authToken;
    const headers = new Headers(options.headers || {});
    if (!options.skipAuth && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const requestUrl = resolveUrl(pathOrUrl);
    let response: Response;
    try {
      response = await fetch(requestUrl, { method: "GET", headers });
    } catch (error) {
      throw mapRequestError(error, requestUrl);
    }
    if (!response.ok) {
      let message = `Download failed (${response.status})`;
      try {
        const payload = await response.json();
        message = payload?.message || message;
      } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    const blobUrl = URL.createObjectURL(blob);
    if (options.openInNewTab) {
      window.open(blobUrl, "_blank", "noopener,noreferrer");
      window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
      return;
    }
    const link = document.createElement("a");
    link.href = blobUrl;
    link.download = options.filename || "download";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(() => URL.revokeObjectURL(blobUrl), 30_000);
  },
  getBlobUrl: async (pathOrUrl: string, options: DownloadOptions = {}) => {
    const token = useAppStore.getState().authToken;
    const headers = new Headers(options.headers || {});
    if (!options.skipAuth && token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    const requestUrl = resolveUrl(pathOrUrl);
    let response: Response;
    try {
      response = await fetch(requestUrl, { method: "GET", headers });
    } catch (error) {
      throw mapRequestError(error, requestUrl);
    }
    if (!response.ok) {
      let message = `Request failed (${response.status})`;
      try {
        const payload = await response.json();
        message = payload?.message || message;
      } catch {}
      throw new Error(message);
    }
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  },
  revokeBlobUrl: (url?: string | null) => {
    if (!url) return;
    try {
      URL.revokeObjectURL(url);
    } catch {
      // ignore
    }
  },
};
