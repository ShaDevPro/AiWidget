import { setTransport, HttpSseTransport, TauriIpcTransport } from '../../../api/_core';
import { updateManager } from '../../updater';
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachGeneralTab(host: SettingsHost, panel: HTMLElement): void {
  panel.querySelector('#spOpenLicenseBtn')?.addEventListener('click', () => {
    host.promptLicense(host.settings.execution_mode === 'pro' ? 'pro' : 'lite');
  });

  const checkUpdateBtn = panel.querySelector('#checkUpdateBtn') as HTMLButtonElement;
  const updateStatusEl = panel.querySelector('#updateCheckStatus') as HTMLElement;
  checkUpdateBtn?.addEventListener('click', async () => {
    checkUpdateBtn.disabled = true;
    const origHtml = checkUpdateBtn.innerHTML;
    checkUpdateBtn.innerText = t('updater.checking');
    if (updateStatusEl) {
      updateStatusEl.style.display = 'block';
      updateStatusEl.innerText = t('updater.checking');
    }

    try {
      await updateManager.checkForUpdates(false, (status) => {
        if (updateStatusEl) {
          if (status === 'checking') updateStatusEl.innerText = t('updater.checking');
          else if (status === 'upToDate') updateStatusEl.innerText = `✓ ${t('updater.upToDate')}`;
          else if (status === 'available') updateStatusEl.innerText = `★ ${t('updater.availableTitle')}`;
          else if (status === 'error') updateStatusEl.innerText = `⚠ ${t('updater.error')}`;
        }
      });
    } finally {
      checkUpdateBtn.disabled = false;
      checkUpdateBtn.innerHTML = origHtml;
    }
  });

  if (host.activeProfile?.role === 'admin' && (!host.licenseModule.enterprisePolicy?.is_managed || host.licenseModule.enterprisePolicy.allow_mode_switch)) {
    panel.querySelectorAll('[data-set-edition]').forEach((el) => {
      el.addEventListener('click', () => {
        const mode = (el as HTMLElement).getAttribute('data-set-edition') as 'lite' | 'pro';
        if (mode === 'pro' && !host.checkFeatureAccess('pro')) {
          host.promptLicense('pro');
          return;
        }
        host.settings.execution_mode = mode;
        if (mode === 'pro') {
          setTransport(new HttpSseTransport(host.settings.server_url || 'http://localhost:8080', host.settings.server_auth_token));
        } else {
          setTransport(new TauriIpcTransport());
        }
        panel.innerHTML = host.renderSettings();
        host.attachSettingsEvents();
      });
    });

    const spUrlInput = panel.querySelector('#spServerUrlInput') as HTMLInputElement;
    spUrlInput?.addEventListener('input', (e) => {
      host.settings.server_url = (e.target as HTMLInputElement).value.trim();
      if (host.settings.execution_mode === 'pro') {
        setTransport(new HttpSseTransport(host.settings.server_url || 'http://localhost:8080', host.settings.server_auth_token));
      }
    });

    const spTokenInput = panel.querySelector('#spServerTokenInput') as HTMLInputElement;
    spTokenInput?.addEventListener('input', (e) => {
      host.settings.server_auth_token = (e.target as HTMLInputElement).value.trim();
      if (host.settings.execution_mode === 'pro') {
        setTransport(new HttpSseTransport(host.settings.server_url || 'http://localhost:8080', host.settings.server_auth_token));
      }
    });
  }
}
