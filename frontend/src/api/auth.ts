/**
 * MedSync — Auth API endpoints
 *
 * Covers: POST /auth/login, POST /auth/logout, GET /auth/me
 * Owner: Dilantha
 */

import { post, get, setSessionCsrfToken } from './client';
import type { LoginRequest, LoginResponse, MeResponse } from './types';

/** Log in with username + password. Sets httpOnly JWT cookie on success. */
export async function login(credentials: LoginRequest): Promise<LoginResponse> {
  const response = await post<LoginResponse>('/auth/login', credentials);
  setSessionCsrfToken(response.csrf_token);
  return response;
}

/** Log out — clears the JWT and CSRF cookies server-side. */
export async function logout(): Promise<{ message: string }> {
  const response = await post<{ message: string }>('/auth/logout');
  setSessionCsrfToken(null);
  return response;
}

/** Get the currently authenticated user's profile (from the JWT). */
export async function getMe(): Promise<MeResponse> {
  const response = await get<MeResponse>('/auth/me');
  setSessionCsrfToken(response.csrf_token ?? null);
  return response;
}
