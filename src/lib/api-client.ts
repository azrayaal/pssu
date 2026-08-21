import type { QueryParams } from '@/types';
import { ApiError } from './api-error';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

export interface ApiRequest {
  method: HttpMethod;
  path: string;
  params?: QueryParams;
  body?: unknown;
  signal?: AbortSignal;
}

export interface Transport {
  readonly name: string;
  request<T>(request: ApiRequest): Promise<T>;
}

export interface RequestOptions {
  params?: QueryParams;
  signal?: AbortSignal;
}

export function buildQueryString(params?: QueryParams): string {
  if (!params) return '';
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === '') continue;
    if (Array.isArray(value)) {
      value.forEach((entry) => search.append(key, entry));
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

/**
 * HTTP transport. Activated by setting VITE_API_MODE=rest.
 * Every service module already speaks this interface, so swapping the
 * transport is the only change required to move onto a real backend.
 */
export function createHttpTransport(baseUrl: string, getAuthToken?: () => string | null): Transport {
  return {
    name: 'http',
    async request<T>({ method, path, params, body, signal }: ApiRequest): Promise<T> {
      const token = getAuthToken?.();
      const response = await fetch(`${baseUrl}${path}${buildQueryString(params)}`, {
        method,
        signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          message?: string;
          code?: string;
          errors?: Record<string, string[]>;
        } | null;
        throw new ApiError(
          response.status,
          payload?.message ?? response.statusText,
          payload?.code,
          payload?.errors,
        );
      }

      if (response.status === 204) return undefined as T;
      return (await response.json()) as T;
    },
  };
}

let activeTransport: Transport | null = null;

export function setTransport(transport: Transport): void {
  activeTransport = transport;
}

export function getTransport(): Transport {
  if (!activeTransport) {
    throw new Error('API transport has not been configured. Call setTransport() during bootstrap.');
  }
  return activeTransport;
}

export const apiClient = {
  get<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return getTransport().request<T>({ method: 'GET', path, ...options });
  },
  post<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return getTransport().request<T>({ method: 'POST', path, body, ...options });
  },
  put<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return getTransport().request<T>({ method: 'PUT', path, body, ...options });
  },
  patch<T>(path: string, body?: unknown, options: RequestOptions = {}): Promise<T> {
    return getTransport().request<T>({ method: 'PATCH', path, body, ...options });
  },
  delete<T>(path: string, options: RequestOptions = {}): Promise<T> {
    return getTransport().request<T>({ method: 'DELETE', path, ...options });
  },
};
