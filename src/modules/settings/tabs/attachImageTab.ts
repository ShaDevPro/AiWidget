/**
 * attachImageTab — Gestion des événements pour l'onglet Studio d'Images (Stable Diffusion).
 */
import { t } from '../../../i18n';
import { sdManager } from '../../image/SDManager';
import type { SettingsHost } from '../SettingsHost';

export function attachImageTab(host: SettingsHost, panel: HTMLElement): void {
  const badge = panel.querySelector('#sdStatusBadge') as HTMLElement | null;
  const details = panel.querySelector('#sdEngineDetails') as HTMLElement | null;
  const progressContainer = panel.querySelector('#sdProgressContainer') as HTMLElement | null;
  const progressStatus = panel.querySelector('#sdProgressStatus') as HTMLElement | null;
  const progressPct = panel.querySelector('#sdProgressPct') as HTMLElement | null;
  const progressFill = panel.querySelector('#sdProgressFill') as HTMLElement | null;

  // Juggernaut Elements
  const badgeJuggernaut = panel.querySelector('#badgeJuggernaut') as HTMLElement | null;
  const btnJuggernaut = panel.querySelector('#btnJuggernaut') as HTMLButtonElement | null;
  const btnJuggernautText = panel.querySelector('#btnJuggernautText') as HTMLElement | null;

  // SD 1.5 Elements
  const badgeSD15 = panel.querySelector('#badgeSD15') as HTMLElement | null;
  const btnSD15 = panel.querySelector('#btnSD15') as HTMLButtonElement | null;
  const btnSD15Text = panel.querySelector('#btnSD15Text') as HTMLElement | null;

  // Refresh status function
  const updateStatusDisplay = async () => {
    const status = await sdManager.getStatus(true);
    const available = status.available_models || [];

    const hasJuggernaut = available.some((m) => m.toLowerCase().includes('juggernaut'));
    const hasSD15 = available.some((m) => m.toLowerCase().includes('stable-diffusion-v1-5') || m.toLowerCase().includes('sd-v1-5'));

    // Determine current active model
    let activeModel = host.settings.sd_active_model;
    if (!activeModel || (!available.includes(activeModel) && available.length > 0)) {
      activeModel = hasJuggernaut
        ? 'juggernautXL_v8Rundiffusion.safetensors'
        : (available[0] || 'juggernautXL_v8Rundiffusion.safetensors');
      host.settings.sd_active_model = activeModel;
      void host.saveSettings();
    }

    // Top Engine Badge
    if (badge) {
      if (status.installed && status.model_installed) {
        badge.textContent = t('imageStudio.ready', { defaultValue: 'Prêt (Installé)' });
        badge.className = 'sp-status-badge success';
        if (details) {
          details.textContent = `${t('imageStudio.modelLoaded', { defaultValue: 'Modèle actif :' })} ${activeModel}`;
        }
      } else {
        badge.textContent = t('imageStudio.notInstalled', { defaultValue: 'Non Installé' });
        badge.className = 'sp-status-badge neutral';
      }
    }

    // Juggernaut Card State
    if (badgeJuggernaut && btnJuggernaut && btnJuggernautText) {
      if (hasJuggernaut) {
        const isSelected = activeModel.toLowerCase().includes('juggernaut');
        badgeJuggernaut.textContent = isSelected ? '✓ Actif' : '✓ Installé';
        badgeJuggernaut.className = isSelected ? 'sp-status-badge success' : 'sp-status-badge info';
        btnJuggernautText.textContent = isSelected ? '✓ Modèle Actif' : 'Activer ce modèle';
        btnJuggernaut.disabled = isSelected;
        btnJuggernaut.className = isSelected ? 'sp-btn sp-btn-sm sp-btn-secondary' : 'sp-btn sp-btn-sm sp-btn-primary';
      } else {
        badgeJuggernaut.textContent = t('imageStudio.notInstalled', { defaultValue: 'Non installé' });
        badgeJuggernaut.className = 'sp-status-badge neutral';
        btnJuggernautText.textContent = t('imageStudio.downloadBtnJuggernaut', { defaultValue: '📥 Télécharger (6.6 Go)' });
        btnJuggernaut.disabled = false;
        btnJuggernaut.className = 'sp-btn sp-btn-sm sp-btn-primary';
      }
    }

    // SD 1.5 Card State
    if (badgeSD15 && btnSD15 && btnSD15Text) {
      if (hasSD15) {
        const isSelected = activeModel.toLowerCase().includes('stable-diffusion') || activeModel.toLowerCase().includes('sd-v1-5');
        badgeSD15.textContent = isSelected ? '✓ Actif' : '✓ Installé';
        badgeSD15.className = isSelected ? 'sp-status-badge success' : 'sp-status-badge info';
        btnSD15Text.textContent = isSelected ? '✓ Modèle Actif' : 'Activer ce modèle';
        btnSD15.disabled = isSelected;
        btnSD15.className = isSelected ? 'sp-btn sp-btn-sm sp-btn-secondary' : 'sp-btn sp-btn-sm sp-btn-primary';
      } else {
        badgeSD15.textContent = t('imageStudio.notInstalled', { defaultValue: 'Non installé' });
        badgeSD15.className = 'sp-status-badge neutral';
        btnSD15Text.textContent = t('imageStudio.downloadBtnSD15', { defaultValue: '📥 Télécharger (1.5 Go)' });
        btnSD15.disabled = false;
        btnSD15.className = 'sp-btn sp-btn-sm sp-btn-secondary';
      }
    }
  };

  void updateStatusDisplay();

  // Helper download handler
  const handleModelDownload = async (modelKey: 'juggernaut' | 'sd15', triggerBtn: HTMLButtonElement, btnText: HTMLElement, defaultLabel: string) => {
    if (triggerBtn.disabled) return;
    triggerBtn.disabled = true;
    btnText.textContent = t('imageStudio.downloadingEngine', { defaultValue: 'Téléchargement...' });

    if (progressContainer) {
      progressContainer.style.display = 'block';
      if (progressStatus) progressStatus.textContent = 'Connexion aux serveurs...';
      if (progressPct) progressPct.textContent = '0%';
      if (progressFill) progressFill.style.width = '3%';
    }

    try {
      await sdManager.downloadModel(modelKey, (p) => {
        if (progressContainer) progressContainer.style.display = 'block';
        if (progressStatus) progressStatus.textContent = p.status;
        if (progressPct) progressPct.textContent = `${Math.round(p.percentage)}%`;
        if (progressFill) progressFill.style.width = `${Math.max(3, p.percentage)}%`;
      });
      host.toast(t('imageStudio.engineReady', { defaultValue: 'Modèle installé avec succès !' }), 'success');
      
      // Auto-set downloaded model as active
      if (modelKey === 'juggernaut') {
        host.settings.sd_active_model = 'juggernautXL_v8Rundiffusion.safetensors';
      } else {
        host.settings.sd_active_model = 'stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf';
      }
      void host.saveSettings();
      await updateStatusDisplay();
    } catch (err: any) {
      console.error('Failed to download SD model:', err);
      const msg = typeof err === 'string' ? err : err?.message || 'Erreur lors du téléchargement';
      host.toast(msg, 'error');
      triggerBtn.disabled = false;
      btnText.textContent = defaultLabel;
    } finally {
      if (progressContainer) {
        setTimeout(() => {
          progressContainer.style.display = 'none';
        }, 3000);
      }
    }
  };

  // Juggernaut Button Click
  btnJuggernaut?.addEventListener('click', async () => {
    const status = await sdManager.getStatus();
    const available = status.available_models || [];
    const hasJuggernaut = available.some((m) => m.toLowerCase().includes('juggernaut'));

    if (hasJuggernaut) {
      // Switch active model to Juggernaut
      host.settings.sd_active_model = 'juggernautXL_v8Rundiffusion.safetensors';
      void host.saveSettings();
      host.toast('Modèle actif : Fooocus Juggernaut XL (6.6 Go)', 'info');
      await updateStatusDisplay();
    } else {
      if (btnJuggernaut && btnJuggernautText) {
        await handleModelDownload('juggernaut', btnJuggernaut, btnJuggernautText, '📥 Télécharger (6.6 Go)');
      }
    }
  });

  // SD 1.5 Button Click
  btnSD15?.addEventListener('click', async () => {
    const status = await sdManager.getStatus();
    const available = status.available_models || [];
    const hasSD15 = available.some((m) => m.toLowerCase().includes('stable-diffusion-v1-5') || m.toLowerCase().includes('sd-v1-5'));

    if (hasSD15) {
      // Switch active model to SD 1.5
      host.settings.sd_active_model = 'stable-diffusion-v1-5-pruned-emaonly-Q4_0.gguf';
      void host.saveSettings();
      host.toast('Modèle actif : Stable Diffusion 1.5 Rapide (1.5 Go)', 'info');
      await updateStatusDisplay();
    } else {
      if (btnSD15 && btnSD15Text) {
        await handleModelDownload('sd15', btnSD15, btnSD15Text, '📥 Télécharger (1.5 Go)');
      }
    }
  });

  // Open Models Folder in Windows Explorer
  const openFolderBtn = panel.querySelector('#sdOpenFolderBtn') as HTMLButtonElement | null;
  openFolderBtn?.addEventListener('click', async () => {
    try {
      await sdManager.openModelsFolder();
    } catch (err) {
      console.error('Failed to open SD folder:', err);
    }
  });
}
