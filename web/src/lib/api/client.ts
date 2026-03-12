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

export async function api<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  const url = `${env.API_BASE_URL}${path}`;
  const timeoutMs = options.timeoutMs ?? 8000;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const token = options.auth === false ? null : await getAccessToken();

    const res = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers ?? {}),
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    });

    const text = await res.text();
    const data = text ? safeJsonParse(text) : undefined;

    if (!res.ok) throw new ApiError("Request failed", res.status, data);
    return data as T;
  } catch (err: any) {
    if (err?.name === "AbortError")
      throw new ApiError("Request timed out", 408);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
