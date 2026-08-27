/**
 * attachCommonTab — Shared settings panel events (nav, theme, save, language).
 */
import { changeLanguage } from '../../../i18n';
import { api } from '../../../api';
import type { SettingsHost } from '../SettingsHost';

export function attachCommonTab(host: SettingsHost, panel: HTMLElement): void {
    panel.querySelectorAll('[data-settings-tab]').forEach(item => {
    item.addEventListener('click', () => {
      host.settingsTab = (item as HTMLElement).getAttribute('data-settings-tab') || 'general';
      if (host.settingsTab === 'models') {
        void host.modelsModule.refreshPartialDownloads().then(() => {
          host.render();
          host.toggleSettings(true);
        });
        return;
      }
      host.render();
      host.toggleSettings(true);
    });
  });

  panel.querySelectorAll('[data-set-theme]').forEach(card => {
    card.addEventListener('click', () => {
      host.settings.theme = (card as HTMLElement).getAttribute('data-set-theme')!;
      host.applyTheme(host.settings.theme);
      panel.querySelectorAll('[data-set-theme]').forEach(c => c.classList.remove('active'));
      card.classList.add('active');
    });
  });

  panel.querySelector('#closeSettingsBtn')?.addEventListener('click', () => host.toggleSettings(false));
  panel.querySelector('#saveSettingsBtn')?.addEventListener('click', () => void host.saveSettings());
  panel.querySelector('#resetSettingsBtn')?.addEventListener('click', () => host.toggleSettings(false));

  const langSel = panel.querySelector('#langSelect') as HTMLSelectElement;
  langSel?.addEventListener('change', (e) => {
    host.settings.language = (e.target as HTMLSelectElement).value;
    changeLanguage(host.settings.language);
    host.render();
    host.toggleSettings(true);
  });

  const themeSel = panel.querySelector('#themeSelect') as HTMLSelectElement;
  themeSel?.addEventListener('change', (e) => {
    host.settings.theme = (e.target as HTMLSelectElement).value;
    host.applyTheme(host.settings.theme);
  });

  const autostartCheck = panel.querySelector('#autostartToggle') as HTMLInputElement;
  autostartCheck?.addEventListener('change', async (e) => {
    const checked = (e.target as HTMLInputElement).checked;
    try {
      host.isAutostartEnabled = await api.setAutostartStatus(checked);
      host.toast(checked ? 'Démarrage avec Windows activé' : 'Démarrage avec Windows désactivé', 'info');
    } catch (err) {
      host.toast(String(err), 'error');
    }
  });

  panel.querySelector('#reopenOnboardingBtn')?.addEventListener('click', () => {
    host.toggleSettings(false);
    host.showOnboarding();
  });
}
