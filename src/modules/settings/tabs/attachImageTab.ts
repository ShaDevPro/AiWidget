/**
 * attachImageTab — Gestion des événements pour l'onglet Studio d'Images (Stable Diffusion).
 */
import { t } from '../../../i18n';
import { sdManager } from '../../image/SDManager';
import type { SettingsHost } from '../SettingsHost';

export function attachImageTab(host: SettingsHost, panel: HTMLElement): void {
  const badge = panel.querySelector('#sdStatusBadge') as HTMLElement | null;
  const details = panel.querySelector('#sdEngineDetails') as HTMLElement | null;
  const downloadBtn = panel.querySelector('#sdDownloadBtn') as HTMLButtonElement | null;
  const downloadBtnText = panel.querySelector('#sdDownloadBtnText') as HTMLElement | null;
  const progressContainer = panel.querySelector('#sdProgressContainer') as HTMLElement | null;
  const progressStatus = panel.querySelector('#sdProgressStatus') as HTMLElement | null;
  const progressPct = panel.querySelector('#sdProgressPct') as HTMLElement | null;
  const progressFill = panel.querySelector('#sdProgressFill') as HTMLElement | null;

  // Refresh status function
  const updateStatusDisplay = async () => {
    if (!badge) return;
    const status = await sdManager.getStatus(true);
    if (status.installed && status.model_installed) {
      badge.textContent = t('imageStudio.ready', { defaultValue: 'Prêt (Installé)' });
      badge.className = 'sp-status-badge success';
      if (details) {
        details.textContent = `${t('imageStudio.modelLoaded', { defaultValue: 'Modèle actif :' })} ${status.model_name || 'sd-v1-5-q4_0.gguf'}`;
      }
      if (downloadBtn) {
        downloadBtn.disabled = true;
        if (downloadBtnText) {
          downloadBtnText.textContent = t('imageStudio.installed', { defaultValue: 'Moteur Installé ✓' });
        }
      }
    } else if (status.installed && !status.model_installed) {
      badge.textContent = t('imageStudio.modelMissing', { defaultValue: 'Modèle Manquant' });
      badge.className = 'sp-status-badge warning';
      if (details) {
        details.textContent = t('imageStudio.downloadModelPrompt', { defaultValue: 'Le moteur est présent. Téléchargez le modèle d\'image pour commencer.' });
      }
    } else {
      badge.textContent = t('imageStudio.notInstalled', { defaultValue: 'Non Installé' });
      badge.className = 'sp-status-badge neutral';
      if (details) {
        details.textContent = t('imageStudio.engineNotInstalledDesc', { defaultValue: 'Téléchargez le moteur ultra-léger C++ et le modèle IA en 1 clic.' });
      }
    }
  };

  void updateStatusDisplay();

  // 1-Click Download Handler
  downloadBtn?.addEventListener('click', async () => {
    if (!downloadBtn || downloadBtn.disabled) return;
    downloadBtn.disabled = true;
    if (downloadBtnText) {
      downloadBtnText.textContent = t('imageStudio.downloadingEngine', { defaultValue: 'Téléchargement en cours...' });
    }
    if (progressContainer) {
      progressContainer.style.display = 'block';
      if (progressStatus) progressStatus.textContent = t('imageStudio.downloadingEngine', { defaultValue: 'Connexion aux serveurs de téléchargement...' });
      if (progressPct) progressPct.textContent = '0%';
      if (progressFill) progressFill.style.width = '3%';
    }

    try {
      await sdManager.downloadEngine((p) => {
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressStatus) progressStatus.textContent = p.status;
        if (progressPct) progressPct.textContent = `${Math.round(p.percentage)}%`;
        if (progressFill) progressFill.style.width = `${Math.max(3, p.percentage)}%`;
      });
      host.toast(t('imageStudio.engineReady', { defaultValue: 'Moteur Stable Diffusion prêt !' }), 'success');
      await updateStatusDisplay();
    } catch (err: any) {
      console.error('Failed to download SD engine:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Erreur lors du téléchargement';
      host.toast(msg, 'error');
      downloadBtn.disabled = false;
      if (downloadBtnText) {
        downloadBtnText.textContent = t('imageStudio.downloadEngineBtn', { defaultValue: 'Télécharger le Moteur (1-Clic)' });
      }
    } finally {
      if (progressContainer) {
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 3000);
      }
    }
  });
}
