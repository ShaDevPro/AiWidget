/**
 * FooterMenuModule — Dropdown menu combining Contact, Feedback, Privacy & Terms.
 * Light theme only. Modular architecture / i18n FR/EN/AR.
 */

import { t } from '../../i18n';
import { contactModule } from '../contact/ContactModule';
import { legalModule } from '../legal/LegalModule';
import { tipsModule } from '../tips/TipsModule';

export class FooterMenuModule {
  private container: HTMLElement | null = null;
  private isOpen = false;
  onOpenLicense?: () => void;

  renderInto(container: HTMLElement, isAdmin: boolean = false, isProMode: boolean = false): void {
    this.container = container;
    container.innerHTML = `
      <div class="footer-menu-wrap">
        <button class="footer-menu-trigger" id="footerMenuTrigger" aria-haspopup="true" aria-expanded="false">
          <span class="footer-menu-icon">☰</span>
          <span class="footer-menu-label">${t('menu.more')}</span>
          <span class="footer-menu-arrow">▾</span>
        </button>
        <div class="footer-menu-popover" id="footerMenuPopover">
          <button class="footer-menu-item" id="fmTips">
            <span class="footer-menu-item-icon">💡</span>
            <span class="footer-menu-item-text">${t('tips.menuItem')}</span>
          </button>
          <div class="footer-menu-divider"></div>
          ${isAdmin && isProMode ? `
            <button class="footer-menu-item" id="fmLicense">
              <span class="footer-menu-item-icon">🔑</span>
              <span class="footer-menu-item-text">${t('license.menuItem')}</span>
            </button>
            <div class="footer-menu-divider"></div>
          ` : ''}
          <button class="footer-menu-item" id="fmContact">
            <span class="footer-menu-item-icon">📬</span>
            <span class="footer-menu-item-text">${t('contact.title')}</span>
          </button>
          <button class="footer-menu-item" id="fmFeedback">
            <span class="footer-menu-item-icon">💬</span>
            <span class="footer-menu-item-text">${t('feedback.title')}</span>
          </button>
          <div class="footer-menu-divider"></div>
          <button class="footer-menu-item" id="fmPrivacy">
            <span class="footer-menu-item-icon">🔐</span>
            <span class="footer-menu-item-text">${t('privacy.title')}</span>
          </button>
          <button class="footer-menu-item" id="fmTerms">
            <span class="footer-menu-item-icon">📋</span>
            <span class="footer-menu-item-text">${t('terms.title')}</span>
          </button>
        </div>
      </div>
    `;

    const trigger = container.querySelector<HTMLButtonElement>('#footerMenuTrigger');

    trigger?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.toggle();
    });

    container.querySelector('#fmTips')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      tipsModule.open();
    });

    container.querySelector('#fmLicense')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      this.onOpenLicense?.();
    });

    container.querySelector('#fmContact')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      contactModule.openContact();
    });

    container.querySelector('#fmFeedback')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      contactModule.openFeedback();
    });

    container.querySelector('#fmPrivacy')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      legalModule.openPrivacy();
    });

    container.querySelector('#fmTerms')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this.close();
      legalModule.openTerms();
    });

    document.addEventListener('click', (e) => {
      if (this.isOpen && !container.contains(e.target as Node)) {
        this.close();
      }
    });
  }

  toggle(): void {
    if (this.isOpen) this.close();
    else this.open();
  }

  open(): void {
    this.isOpen = true;
    const popover = this.container?.querySelector<HTMLElement>('#footerMenuPopover');
    const trigger = this.container?.querySelector<HTMLElement>('#footerMenuTrigger');
    popover?.classList.add('open');
    trigger?.classList.add('active');
    trigger?.setAttribute('aria-expanded', 'true');
  }

  close(): void {
    this.isOpen = false;
    const popover = this.container?.querySelector<HTMLElement>('#footerMenuPopover');
    const trigger = this.container?.querySelector<HTMLElement>('#footerMenuTrigger');
    popover?.classList.remove('open');
    trigger?.classList.remove('active');
    trigger?.setAttribute('aria-expanded', 'false');
  }

  refresh(): void {
    if (this.container) this.renderInto(this.container);
  }
}

export const footerMenuModule = new FooterMenuModule();
