import { t, currentLanguage, isRTL } from '../i18n';
import { icons } from './icons';
import { api } from '../api';
import type { LicenseStatus, LicenseTier } from '../types';

export class LicenseModal {
  private container: HTMLElement;
  private targetTier: LicenseTier;
  private currentHwid = '';
  private currentStatus: LicenseStatus | null = null;
  private onActivatedCallback: (status: LicenseStatus) => void;
  private onCloseCallback?: () => void;
  private isActivating = false;
  private keydownHandler?: (e: KeyboardEvent) => void;

  constructor(
    targetTier: LicenseTier = 'lite',
    onActivated: (status: LicenseStatus) => void,
    initialHwid?: string,
    onClose?: () => void
  ) {
    this.targetTier = targetTier;
    this.onActivatedCallback = onActivated;
    this.onCloseCallback = onClose;
    if (initialHwid) this.currentHwid = initialHwid;

    let el = document.getElementById('licenseModalContainer');
    if (!el) {
      el = document.createElement('div');
      el.id = 'licenseModalContainer';
      document.body.appendChild(el);
    }
    this.container = el;
  }

  public show(): void {
    // 1. Render immediately so popup appears instantly on click
    this.render();

    // 2. Fetch fresh HWID in background if not provided
    if (!this.currentHwid || this.currentHwid === 'Chargement...') {
      api.getHardwareId().then((hwid) => {
        this.currentHwid = hwid;
        const hwidEl = document.getElementById('licHwidVal');
        if (hwidEl) hwidEl.textContent = hwid;
        const waBtn = document.getElementById('licWhatsAppBtn') as HTMLAnchorElement;
        if (waBtn) waBtn.href = this.getWhatsAppUrl();
      }).catch(() => {
        this.currentHwid = 'WAI-DEVICE-ID-UNKNOWN';
      });
    }

    // 3. Auto focus input
    setTimeout(() => {
      document.getElementById('licKeyInput')?.focus();
    }, 100);
  }

  public close(): void {
    if (this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = undefined;
    }
    this.container.innerHTML = '';
    this.onCloseCallback?.();
  }

