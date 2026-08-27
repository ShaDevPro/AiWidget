/**
 * attachAdvancedTab — Event handlers for the advanced settings tab.
 */
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachAdvancedTab(host: SettingsHost, panel: HTMLElement): void {
  const testConnAction = async () => {
    const urlInput = panel.querySelector('#ollamaUrl') as HTMLInputElement;
    if (urlInput) {
      host.settings.ollama_base_url = urlInput.value.trim();
    }
    await host.refreshConnection();
    await host.refreshModels();
    host.render();
    host.toggleSettings(true);
    if (host.isConnected) {
      host.toast(t('settings.connected'), 'success');
    } else {
      host.toast(t('settings.notConnected'), 'error');
    }
  };

  panel.querySelector('#testConnBtn')?.addEventListener('click', () => void testConnAction());

  const tempSlider = panel.querySelector('#tempSlider') as HTMLInputElement;
  const tempValue = panel.querySelector('#tempValue') as HTMLElement;
  tempSlider?.addEventListener('input', (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    host.settings.temperature = val;
    if (tempValue) tempValue.textContent = val.toFixed(2);
  });

  const tokenSlider = panel.querySelector('#tokenSlider') as HTMLInputElement;
  const tokenValue = panel.querySelector('#tokenValue') as HTMLElement;
  tokenSlider?.addEventListener('input', (e) => {
    const val = parseInt((e.target as HTMLInputElement).value);
    host.settings.max_tokens = val;
    if (tokenValue) tokenValue.textContent = val.toString();
  });

  panel.querySelector('#resetWebAuthBtn')?.addEventListener('click', () => {
    localStorage.removeItem('aiwidget_web_privacy_accepted');
    host.toast('Consentement de recherche Web réinitialisé !', 'success');
  });
}
