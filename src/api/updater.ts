import { call, listen, type UnlistenFn } from './_core';

export interface VersionCheckResponse {
  update_available: boolean;
  is_mandatory: boolean;
  current_version: string;
  latest_version: string;
  min_required_version: string;
  title: string;
  changelog: string;
  download_url: string;
}

export interface AppUpdateProgress {
  status: 'downloading' | 'installing' | 'error';
  percentage: number;
  downloaded?: number;
  total?: number;
  message: string;
}

export const updaterApi = {
  checkAppVersion: (): Promise<VersionCheckResponse> => call<VersionCheckResponse>('check_app_version'),
  installAppUpdate: (downloadUrl: string): Promise<void> => call<void>('install_app_update', { downloadUrl }),
  onUpdateProgress: (cb: (progress: AppUpdateProgress) => void): Promise<UnlistenFn> =>
    listen<AppUpdateProgress>('app-update-progress', (e) => {
      if (e.payload) cb(e.payload);
    }),
};