  private getWhatsAppUrl(): string {
    const phone = '213540517176';
    const isPro = this.targetTier === 'pro';
    const template = isPro ? t('license.whatsappTextPro') : t('license.whatsappTextLite');
    const msg = template.replace('{hwid}', this.currentHwid || 'N/A');
    return `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
  }

  private render(): void {
    const isRtl = isRTL(currentLanguage());
    const isPro = this.targetTier === 'pro';
    const priceBadge = isPro ? t('license.badgePro') : t('license.badgeLite');
    const subtitle = isPro ? t('license.subtitlePro') : t('license.subtitleLite');
    const displayHwid = this.currentHwid || 'Chargement...';

    this.container.innerHTML = `
      <div class="lic-backdrop" id="licBackdrop">
        <div class="lic-card ${isRtl ? 'rtl' : ''}" id="licCard">
          
          <!-- Close Button -->
          <button class="lic-close-btn" id="licCloseBtn" title="Fermer" type="button">${icons.close}</button>

          <!-- Top Badge & Header -->
          <div class="lic-header">
            <div class="lic-icon-wrap ${isPro ? 'pro' : 'lite'}">
              ${isPro ? '👑' : '💎'}
            </div>
            <div class="lic-price-badge ${isPro ? 'pro' : 'lite'}">${priceBadge}</div>
            <h2 class="lic-title">${t('license.title')}</h2>
            <p class="lic-subtitle">${subtitle}</p>
          </div>

          <!-- HWID Card -->
          <div class="lic-hwid-box">
            <div class="lic-hwid-head">
              <span class="lic-hwid-label">🖥️ ${t('license.hwidLabel')}</span>
              <button class="lic-copy-btn" id="licCopyHwidBtn" type="button">
                <span id="licCopyIcon">${icons.copy}</span>
                <span id="licCopyText">${t('license.copyHwid')}</span>
              </button>
            </div>
            <div class="lic-hwid-value" id="licHwidVal">${displayHwid}</div>
            <div class="lic-hwid-hint">${t('license.hwidDesc')}</div>
          </div>

          <!-- WhatsApp Action Button -->
          <div class="lic-request-section">
            <a href="${this.getWhatsAppUrl()}" target="_blank" class="lic-btn-whatsapp" id="licWhatsAppBtn">
              <span class="lic-wa-icon">💬</span>
              <span>${t('license.requestBtn')}</span>
            </a>
            <div class="lic-wa-notice">📱 ${t('license.requestNotice')}</div>
          </div>

          <div class="lic-divider">
            <span>${t('auth.or')}</span>
          </div>

          <!-- Activation Form -->
          <div class="lic-form">
            <label class="lic-field-label" for="licKeyInput">🔑 ${t('license.keyLabel')}</label>
            <div class="lic-input-wrap">
              <input type="text" class="lic-input" id="licKeyInput"
                placeholder="${t('license.keyPlaceholder')}"
                autocomplete="off" spellcheck="false" />
            </div>

            <div id="licAlertBox" style="display:none;"></div>

            <button class="lic-btn-activate" id="licActivateBtn" type="button">
              <span>🚀 ${t('license.activateBtn')}</span>
            </button>
          </div>

        </div>
      </div>
    `;

    this.attachEvents();
  }

  private setAlert(message: string, type: 'error' | 'success'): void {
    const alertBox = document.getElementById('licAlertBox');
    if (!alertBox) return;
    if (!message) {
      alertBox.style.display = 'none';
      alertBox.className = '';
      alertBox.textContent = '';
      return;
    }
    alertBox.className = `lic-alert ${type}`;
    alertBox.textContent = `${type === 'error' ? '✕ ' : '✓ '}${message}`;
    alertBox.style.display = 'block';
  }

  private setLoading(loading: boolean): void {
    this.isActivating = loading;
    const btn = document.getElementById('licActivateBtn') as HTMLButtonElement;
    if (!btn) return;
    btn.disabled = loading;
    btn.classList.toggle('loading', loading);
    btn.innerHTML = loading
      ? `<span class="spin">${icons.refresh}</span> Validation...`
      : `<span>🚀 ${t('license.activateBtn')}</span>`;
  }

  private attachEvents(): void {
    const backdrop = document.getElementById('licBackdrop');
    const card = document.getElementById('licCard');
    const closeBtn = document.getElementById('licCloseBtn');

    closeBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.close();
    });

    backdrop?.addEventListener('click', (e) => {
      if (e.target === backdrop) {
        e.preventDefault();
        e.stopPropagation();
        this.close();
      }
    });

    card?.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    // ESC key closes modal
    if (!this.keydownHandler) {
      this.keydownHandler = (e: KeyboardEvent) => {
        if (e.key === 'Escape') this.close();
      };
      window.addEventListener('keydown', this.keydownHandler);
    }

    // Copy HWID
    document.getElementById('licCopyHwidBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!this.currentHwid || this.currentHwid === 'Chargement...') return;
      try {
        await navigator.clipboard.writeText(this.currentHwid);
        const txt = document.getElementById('licCopyText');
        if (txt) txt.textContent = t('license.copied');
        setTimeout(() => {
          if (txt) txt.textContent = t('license.copyHwid');
        }, 2000);
      } catch { /* ignore */ }
    });

    // Enter key inside input submits
    const input = document.getElementById('licKeyInput') as HTMLInputElement;
    input?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void this.handleActivate();
      }
    });

    // Activate Button
    document.getElementById('licActivateBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void this.handleActivate();
    });
  }

  private async handleActivate(): Promise<void> {
    if (this.isActivating) return;
    const input = document.getElementById('licKeyInput') as HTMLInputElement;
    const key = input?.value.trim();
    if (!key) {
      this.setAlert('Veuillez saisir votre clé de licence.', 'error');
      input?.focus();
      return;
    }

    this.setLoading(true);
    this.setAlert('', 'error');

    try {
      const newStatus = await api.activateLicenseKey(key);
      this.setLoading(false);
      this.setAlert(t('license.activatedSuccess'), 'success');

      setTimeout(() => {
        this.close();
        this.onActivatedCallback(newStatus);
      }, 1200);
    } catch (err) {
      this.setLoading(false);
      const errMsg = (err as Error).message || String(err) || t('license.invalidKey');
      this.setAlert(errMsg, 'error');
      input?.focus();
    }
  }
}
