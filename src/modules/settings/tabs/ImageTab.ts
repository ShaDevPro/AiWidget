/**
 * ImageTab — Onglet des paramètres du Studio d'Images Local (Stable Diffusion SD.cpp).
 */
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function renderImageTab(host: SettingsHost): string {
  return `
    <div class="sp-tab-content active" id="tab-image">
      <div class="sp-section-header">
        <h2>${t('imageStudio.tabTitle', { defaultValue: 'Studio d\'Images (Stable Diffusion)' })}</h2>
        <p class="sp-section-desc">${t('imageStudio.tabDesc', { defaultValue: 'Génération et création d\'images 100% en local et hors-ligne, sans abonnement cloud.' })}</p>
      </div>

      <!-- Engine Status Box -->
      <div class="sp-card" id="sdEngineStatusCard">
        <div class="sp-card-header">
          <span class="sp-card-icon">🎨</span>
          <div class="sp-card-title-group">
            <h3>${t('imageStudio.engineTitle', { defaultValue: 'Moteur Local SD.cpp' })}</h3>
            <span class="sp-status-badge" id="sdStatusBadge">${t('common.checking', { defaultValue: 'Vérification...' })}</span>
          </div>
        </div>
        <div class="sp-card-body">
          <p id="sdEngineDetails" class="sp-card-text">
            ${t('imageStudio.engineDetails', { defaultValue: 'Moteur C++ haute performance avec modèles quantifiés GGUF.' })}
          </p>

          <!-- Actions Row -->
          <div class="sp-actions-row" style="margin-top: 1rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="sp-btn sp-btn-primary" id="sdDownloadBtn" data-install-sd="true">
              <span>📥</span>
              <span id="sdDownloadBtnText">${t('imageStudio.downloadEngineBtn', { defaultValue: 'Télécharger le Moteur (1-Clic)' })}</span>
            </button>
            <button type="button" class="sp-btn sp-btn-secondary" id="sdOpenFolderBtn" title="Ouvrir le dossier pour ajouter vos modèles SDXL / Juggernaut XL">
              <span>📁</span>
              <span>${t('imageStudio.openFolderBtn', { defaultValue: 'Dossier des Modèles' })}</span>
            </button>
          </div>

          <!-- Live Progress Bar -->
          <div class="sp-progress-container" id="sdProgressContainer" style="display: none; margin-top: 1rem;">
            <div class="sp-progress-info">
              <span id="sdProgressStatus" class="sp-progress-label">${t('imageStudio.downloadingEngine', { defaultValue: 'Téléchargement...' })}</span>
              <span id="sdProgressPct" class="sp-progress-val">0%</span>
            </div>
            <div class="sp-progress-bar">
              <div class="sp-progress-fill" id="sdProgressFill" style="width: 0%;"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- Default Generation Parameters (Fooocus Engine) -->
      <div class="sp-card" style="margin-top: 1.25rem;">
        <div class="sp-card-header">
          <span class="sp-card-icon">🎨</span>
          <div class="sp-card-title-group">
            <h3>${t('imageStudio.paramsTitle', { defaultValue: 'Moteur de Style Fooocus & Rendu' })}</h3>
          </div>
        </div>
        <div class="sp-card-body">
          <div class="sp-form-grid">
            <div class="sp-form-group">
              <label for="sdDefaultStyle">Style Artistique Fooocus</label>
              <select id="sdDefaultStyle" class="sp-select">
                <option value="cinematic" selected>🎬 Fooocus Cinematic (Cinéma HD)</option>
                <option value="photograph">📸 Photographie Réaliste (DSLR 50mm)</option>
                <option value="masterpiece">🎨 Fooocus Masterpiece (Chef-d'œuvre)</option>
                <option value="enhance">✨ Fooocus Auto-Enhance (Équilibré)</option>
                <option value="anime">🌸 Anime & Manga (Studio Ghibli / Makoto)</option>
                <option value="model3d">🎮 Rendu 3D Octane / Unreal Engine</option>
                <option value="digitalArt">🖌️ Concept Art & Digital Painting</option>
                <option value="fantasy">🧚 Fantaisie Féerique & Magie</option>
                <option value="isometric">📐 Isométrique Miniature 3D</option>
                <option value="origami">📄 Origami & Papier Découpé</option>
              </select>
            </div>
            <div class="sp-form-group">
              <label for="sdDefaultRes">${t('imageStudio.resolution', { defaultValue: 'Format & Ratio' })}</label>
              <select id="sdDefaultRes" class="sp-select">
                <option value="512x512" selected>Carré Standard (512 x 512 - 1:1)</option>
                <option value="640x384">Paysage Cinéma (640 x 384 - 16:9)</option>
                <option value="384x640">Portrait / Story (384 x 640 - 9:16)</option>
                <option value="576x448">Photo Classique (576 x 448 - 4:3)</option>
                <option value="768x768">HD Équilibré (768 x 768 - 1:1 HD)</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <!-- Privacy & Offline Banner -->
      <div class="sp-info-banner" style="margin-top: 1.25rem;">
        <span class="sp-info-icon">🔒</span>
        <div class="sp-info-text">
          <strong>${t('imageStudio.privacyTitle', { defaultValue: '100% Souverain & Privé' })}</strong>
          <p>${t('imageStudio.privacyDesc', { defaultValue: 'Toutes les images sont synthétisées directement sur votre processeur ou carte graphique. Aucune donnée n\'est transmise à l\'extérieur.' })}</p>
        </div>
      </div>
    </div>
  `;
}
