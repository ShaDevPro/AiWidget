/**
 * ModalsManager — Confirm + Web Privacy modals.
 * Web privacy modal is mounted on document.body (never destroyed by #app re-renders).
 */
import { t, isRTL, currentLanguage } from '../../i18n';
import { icons } from '../../ui/icons';
import type { WebPrivacyPromptOptions } from '../web/types';

const WEB_MODAL_ID = 'webPrivacyModalGlobal';
const WEB_BACKDROP_ID = 'webPrivacyBackdropGlobal';

export class ModalsManager {
  private webPrivacyMounted = false;

  init(): void {
    this.mountWebPrivacyShell();
  }

  /** Creates empty shell on document.body; content filled on each show (i18n-ready). */
  private mountWebPrivacyShell(): void {
    if (this.webPrivacyMounted || document.getElementById(WEB_MODAL_ID)) {
      this.webPrivacyMounted = true;
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = WEB_BACKDROP_ID;
    backdrop.className = 'backdrop web-privacy-backdrop-global';

    const modal = document.createElement('div');
    modal.id = WEB_MODAL_ID;
    modal.className = 'modal web-privacy-modal web-privacy-modal-global';

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);
    this.webPrivacyMounted = true;
  }

  private renderWebPrivacyContent(options?: WebPrivacyPromptOptions): void {
    const modal = document.getElementById(WEB_MODAL_ID);
    if (!modal) return;

    const lang = currentLanguage();
    modal.setAttribute('dir', isRTL(lang) ? 'rtl' : 'ltr');
    modal.setAttribute('lang', lang);

    const reasonKey = options?.reasonKey;
    const reasonBlock = reasonKey
      ? `<div class="web-intent-reason-card">
          <span class="web-intent-reason-label">${t('web.intent.reasonLabel')}</span>
          <span class="web-intent-reason-text">${t(`web.intent.category.${reasonKey}`, { defaultValue: t('web.intent.category.live_facts') })}</span>
        </div>`
      : '';

    modal.innerHTML = `
      <div class="web-privacy-header">
        <div class="web-privacy-icon">${icons.globe}</div>
        <h3>${t('web.privacyTitle')}</h3>
      </div>
      ${reasonBlock}
      <p class="web-privacy-desc">${t('web.privacyDesc')}</p>
      <div class="privacy-guarantee-card">
        <div class="privacy-guarantee-icon">${icons.shieldCheck}</div>
        <div class="privacy-guarantee-text">${t('web.privacyGuarantee')}</div>
      </div>
      <label class="privacy-remember-row">
        <input type="checkbox" id="rememberWebPrivacyCheckGlobal" />
        <span>${t('web.rememberChoice')}</span>
      </label>
      <div class="modal-actions">
        <button type="button" class="btn-secondary" id="webPrivacyCancelGlobal">${t('web.cancelBtn')}</button>
        <button type="button" class="btn-primary web-auth-btn" id="webPrivacyOkGlobal">${icons.globe} ${t('web.authorizeBtn')}</button>
      </div>
    `;
  }

  showConfirm(text: string, onOk: () => void): void {
    const confirmModal = document.getElementById('confirmModal');
    const confirmText = document.getElementById('confirmText');
    const backdrop = document.getElementById('modalBackdrop') || document.getElementById('backdrop');
    if (confirmText) confirmText.textContent = text;
    confirmModal?.classList.add('show');
    backdrop?.classList.add('show');

    const confirmOkBtn = document.getElementById('confirmOk');
    if (confirmOkBtn) {
      const newOk = confirmOkBtn.cloneNode(true) as HTMLElement;
      confirmOkBtn.parentNode?.replaceChild(newOk, confirmOkBtn);
      newOk.addEventListener('click', () => {
        this.hideConfirm();
        onOk();
      });
    }

    const confirmCancelBtn = document.getElementById('confirmCancel');
    if (confirmCancelBtn) {
      const newCancel = confirmCancelBtn.cloneNode(true) as HTMLElement;
      confirmCancelBtn.parentNode?.replaceChild(newCancel, confirmCancelBtn);
      newCancel.addEventListener('click', () => {
        this.hideConfirm();
      });
    }

    backdrop?.addEventListener('click', () => this.hideConfirm(), { once: true });
  }

  hideConfirm(): void {
    document.getElementById('confirmModal')?.classList.remove('show');
    document.getElementById('modalBackdrop')?.classList.remove('show');
    document.getElementById('backdrop')?.classList.remove('show');
  }

  showWebPrivacy(onAllow: () => void, onDeny: () => void, options?: WebPrivacyPromptOptions): void {
    this.mountWebPrivacyShell();
    this.renderWebPrivacyContent(options);

    const modal = document.getElementById(WEB_MODAL_ID);
    const backdrop = document.getElementById(WEB_BACKDROP_ID);
    if (!modal || !backdrop) {
      console.error('[ModalsManager] Impossible de monter le modal Web Privacy');
      onDeny();
      return;
    }

    modal.classList.add('show');
    backdrop.classList.add('show');

    const finish = (allow: boolean) => {
      const rememberCheck = document.getElementById('rememberWebPrivacyCheckGlobal') as HTMLInputElement;
      if (allow && rememberCheck?.checked) {
        localStorage.setItem('aiwidget_web_privacy_accepted', 'true');
      }
      this.hideWebPrivacy();
      if (allow) onAllow();
      else onDeny();
    };

    const okBtn = document.getElementById('webPrivacyOkGlobal');
    okBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(true);
    }, { once: true });

    const cancelBtn = document.getElementById('webPrivacyCancelGlobal');
    cancelBtn?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      finish(false);
    }, { once: true });

    backdrop.onclick = () => finish(false);
  }

  showWebPrivacyAsync(options?: WebPrivacyPromptOptions): Promise<'allow' | 'deny'> {
    return new Promise((resolve) => {
      this.showWebPrivacy(
        () => resolve('allow'),
        () => resolve('deny'),
        options,
      );
    });
  }

  hideWebPrivacy(): void {
    const backdrop = document.getElementById(WEB_BACKDROP_ID);
    if (backdrop) backdrop.onclick = null;
    document.getElementById(WEB_MODAL_ID)?.classList.remove('show');
    backdrop?.classList.remove('show');
  }

  toast(msg: string, type: 'info' | 'error' | 'success' = 'info'): void {
    const toastEl = document.getElementById('toast');
    const toastIcon = document.getElementById('toastIcon');
    const toastText = document.getElementById('toastText');
    if (!toastEl || !toastText) return;

    toastEl.className = 'toast show ' + type;
    toastText.textContent = msg;

    if (toastIcon) {
      toastIcon.textContent = type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ';
    }

    setTimeout(() => {
      toastEl.classList.remove('show');
    }, 3200);
  }
}
