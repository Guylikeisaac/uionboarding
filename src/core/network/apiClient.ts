import axios, {
  AxiosError,
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

import { ApiConstants } from '../constants/apiConstants';
import { demoAdapter } from '../demo/demoServer';
import { kDemoMode } from '../demo/demoMode';

export type ApiResponse<T = any> = AxiosResponse<T>;

export interface RequestOptions {
  data?: unknown;
  params?: Record<string, unknown>;
  headers?: Record<string, string>;
  /** Abort support for superseded searches. */
  signal?: AbortSignal;
  /** Override the default timeouts (ms). */
  timeout?: number;
  /** Arbitrary per-request flags (e.g. the auth retry marker). */
  extra?: Record<string, unknown>;
}

/**
 * Thin wrapper over axios mirroring the Flutter `ApiClient` (Dio) surface:
 * `get/post/put/patch/delete` returning the raw response, throwing on
 * non-2xx exactly like Dio did.
 */
export class ApiClient {
  readonly axios: AxiosInstance;

  constructor(instance?: AxiosInstance, baseURL?: string) {
    this.axios =
      instance ??
      axios.create({
        baseURL: baseURL ?? ApiConstants.baseUrl,
        timeout: 30_000,
      });
    if (!this.axios.defaults.baseURL) this.axios.defaults.baseURL = baseURL ?? ApiConstants.baseUrl;
    if (!this.axios.defaults.timeout) this.axios.defaults.timeout = 30_000;
    // Demo mode: every request is answered by the in-app fake backend.
    if (kDemoMode) this.axios.defaults.adapter = demoAdapter;

    if (__DEV__) {
      // DEBUG ONLY — responses carry tokens; never log in release builds.
      this.axios.interceptors.response.use(
        (res) => {
          console.log(`⬅️ ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`);
          return res;
        },
        (err: AxiosError) => {
          console.log(
            `⬅️ ${err.response?.status ?? 'ERR'} ${err.config?.method?.toUpperCase()} ${err.config?.url}`,
          );
          return Promise.reject(err);
        },
      );
    }
  }

  private config(o?: RequestOptions): AxiosRequestConfig {
    return {
      params: o?.params,
      headers: o?.headers,
      signal: o?.signal,
      timeout: o?.timeout,
      // Carried through to interceptors.
      ...(o?.extra ? { extra: o.extra } : {}),
    } as AxiosRequestConfig;
  }

  get<T = any>(url: string, o?: RequestOptions): Promise<ApiResponse<T>> {
    return this.axios.get<T>(url, this.config(o));
  }

  post<T = any>(url: string, o?: RequestOptions): Promise<ApiResponse<T>> {
    return this.axios.post<T>(url, o?.data, this.config(o));
  }

  put<T = any>(url: string, o?: RequestOptions): Promise<ApiResponse<T>> {
    return this.axios.put<T>(url, o?.data, this.config(o));
  }

  patch<T = any>(url: string, o?: RequestOptions): Promise<ApiResponse<T>> {
    return this.axios.patch<T>(url, o?.data, this.config(o));
  }

  delete<T = any>(url: string, o?: RequestOptions): Promise<ApiResponse<T>> {
    return this.axios.delete<T>(url, { ...this.config(o), data: o?.data });
  }
}

// ── Error helpers (DioException equivalents) ──────────────────────────────────

export function isHttpError(e: unknown): e is AxiosError<any> {
  return axios.isAxiosError(e);
}

/** HTTP status of a failed request, or undefined for transport errors. */
export function statusOf(e: unknown): number | undefined {
  return isHttpError(e) ? e.response?.status : undefined;
}

/** Parsed response body of a failed request. */
export function errorBody(e: unknown): any {
  return isHttpError(e) ? e.response?.data : undefined;
}

/** `message` from a JSON error body, or the body itself when it is a string. */
export function serverMessage(e: unknown): string | undefined {
  const data = errorBody(e);
  if (data && typeof data === 'object') {
    const m = (data as any).message;
    if (Array.isArray(m)) return m.filter(Boolean).join('\n') || undefined;
    return m != null ? String(m) : undefined;
  }
  if (typeof data === 'string' && data.trim()) return data;
  return undefined;
}

/** True for connectivity problems (no response at all, or a timeout). */
export function isNetworkError(e: unknown): boolean {
  return isHttpError(e) && !e.response;
}

export function isCancel(e: unknown): boolean {
  return axios.isCancel(e) || (e instanceof Error && e.name === 'CanceledError');
}

/** Unauthenticated client (Flutter's bare `ApiClient()`). */
export const plainApiClient = new ApiClient();
