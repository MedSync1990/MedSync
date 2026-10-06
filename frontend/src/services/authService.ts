import { get, post } from './api';
import type { LoginRequest, LoginResponse, MeResponse } from '../types';

export const authService = {
  login: (data: LoginRequest) => post<LoginResponse>('/auth/login', data),
  logout: () => post<{ message: string }>('/auth/logout'),
  getMe: () => get<MeResponse>('/auth/me'),
};
