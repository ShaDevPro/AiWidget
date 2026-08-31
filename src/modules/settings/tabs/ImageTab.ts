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

      <!-- Models Selection & Download Section -->
      <div class="sp-card" id="sdEngineStatusCard">
        <div class="sp-card-header">
          <span class="sp-card-icon">🧠</span>
          <div class="sp-card-title-group">
            <h3>${t('imageStudio.modelsSectionTitle', { defaultValue: 'Modèles d\'Images IA Disponibles' })}</h3>
            <span class="sp-status-badge" id="sdStatusBadge">${t('common.checking', { defaultValue: 'Vérification...' })}</span>
          </div>
        </div>
        <div class="sp-card-body">
          <!-- Hardware Profile Card (Apple / Fluent UI Style) -->
          <div id="sdHardwareBanner" style="display: none; border-radius: 10px; padding: 0.9rem 1.1rem; margin-bottom: 1.25rem; background: var(--bg-card, rgba(255,255,255,0.04)); border: 1px solid rgba(120, 120, 120, 0.15); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
            <div style="display: flex; align-items: center; justify-content: space-between; gap: 1rem; flex-wrap: wrap;">
              <div style="display: flex; align-items: center; gap: 0.75rem;">
                <div id="sdHwIconWrapper" style="width: 38px; height: 38px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 1.25rem; background: rgba(99, 102, 241, 0.1); color: #6366f1;">
                  💻
                </div>
                <div>
                  <div style="display: flex; align-items: center; gap: 0.5rem;">
                    <span id="sdHwName" style="font-weight: 700; font-size: 0.95rem; color: var(--text-primary, #0f172a);">Intel(R) UHD Graphics 630</span>
                    <span id="sdHwTypeBadge" class="sp-status-badge info" style="font-size: 0.7rem; padding: 1px 6px;">Mode CPU</span>
                  </div>
                  <div id="sdHwReason" style="font-size: 0.8rem; color: var(--text-muted, #64748b); margin-top: 2px;">
                    SD 1.5 Rapide (15–20s) recommandé pour des performances optimales.
                  </div>
                </div>
              </div>
              <div id="sdHwRecBadge" style="background: rgba(16, 185, 129, 0.12); color: #059669; border: 1px solid rgba(16, 185, 129, 0.25); border-radius: 20px; padding: 4px 12px; font-size: 0.75rem; font-weight: 600; display: flex; align-items: center; gap: 4px;">
                ⚡ SD 1.5 Recommandé
              </div>
            </div>
          </div>

          <p id="sdEngineDetails" class="sp-card-text" style="margin-bottom: 1rem;">
            ${t('imageStudio.modelsDesc', { defaultValue: 'Sélectionnez le modèle actif ou téléchargez un modèle adapté aux capacités de votre ordinateur.' })}
          </p>

          <!-- Grid of Available Models -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1rem;">
            
            <!-- Card 1: Fooocus Juggernaut XL v8 (SDXL - 6.6 Go) -->
            <div class="sd-model-card" id="cardModelJuggernaut" style="border: 1px solid rgba(120, 120, 120, 0.2); border-radius: 8px; padding: 1rem; background: var(--bg-card-subtle, rgba(255,255,255,0.03)); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700;">👑 Fooocus Juggernaut XL</h4>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <span id="recBadgeJuggernaut" style="display: none; background: rgba(99, 102, 241, 0.2); color: #818cf8; padding: 2px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">⭐ Recommandé</span>
                    <span style="background: rgba(99, 102, 241, 0.15); color: #818cf8; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">6.6 Go</span>
                  </div>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.75rem 0;">
                  ${t('imageStudio.juggernautDesc', { defaultValue: 'Modèle SDXL officiel Fooocus. Photoréalisme extrême, textures de peau HD et qualité cinéma.' })}
                </p>
                <div style="font-size: 0.75rem; color: var(--text-secondary, #cbd5e1); margin-bottom: 0.75rem;">
                  ⚙️ <em>${t('imageStudio.juggernautReq', { defaultValue: 'Recommandé : GPU Dédié (6+ Go VRAM)' })}</em>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span id="badgeJuggernaut" class="sp-status-badge neutral" style="font-size: 0.75rem;">...</span>
                <button type="button" class="sp-btn sp-btn-sm sp-btn-primary" id="btnJuggernaut" style="font-size: 0.8rem; padding: 4px 10px;">
                  <span id="btnJuggernautText">${t('imageStudio.downloadBtnJuggernaut', { defaultValue: '📥 Télécharger (6.6 Go)' })}</span>
                </button>
              </div>
            </div>

            <!-- Card 2: SD 1.5 Rapide (GGUF Q4 - 1.5 Go) -->
            <div class="sd-model-card" id="cardModelSD15" style="border: 1px solid rgba(120, 120, 120, 0.2); border-radius: 8px; padding: 1rem; background: var(--bg-card-subtle, rgba(255,255,255,0.03)); display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                  <h4 style="margin: 0; font-size: 0.95rem; font-weight: 700;">⚡ Stable Diffusion 1.5 Rapide</h4>
                  <div style="display: flex; gap: 4px; align-items: center;">
                    <span id="recBadgeSD15" style="display: none; background: rgba(16, 185, 129, 0.2); color: #34d399; padding: 2px 6px; border-radius: 6px; font-size: 0.7rem; font-weight: 600;">⭐ Recommandé</span>
                    <span style="background: rgba(16, 185, 129, 0.15); color: #34d399; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600;">1.5 Go</span>
                  </div>
                </div>
                <p style="font-size: 0.8rem; color: var(--text-muted, #94a3b8); margin: 0 0 0.75rem 0;">
                  ${t('imageStudio.sd15Desc', { defaultValue: 'Modèle léger quantifié GGUF. Génération ultra-rapide (15-20s), idéal pour ordinateurs portables et petits processeurs.' })}
                </p>
                <div style="font-size: 0.75rem; color: var(--text-secondary, #cbd5e1); margin-bottom: 0.75rem;">
                  ⚙️ <em>${t('imageStudio.sd15Req', { defaultValue: 'Recommandé : Mode CPU / Tout PC (15-20s)' })}</em>
                </div>
              </div>
              <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem;">
                <span id="badgeSD15" class="sp-status-badge neutral" style="font-size: 0.75rem;">...</span>
                <button type="button" class="sp-btn sp-btn-sm sp-btn-secondary" id="btnSD15" style="font-size: 0.8rem; padding: 4px 10px;">
                  <span id="btnSD15Text">${t('imageStudio.downloadBtnSD15', { defaultValue: '📥 Télécharger (1.5 Go)' })}</span>
                </button>
              </div>
            </div>

          </div>

          <!-- Actions Row -->
          <div class="sp-actions-row" style="margin-top: 1rem; display: flex; justify-content: flex-end; gap: 0.5rem;">
            <button type="button" class="sp-btn sp-btn-secondary" id="sdOpenFolderBtn" title="Ouvrir le dossier local des modèles">
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
