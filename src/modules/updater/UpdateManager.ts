/**
 * UpdateManager — Enterprise Auto-Update Manager (Tauri Auto-Updater).
 * Modular architecture, fully localized in FR, EN, AR with interactive modals and progress tracking.
 */
import { checkUpdate, installUpdate, onUpdaterEvent, type UpdateResult } from '@tauri-apps/api/updater';
import { t, isRTL } from '../../i18n';
import { icons } from '../../ui/icons';

export interface UpdateInfo {
  version: string;
  currentVersion: string;
  body?: string;
  date?: string;
}

export class UpdateManager {
  private static instance: UpdateManager | null = null;
  private currentVersion = '1.0.1';
  private isChecking = false;
  private isDownloading = false;
  private updateModal: HTMLElement | null = null;

  public static getInstance(): UpdateManager {
    if (!UpdateManager.instance) {
      UpdateManager.instance = new UpdateManager();
    }
    return UpdateManager.instance;
  }

  public getCurrentVersion(): string {
    return this.currentVersion;
  }

  /**
   * Check for updates from configured endpoint.
   * @param silent If true, suppresses "App is up to date" notifications (used on background auto-check).
   */
  public async checkForUpdates(
    silent: boolean = false,
    onStatusChange?: (status: 'checking' | 'upToDate' | 'available' | 'error', version?: string) => void,
  ): Promise<UpdateResult | null> {
    if (this.isChecking) return null;
    this.isChecking = true;
    if (onStatusChange) onStatusChange('checking');

    try {
      const result = await checkUpdate();

      if (result.shouldUpdate && result.manifest) {
        if (onStatusChange) onStatusChange('available', result.manifest.version);
        this.showUpdateModal(result);
        return result;
      } else {
        if (onStatusChange) onStatusChange('upToDate', this.currentVersion);
        if (!silent) {
          this.showUpToDateModal();
        }
        return null;
      }
    } catch (err) {
      console.warn('[Updater] Check failed:', err);
      if (onStatusChange) onStatusChange('error');
      if (!silent) {
        this.showErrorModal(String(err));
      }
      return null;
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Download and install the update with real-time progress.
   */
  public async downloadAndInstall(
    onProgress?: (percent: number, statusText: string) => void,
  ): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    try {
      const unlisten = await onUpdaterEvent((event) => {
        if (event.status === 'PENDING') {
          if (onProgress) onProgress(10, t('updater.downloading'));
        } else if (event.status === 'DONE') {
          if (onProgress) onProgress(100, t('updater.installing'));
        } else if (event.status === 'ERROR') {
          if (onProgress) onProgress(0, t('updater.error'));
        }
      });

      await installUpdate();
      unlisten();
    } catch (err) {
      this.isDownloading = false;
      throw err;
    }
  }

  // ── Modals & UI ─────────────────────────────────────────────────────────

  public showUpdateModal(update: UpdateResult): void {
    this.closeModal();

    const newVersion = update.manifest?.version || 'Nouvelle version';
    const notes = update.manifest?.body || t('updater.defaultNotes');
    const date = update.manifest?.date ? new Date(update.manifest.date).toLocaleDateString() : '';

    const modal = document.createElement('div');
    modal.className = `update-overlay ${isRTL() ? 'rtl' : ''}`;
    modal.id = 'updateModalOverlay';

    modal.innerHTML = `
      <div class="update-card fade-in">
        <div class="update-header">
          <div class="update-icon-circle">
            ${icons.sparkles}
          </div>
          <div class="update-header-info">
            <h3 class="update-title">${t('updater.availableTitle')}</h3>
            <span class="update-version-badge">v${this.currentVersion} ➔ <strong class="highlight">v${newVersion}</strong></span>
          </div>
          <button class="update-close-btn" id="updateCloseBtn" aria-label="${t('common.close')}">${icons.close}</button>
        </div>

        <div class="update-body">
          ${date ? `<div class="update-date">📅 ${t('updater.releaseDate')}: ${date}</div>` : ''}
          <div class="update-notes-box">
            <div class="update-notes-title">${t('updater.whatsNew')}</div>
            <div class="update-notes-content">${escapeHtml(notes)}</div>
          </div>

          <div class="update-progress-container" id="updateProgressContainer" style="display:none;">
            <div class="update-progress-bar">
              <div class="update-progress-fill" id="updateProgressFill" style="width: 0%;"></div>
            </div>
            <div class="update-progress-label" id="updateProgressLabel">${t('updater.downloading')}...</div>
          </div>
        </div>

        <div class="update-footer">
          <button class="sp-btn-ghost" id="updateLaterBtn">${t('updater.later')}</button>
          <button class="sp-btn-primary update-install-btn" id="updateInstallBtn">
            ${icons.download} ${t('updater.downloadInstall')}
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.updateModal = modal;

    // Event listeners
    modal.querySelector('#updateCloseBtn')?.addEventListener('click', () => this.closeModal());
    modal.querySelector('#updateLaterBtn')?.addEventListener('click', () => this.closeModal());

    const installBtn = modal.querySelector('#updateInstallBtn') as HTMLButtonElement;
    const progressContainer = modal.querySelector('#updateProgressContainer') as HTMLElement;
    const progressFill = modal.querySelector('#updateProgressFill') as HTMLElement;
    const progressLabel = modal.querySelector('#updateProgressLabel') as HTMLElement;

    installBtn?.addEventListener('click', async () => {
      installBtn.disabled = true;
      installBtn.innerHTML = `<span class="spinner-inline"></span> ${t('updater.downloading')}...`;
      if (progressContainer) progressContainer.style.display = 'block';

      try {
        await this.downloadAndInstall((pct, statusText) => {
          if (progressFill) progressFill.style.width = `${pct}%`;
          if (progressLabel) progressLabel.innerText = statusText;
        });

        if (progressLabel) progressLabel.innerText = t('updater.readyRestart');
        installBtn.innerHTML = `${icons.check} ${t('updater.restartBtn')}`;
        installBtn.disabled = false;
        installBtn.onclick = () => window.location.reload();
      } catch (err) {
        installBtn.disabled = false;
        installBtn.innerText = t('updater.retry');
        if (progressLabel) progressLabel.innerText = `${t('updater.error')}: ${err}`;
      }
    });
  }

  public showUpToDateModal(): void {
    this.closeModal();

    const modal = document.createElement('div');
    modal.className = `update-overlay ${isRTL() ? 'rtl' : ''}`;
    modal.id = 'updateModalOverlay';

    modal.innerHTML = `
      <div class="update-card fade-in" style="max-width: 360px; text-align: center;">
        <div class="update-icon-circle success" style="margin: 0 auto 12px; background: rgba(34,197,94,0.12); color: #16a34a;">
          ${icons.check}
        </div>
        <h3 class="update-title" style="margin-bottom: 4px;">${t('updater.upToDateTitle')}</h3>
        <p class="update-desc" style="font-size: 12px; color: var(--text-secondary); margin: 0 0 16px;">
          ${t('updater.upToDateDesc', { version: 'v' + this.currentVersion })}
        </p>
        <button class="sp-btn-primary" id="upToDateOkBtn" style="width: 100%; justify-content: center;">
          ${t('common.confirm') || 'OK'}
        </button>
      </div>
    `;

    document.body.appendChild(modal);
    this.updateModal = modal;
    modal.querySelector('#upToDateOkBtn')?.addEventListener('click', () => this.closeModal());
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeModal();
    });
  }

  public showErrorModal(errorMsg: string): void {
    this.closeModal();

    const modal = document.createElement('div');
    modal.className = `update-overlay ${isRTL() ? 'rtl' : ''}`;
    modal.id = 'updateModalOverlay';

    modal.innerHTML = `
      <div class="update-card fade-in" style="max-width: 380px;">
        <div class="update-header">
          <div class="update-icon-circle" style="background: rgba(239,68,68,0.12); color: #ef4444;">
            ${icons.warn}
          </div>
          <div class="update-header-info">
            <h3 class="update-title">${t('updater.errorTitle')}</h3>
            <span class="update-version-badge" style="color: var(--text-muted);">v${this.currentVersion}</span>
          </div>
          <button class="update-close-btn" id="updateCloseBtn">${icons.close}</button>
        </div>
        <p class="update-desc" style="font-size: 11.5px; color: var(--text-secondary); margin: 8px 0 14px;">
          ${t('updater.errorDesc')}<br><code style="font-size: 10.5px; color:#ef4444;">${escapeHtml(errorMsg)}</code>
        </p>
        <div class="update-footer" style="justify-content: flex-end;">
          <button class="sp-btn-primary" id="updateErrorOkBtn">${t('common.confirm') || 'Fermer'}</button>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
    this.updateModal = modal;
    modal.querySelector('#updateCloseBtn')?.addEventListener('click', () => this.closeModal());
    modal.querySelector('#updateErrorOkBtn')?.addEventListener('click', () => this.closeModal());
  }

  public closeModal(): void {
    if (this.updateModal) {
      this.updateModal.remove();
      this.updateModal = null;
    }
  }
}

function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };
  return text.replace(/[&<>"']/g, (m) => map[m]);
}

export const updateManager = UpdateManager.getInstance();
