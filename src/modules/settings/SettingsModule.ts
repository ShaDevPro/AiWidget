/**
 * SettingsModule — Settings load/save and tab state.
 * Isolated from voice, chat, and sidebar concerns.
 */
import { api } from '../../api';
import { changeLanguage } from '../../i18n';
import type { AppSettings } from '../../types';

export class SettingsModule {
  open = false;
  tab = 'general';

  // Callbacks
  onSettingsChange?: (settings: AppSettings) => void;
  onLanguageChange?: (lang: string) => void;
  onRender?: () => void;

  toggle(isOpen: boolean): void {
    this.open = isOpen;
    this.onRender?.();
  }

  setTab(tab: string): void {
    this.tab = tab;
    this.onRender?.();
  }

  async save(settings: AppSettings): Promise<void> {
    await api.saveSettings(settings);
    this.onSettingsChange?.(settings);
  }

  async setLanguage(lang: string, currentSettings: AppSettings): Promise<AppSettings> {
    const updated = { ...currentSettings, language: lang };
    changeLanguage(lang);
    await api.saveSettings(updated);
    this.onLanguageChange?.(lang);
    return updated;
  }
}
