/**
 * attachLicenseTab — Event handlers for the license settings tab.
 */
import { api } from '../../../api';
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachLicenseTab(host: SettingsHost, panel: HTMLElement): void {
  panel.querySelector('#spCopyHwidTabBtn')?.addEventListener('click', async () => {
    if (host.licenseModule.licenseStatus?.hwid) {
      await navigator.clipboard.writeText(host.licenseModule.licenseStatus.hwid);
      host.toast('✓ ' + t('license.copied'), 'success');
    }
  });

  panel.querySelector('#spDirectActivateBtn')?.addEventListener('click', async () => {
    const input = panel.querySelector('#spDirectKeyInput') as HTMLInputElement;
    const key = input?.value.trim();
    if (!key) {
      host.toast('Veuillez saisir une clé de licence', 'warning');
      return;
    }
    const btn = panel.querySelector('#spDirectActivateBtn') as HTMLButtonElement;
    if (btn) btn.disabled = true;
    try {
      const updated = await api.activateLicenseKey(key);
      host.licenseModule.licenseStatus = updated;
      host.render();
      host.toggleSettings(true);
      host.toast('🎉 ' + t('license.activatedSuccess'), 'success');
    } catch (err) {
      host.toast((err as Error).message || String(err), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  });
}
