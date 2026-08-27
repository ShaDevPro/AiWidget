import { invoke } from '@tauri-apps/api/tauri';
import type { AppSettings } from '../types';

export const settingsApi = {
  getSettings: (): Promise<AppSettings> =>
    invoke<AppSettings>('get_settings'),

  saveSettings: (settings: AppSettings): Promise<void> =>
    invoke<void>('save_settings', { settings }),

  getAutostartStatus: (): Promise<boolean> =>
    invoke<boolean>('get_autostart_status'),

  setAutostartStatus: (enabled: boolean): Promise<boolean> =>
    invoke<boolean>('set_autostart_status', { enabled }),
};
