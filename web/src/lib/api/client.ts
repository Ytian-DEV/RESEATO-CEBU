import { env } from "../config/env";
import { supabase } from "../supabase";

type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type RequestOptions = {
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  auth?: boolean; // default true: attach token if available
};

export class ApiError extends Error {
  status: number;
  payload?: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
  }
}

async function getAccessToken(): Promise<string | null> {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? null;
}

function safeJsonParse(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text; // if server returns plain text/html, keep it as-is
  }
}

function normalizeBaseUrl(value: string) {
  return String(value ?? "").trim().replace(/\/+$/, "");
}

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

function buildCandidateUrls(path: string) {
  const baseUrl = normalizeBaseUrl(env.API_BASE_URL);
  const normalizedPath = normalizePath(path);
  const baseWithoutApi = baseUrl.replace(/\/api$/i, "");
  const baseWithApi = /\/api$/i.test(baseUrl) ? baseUrl : `${baseWithoutApi}/api`;
  const pathWithoutApi = normalizedPath.replace(/^\/api(?=\/|$)/i, "") || "/";
  const pathWithApi = /^\/api(\/|$)/i.test(normalizedPath)
    ? normalizedPath
    : `/api${normalizedPath}`;

  const candidates = [
    `${baseUrl}${normalizedPath}`,
    `${baseWithApi}${pathWithoutApi}`,
    `${baseWithoutApi}${pathWithApi}`,
    `${baseWithoutApi}${pathWithoutApi}`,
  ];

  return Array.from(new Set(candidates));
}

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const timeoutMs = options.timeoutMs ?? 8000;
  const method = options.method ?? "GET";
  const body = options.body ? JSON.stringify(options.body) : undefined;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = options.auth === false ? null : await getAccessToken();
    const headers = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers ?? {}),
    };

    const candidateUrls = buildCandidateUrls(path);

    for (let index = 0; index < candidateUrls.length; index += 1) {
      const url = candidateUrls[index];

      const res = await fetch(url, {
        method,
        headers,
        body,
        signal: controller.signal,
      });

      const text = await res.text();
      const data = text ? safeJsonParse(text) : undefined;

      if (res.ok) {
        return data as T;
      }

      const isLastCandidate = index === candidateUrls.length - 1;
      const shouldTryNextCandidate = !isLastCandidate && res.status === 404;

      if (!shouldTryNextCandidate) {
        throw new ApiError("Request failed", res.status, data);
      }
    }

    throw new ApiError("Request failed", 404);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}


