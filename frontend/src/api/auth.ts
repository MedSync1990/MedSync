/**
 * MedSync — Auth API endpoints
 *
 * Covers: POST /auth/login, POST /auth/logout, GET /auth/me
 * Owner: Dilantha
 */

import { post, get } from './client';
import type { LoginRequest, LoginResponse, MeResponse } from './types';

/** Log in with username + password. Sets httpOnly JWT cookie on success. */
export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/auth/login', credentials);
}

/** Log out — clears the JWT and CSRF cookies server-side. */
export function logout(): Promise<{ message: string }> {
  return post<{ message: string }>('/auth/logout');
}

/** Get the currently authenticated user's profile (from the JWT). */
export function getMe(): Promise<MeResponse> {
  return get<MeResponse>('/auth/me');
}
