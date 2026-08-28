/**
 * MandatoryUpdateGate — Bouclier infranchissable de verrouillage pour les mises à jour obligatoires.
 * Empêche toute utilisation de l'application tant que la mise à jour requise n'a pas été installée.
 * 100% i18n (FR / EN / AR + RTL) avec option de fermeture sécurisée de l'application.
 */
import { updaterApi, type VersionCheckResponse, type AppUpdateProgress } from '../../api/updater';
import { t, isRTL } from '../../i18n';
import { appWindow } from '@tauri-apps/api/window';

export class MandatoryUpdateGate {
  private static instance: MandatoryUpdateGate | null = null;
  private isShieldActive = false;
  private checkInterval: any = null;

  public static getInstance(): MandatoryUpdateGate {
    if (!MandatoryUpdateGate.instance) {
      MandatoryUpdateGate.instance = new MandatoryUpdateGate();
    }
    return MandatoryUpdateGate.instance;
  }

  /**
   * Démarre la surveillance automatique des versions (au lancement et toutes les 15 minutes).
   */
  public startMonitoring(): void {
    // Vérification immédiate au démarrage
    void this.checkAndEnforce(true);

    // Vérification périodique toutes les 15 minutes
    if (!this.checkInterval) {
      this.checkInterval = setInterval(() => {
        void this.checkAndEnforce(true);
      }, 15 * 60 * 1000);
    }
  }

  /**
   * Vérifie la conformité de version auprès du serveur et active le bouclier si obligatoire.
   */
  public async checkAndEnforce(silent = true): Promise<VersionCheckResponse | null> {
    if (this.isShieldActive) return null;

    try {
      const res = await updaterApi.checkAppVersion();
      if (res.is_mandatory && res.update_available) {
        this.showHardLockShield(res);
        return res;
      }
      return res;
    } catch (err) {
      if (!silent) {
        console.warn('[MandatoryUpdateGate] Check failed:', err);
      }
      return null;
    }
  }

