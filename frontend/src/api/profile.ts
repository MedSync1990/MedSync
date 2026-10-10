import { get, put, post } from './client';
import type { UserProfileData, ProfileUpdatePayload, ChangePasswordPayload } from './types';

/** Get the currently authenticated user's profile details */
export async function getMyProfile(): Promise<UserProfileData> {
  return get<UserProfileData>('/profile/me');
}

/** Update the profile details of the current user */
export async function updateMyProfile(data: ProfileUpdatePayload): Promise<UserProfileData> {
  return put<UserProfileData>('/profile/me', data);
}

/** Change the current user's password */
export async function changePassword(data: ChangePasswordPayload): Promise<{ message: string }> {
  return post<{ message: string }>('/profile/change-password', data);
}