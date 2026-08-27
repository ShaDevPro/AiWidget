import { call } from './_core';

export interface ProfilePublic {
  id: string;
  username: string;
  role: string;
  avatar_path?: string | null;
  avatar_color: string;
  created_at: string;
  has_avatar: boolean;
  is_banned: boolean;
}

export const profileApi = {
  isFirstLaunch: (): Promise<boolean> => call<boolean>('is_first_launch'),
  listProfiles: (): Promise<ProfilePublic[]> => call<ProfilePublic[]>('list_profiles'),
  getActiveProfile: (): Promise<ProfilePublic | null> => call<ProfilePublic | null>('get_active_profile'),
  login: (credentials: { username: string; password_plain: string }): Promise<ProfilePublic> =>
    call<ProfilePublic>('login', credentials),
  logout: (): Promise<void> => call<void>('logout'),
};
