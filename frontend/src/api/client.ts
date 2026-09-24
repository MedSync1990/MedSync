/**
 * MedSync — Centralized API Client
 *
 * This is the "Post Office" (or "Waiter") that every frontend page uses
 * to talk to the backend.  It handles:
 *
 *  1. Base URL configuration
 *  2. Automatic CSRF-token attachment on POST / PUT / PATCH / DELETE
 *  3. Cookie-based JWT authentication (credentials: 'include')
 *  4. Typed error handling
 *
 * No page should call `fetch()` directly — always go through this client.
 */

// ─── Configuration ─────────────────────────────────────────────────────────
const rawBase = (import.meta as any).env?.VITE_API_BASE_URL ?? 'http://localhost:8000/api/v1';
const cleanedBase = rawBase.replace(/\/+$/, '');
const API_BASE_URL: string = cleanedBase.endsWith('/api/v1') ? cleanedBase : `${cleanedBase}/api/v1`;

// ─── Error type ─────────────────────────────────────────────────────────────
export interface ApiErrorBody {
  message?: string;
  errors?: Array<{ field: string; message: string }>;
}

export class ApiError extends Error {
  status: number;
  body: ApiErrorBody;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message ?? `Request failed with status ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.body = body;
  }

  /** True when the JWT has expired or is missing → redirect to login */
  get isUnauthorized(): boolean {
    return this.status === 401;
  }

  /** True when the user's role doesn't have access */
  get isForbidden(): boolean {
    return this.status === 403;
  }

  /** True for field-level validation errors (422) */
  get isValidation(): boolean {
    return this.status === 422;
  }

  /** True for state conflicts (double-booked slot, etc.) */
  get isConflict(): boolean {
    return this.status === 409;
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Read a named cookie value.  The backend sets `csrf_token` as a
 * non-httpOnly cookie so the frontend can read it and echo it back
 * via the X-CSRF-Token header.
 */
function getCookie(name: string): string | undefined {
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

/**
 * Turn a `Record<string, string | number | boolean | undefined | null>`
 * into a URL search-param string (skipping undefined / null values).
 */
function toQueryString(
  params?: Record<string, string | number | boolean | undefined | null>,
): string {
  if (!params) return '';
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== null,
  );
  if (entries.length === 0) return '';
  const sp = new URLSearchParams();
  entries.forEach(([k, v]) => sp.set(k, String(v)));
  return `?${sp.toString()}`;
}

// ─── Core request function ──────────────────────────────────────────────────

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  const url = `${API_BASE_URL}${path}${toQueryString(params)}`;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };

  // Attach body as JSON for mutating requests
  if (body !== undefined) {
    headers['Content-Type'] = 'application/json';
  }

  // Attach CSRF token on mutating methods (POST, PUT, PATCH, DELETE)
  const mutating = ['POST', 'PUT', 'PATCH', 'DELETE'];
  if (mutating.includes(method.toUpperCase())) {
    const csrf = getCookie('csrf_token');
    if (csrf) {
      headers['X-CSRF-Token'] = csrf;
    }
  }

  const response = await fetch(url, {
    method: method.toUpperCase(),
    headers,
    credentials: 'include', // sends httpOnly JWT cookie automatically
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Successful response — parse JSON (or return empty object for 204)
  if (response.ok) {
    if (response.status === 204) return {} as T;
    return (await response.json()) as T;
  }

  // Error response — parse body and throw typed ApiError
  let errorBody: ApiErrorBody;
  try {
    errorBody = await response.json();
  } catch {
    errorBody = { message: response.statusText || 'Unknown error' };
  }

  // Normalise FastAPI's `{detail: "..."}` into our `{message: "..."}`
  if ((errorBody as any).detail && !errorBody.message) {
    errorBody.message = (errorBody as any).detail;
  }

  throw new ApiError(response.status, errorBody);
}

// ─── Public convenience methods ─────────────────────────────────────────────

/** GET request — pass query params as the second argument */
export function get<T>(
  path: string,
  params?: Record<string, string | number | boolean | undefined | null>,
): Promise<T> {
  return request<T>('GET', path, undefined, params);
}

/** POST request — pass body as the second argument */
export function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

/** PUT request — pass body as the second argument */
export function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

/** PATCH request — pass body as the second argument */
export function patch<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PATCH', path, body);
}

/** DELETE request */
export function del<T>(path: string): Promise<T> {
  return request<T>('DELETE', path);
}