  /**
   * Affiche l'écran de verrouillage strict (Hard Lock Shield).
   */
  public showHardLockShield(info: VersionCheckResponse): void {
    if (this.isShieldActive) return;
    this.isShieldActive = true;

    // Supprimer tout éventuel bouclier existant
    const existing = document.getElementById('mandatory-update-shield');
    if (existing) existing.remove();

    const rtl = isRTL();
    const shieldEl = document.createElement('div');
    shieldEl.id = 'mandatory-update-shield';
    shieldEl.className = 'mandatory-shield-overlay';
    shieldEl.setAttribute('dir', rtl ? 'rtl' : 'ltr');
    shieldEl.innerHTML = `
      <style>
        .mandatory-shield-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          z-index: 999999999;
          background: rgba(10, 15, 29, 0.97);
          backdrop-filter: blur(16px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          user-select: none;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          animation: shieldFadeIn 0.3s ease-out;
        }

        @keyframes shieldFadeIn {
          from { opacity: 0; transform: scale(0.98); }
          to { opacity: 1; transform: scale(1); }
        }

        .mandatory-shield-card {
          background: #1e293b;
          border: 1px solid rgba(239, 68, 68, 0.4);
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 35px rgba(239, 68, 68, 0.2);
          border-radius: 16px;
          width: 100%;
          max-width: 520px;
          overflow: hidden;
          color: #f8fafc;
        }

        .mandatory-shield-header {
          padding: 1.75rem 1.5rem 1rem;
          text-align: center;
          background: linear-gradient(180deg, rgba(239, 68, 68, 0.12) 0%, transparent 100%);
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
        }

        .shield-pulse-icon {
          font-size: 3rem;
          margin-bottom: 0.5rem;
          animation: shieldPulse 2s infinite ease-in-out;
        }

        @keyframes shieldPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); filter: drop-shadow(0 0 12px rgba(239, 68, 68, 0.6)); }
        }

        .mandatory-shield-header h2 {
          margin: 0 0 0.5rem;
          font-size: 1.35rem;
          font-weight: 700;
          color: #ffffff;
          letter-spacing: -0.02em;
        }

        .version-diff-pill {
          display: inline-flex;
          align-items: center;
          gap: 0.5rem;
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.1);
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 0.85rem;
          font-weight: 600;
        }

        .version-diff-pill .old-v { color: #94a3b8; text-decoration: line-through; }
        .version-diff-pill .arrow { color: #38bdf8; }
        .version-diff-pill .new-v { color: #4ade80; }

        .mandatory-shield-body {
          padding: 1.5rem;
        }

        .mandatory-reason {
          font-size: 0.9rem;
          color: #cbd5e1;
          line-height: 1.5;
          margin: 0 0 1rem;
          text-align: center;
        }

        .changelog-box {
          background: rgba(15, 23, 42, 0.7);
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 8px;
          padding: 0.85rem 1rem;
          font-size: 0.85rem;
          color: #94a3b8;
          margin-bottom: 1.25rem;
          max-height: 120px;
          overflow-y: auto;
        }

        .changelog-box strong {
          color: #e2e8f0;
          display: block;
          margin-bottom: 0.35rem;
        }

        .changelog-box p {
          margin: 0;
          line-height: 1.4;
        }

        .shield-progress {
          margin-bottom: 1.25rem;
        }

        .shield-progress .progress-info {
          display: flex;
          justify-content: space-between;
          font-size: 0.8rem;
          color: #cbd5e1;
          margin-bottom: 0.35rem;
        }

        .shield-progress .progress-bar-bg {
          height: 8px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
          overflow: hidden;
        }

        .shield-progress .progress-bar-fill {
          height: 100%;
          background: linear-gradient(90deg, #38bdf8, #3b82f6);
          border-radius: 4px;
          transition: width 0.2s ease-out;
        }

        .shield-actions-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
        }

        .btn-mandatory-update {
          width: 100%;
          padding: 0.85rem 1.25rem;
          background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
          color: #ffffff;
          border: none;
          border-radius: 10px;
          font-size: 1rem;
          font-weight: 700;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          box-shadow: 0 4px 14px rgba(239, 68, 68, 0.4);
          transition: all 0.2s ease;
        }

        .btn-mandatory-update:hover:not(:disabled) {
          background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
          transform: translateY(-1px);
          box-shadow: 0 6px 20px rgba(239, 68, 68, 0.6);
        }

        .btn-mandatory-update:disabled {
          opacity: 0.7;
          cursor: not-allowed;
          transform: none;
        }

        .btn-quit-app {
          width: 100%;
          padding: 0.65rem 1rem;
          background: rgba(255, 255, 255, 0.05);
          color: #94a3b8;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.4rem;
          transition: all 0.2s ease;
        }

        .btn-quit-app:hover {
          background: rgba(239, 68, 68, 0.15);
          color: #fca5a5;
          border-color: rgba(239, 68, 68, 0.3);
        }
      </style>

      <div class="mandatory-shield-card">
        <div class="mandatory-shield-header">
          <div class="shield-pulse-icon">🛑</div>
          <h2>${t('updater.mandatoryTitle', { defaultValue: 'Mise à jour obligatoire requise' })}</h2>
          <div class="version-diff-pill">
            <span class="old-v">v${info.current_version}</span>
            <span class="arrow">➔</span>
            <span class="new-v">v${info.latest_version}</span>
          </div>
        </div>

        <div class="mandatory-shield-body">
          <p class="mandatory-reason">
            ${info.title || t('updater.mandatoryDesc', { defaultValue: 'Cette version est requise pour assurer la sécurité et le bon fonctionnement de l\'intelligence artificielle. Votre version actuelle a été révoquée.' })}
          </p>

          <div class="changelog-box">
            <strong>${t('updater.whatsNew', { defaultValue: 'Nouveautés & Améliorations :' })}</strong>
            <p>${info.changelog || 'Mise à jour majeure de sécurité et intégration des nouveaux moteurs IA.'}</p>
          </div>

          <!-- Progress Bar (hidden by default) -->
          <div class="shield-progress" id="shieldProgressContainer" style="display: none;">
            <div class="progress-info">
              <span id="shieldProgressStatus">${t('updater.downloading', { defaultValue: 'Téléchargement...' })}</span>
              <span id="shieldProgressPct">0%</span>
            </div>
            <div class="progress-bar-bg">
              <div id="shieldProgressFill" class="progress-bar-fill" style="width: 0%;"></div>
            </div>
          </div>

          <!-- Action Buttons -->
          <div class="shield-actions-group">
            <button type="button" id="btnApplyMandatoryUpdate" class="btn-mandatory-update">
              <span>🚀</span>
              <span id="btnApplyMandatoryUpdateText">${t('updater.updateNowBtn', { defaultValue: 'Mettre à jour et Redémarrer (Obligatoire)' })}</span>
            </button>
            <button type="button" id="btnQuitApp" class="btn-quit-app">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              <span>${t('updater.quitAppBtn', { defaultValue: "Quitter l'application" })}</span>
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(shieldEl);

    // Blocage absolu des interactions clavier (ESC, F5, Alt, etc.)
    const blockKeyHandler = (e: KeyboardEvent) => {
      if (this.isShieldActive) {
        if (e.key === 'Escape' || e.key === 'F5' || (e.ctrlKey && e.key === 'r')) {
          e.preventDefault();
          e.stopPropagation();
        }
      }
    };
    window.addEventListener('keydown', blockKeyHandler, true);

    // Bouton Quitter
    const quitBtn = shieldEl.querySelector('#btnQuitApp') as HTMLButtonElement | null;
    quitBtn?.addEventListener('click', async () => {
      try {
        await appWindow.close();
      } catch {
        window.close();
      }
    });

    // Attachement du gestionnaire de mise à jour
    const btn = shieldEl.querySelector('#btnApplyMandatoryUpdate') as HTMLButtonElement | null;
    const btnText = shieldEl.querySelector('#btnApplyMandatoryUpdateText') as HTMLElement | null;
    const progressContainer = shieldEl.querySelector('#shieldProgressContainer') as HTMLElement | null;
    const progressStatus = shieldEl.querySelector('#shieldProgressStatus') as HTMLElement | null;
    const progressPct = shieldEl.querySelector('#shieldProgressPct') as HTMLElement | null;
    const progressFill = shieldEl.querySelector('#shieldProgressFill') as HTMLElement | null;

    btn?.addEventListener('click', async () => {
      if (btn.disabled) return;
      btn.disabled = true;
      if (btnText) btnText.textContent = t('updater.downloading', { defaultValue: 'Téléchargement en cours...' });
      if (progressContainer) progressContainer.style.display = 'block';

      try {
        // Re-vérifier l'URL en direct si besoin
        let targetUrl = info.download_url;
        try {
          const fresh = await updaterApi.checkAppVersion();
          if (fresh.download_url) targetUrl = fresh.download_url;
        } catch (_) {}

        const unlisten = await updaterApi.onUpdateProgress((p: AppUpdateProgress) => {
          if (progressStatus) progressStatus.textContent = p.message;
          if (progressPct) progressPct.textContent = `${Math.round(p.percentage)}%`;
          if (progressFill) progressFill.style.width = `${Math.max(4, p.percentage)}%`;
        });

        await updaterApi.installAppUpdate(targetUrl);
        unlisten();
      } catch (err: any) {
        console.error('Failed to apply update:', err);
        const msg = typeof err === 'string' ? err : err?.message || 'Erreur de téléchargement';
        if (progressStatus) progressStatus.textContent = msg;
        btn.disabled = false;
        if (btnText) btnText.textContent = t('updater.retryBtn', { defaultValue: 'Réessayer la mise à jour' });
      }
    });
  }
}

export const mandatoryUpdateGate = MandatoryUpdateGate.getInstance();
