/**
 * LicenseModule — Quota display and license/feature access.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { LicenseModal } from '../../ui/LicenseModal';
import type { EnterprisePolicy, LicenseStatus, LicenseTier, UserQuota } from '../../types';
import type { ToastService } from '../../ui/ToastService';

export class LicenseModule {
  currentQuota: UserQuota | null = null;
  licenseStatus: LicenseStatus | null = null;
  enterprisePolicy: EnterprisePolicy | null = null;

  constructor(private toast: ToastService) {}

  async refreshQuota(onUpdate: () => void): Promise<void> {
    try {
      this.currentQuota = await api.getUserQuota();
      onUpdate();
    } catch {
      // ignore
    }
  }

  async refreshLicenseStatus(): Promise<void> {
    try {
      this.licenseStatus = await api.getLicenseStatus();
    } catch {
      this.licenseStatus = null;
    }
  }

  async refreshEnterprisePolicy(): Promise<void> {
    try {
      this.enterprisePolicy = await api.getEnterprisePolicy();
    } catch {
      this.enterprisePolicy = null;
    }
  }

  getQuotaBadgeClass(): string {
    if (!this.currentQuota) return 'quota-normal';
    if (this.currentQuota.is_admin) return 'quota-admin';
    if (this.currentQuota.is_exceeded) return 'quota-exceeded';
    if (this.currentQuota.remaining_today <= 5) return 'quota-low';
    return 'quota-normal';
  }

  getQuotaLabel(): string {
    if (!this.currentQuota) return '⚡ 100/100';
    if (this.currentQuota.is_admin) return '👑 Admin (∞)';
    return `⚡ ${this.currentQuota.remaining_today}/${this.currentQuota.daily_limit}`;
  }

  getQuotaTooltip(): string {
    if (!this.currentQuota) return t('quota.resetInfo');
    if (this.currentQuota.is_admin) return t('quota.adminBadge');
    return `${t('quota.badgeTitle', { remaining: this.currentQuota.remaining_today, limit: this.currentQuota.daily_limit })} • ${t('quota.resetInfo')}`;
  }

  updateQuotaUI(): void {
    const el = document.getElementById('quotaIndicator');
    if (!el) return;
    el.className = `tb-quota-badge ${this.getQuotaBadgeClass()}`;
    el.title = this.getQuotaTooltip();
    el.querySelector('.tb-quota-text')!.textContent = this.getQuotaLabel();
  }

  checkFeatureAccess(feature: 'voice' | 'rag' | 'memory' | 'search' | 'pro'): boolean {
    if (feature === 'pro') {
      if (this.enterprisePolicy?.is_managed && this.enterprisePolicy.locked_mode === 'pro') return true;
      return !!this.licenseStatus?.is_pro_unlocked;
    }
    return true;
  }

  getWhatsAppLicenseUrl(tier: 'lite' | 'pro' = 'lite'): string {
    const hwid = this.licenseStatus?.hwid || 'N/A';
    const textTemplate =
      tier === 'pro' ? t('license.whatsappTextPro', { hwid }) : t('license.whatsappTextLite', { hwid });
    return `https://wa.me/213540517176?text=${encodeURIComponent(textTemplate)}`;
  }

  promptLicense(
    tier: LicenseTier,
    isAdmin: boolean,
    prevMode: string,
    lastExpandedSize: { w: number; h: number },
    onUpdated: (status: LicenseStatus) => void,
    onRender: () => void,
  ): void {
    if (!isAdmin) {
      this.toast.show(t('license.contactAdminToUnlock'), 'warning');
      return;
    }
    if (prevMode !== 'expanded') {
      void api.widgetResize(520, 620).catch(() => {});
    }
    const modal = new LicenseModal(
      tier,
      (newStatus) => {
        this.licenseStatus = newStatus;
        onUpdated(newStatus);
        onRender();
      },
      this.licenseStatus?.hwid,
      () => {
        if (prevMode !== 'expanded') {
          void api.widgetResize(lastExpandedSize.w, lastExpandedSize.h).catch(() => {});
        }
      },
    );
    modal.show();
  }
}
