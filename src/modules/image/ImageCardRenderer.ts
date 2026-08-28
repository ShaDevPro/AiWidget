/**
 * ImageCardRenderer — Rendu de cartes multimédia pour les images IA générées (Stable Diffusion).
 * Design haute fidélité avec support des thèmes clair/sombre et multilingue RTL/LTR.
 */
import { t } from '../../i18n';
import type { ImageGenerationResult } from '../../types';

let imageCounter = 0;

export function generateImageCardId(): string {
  imageCounter += 1;
  return `sd-card-${Date.now()}-${imageCounter}`;
}

export class ImageCardRenderer {
  /** Carte d'état en cours de génération */
  static renderGeneratingCard(prompt: string, cardId: string): string {
    const safePrompt = escapeHtml(prompt);
    return `
      <div class="ai-image-card generating" id="${cardId}" data-image-card="${cardId}">
        <div class="ai-image-toolbar">
          <div class="ai-image-badge">
            <span class="ai-image-spinner"></span>
            <span class="ai-image-label" id="${cardId}-status-label">${t('imageStudio.generating', { defaultValue: 'Génération de l\'image en cours...' })}</span>
          </div>
          <div class="ai-image-live-timer" id="${cardId}-timer" data-start-time="${Date.now()}">
            <span>⏱️</span>
            <span class="timer-val">00:00</span>
          </div>
        </div>
        <div class="ai-image-skeleton">
          <div class="ai-image-shimmer"></div>
          <div class="ai-image-skeleton-content">
            <span class="ai-image-skeleton-icon">🎨</span>
            <p class="ai-image-skeleton-prompt">"${safePrompt}"</p>
            
            <!-- Live Progress Bar -->
            <div class="ai-image-step-progress-box">
              <div class="ai-image-step-progress-bar">
                <div class="ai-image-step-progress-fill" id="${cardId}-progress-fill" style="width: 8%;"></div>
              </div>
              <div class="ai-image-step-progress-text">
                <span id="${cardId}-step-msg">${t('imageStudio.generatingHint', { defaultValue: 'Calcul neuronal en local (SD.cpp)...' })}</span>
                <span id="${cardId}-step-pct">8%</span>
              </div>
            </div>

            <!-- Hardware & Performance Notice -->
            <div class="ai-image-hardware-notice">
              <span class="ai-image-notice-icon">ℹ️</span>
              <span>${t('imageStudio.hardwareNotice', { defaultValue: 'La génération locale peut prendre de quelques secondes à plusieurs minutes selon la vitesse et la puissance de votre ordinateur (CPU / GPU).' })}</span>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /** Carte finale de l'image générée */
  static renderImageCard(result: ImageGenerationResult, cardId: string): string {
    const safePrompt = escapeHtml(result.prompt);
    const encodedPrompt = encodeURIComponent(result.prompt);
    const durationSec = (result.duration_ms / 1000).toFixed(1);

    return `
      <div class="ai-image-card ready" id="${cardId}" data-image-card="${cardId}">
        <div class="ai-image-toolbar">
          <div class="ai-image-badge">
            <span class="ai-image-icon">🎨</span>
            <span class="ai-image-label">${t('imageStudio.title', { defaultValue: 'Image IA' })}</span>
            <span class="ai-image-time">${durationSec}s</span>
          </div>
          <div class="ai-image-actions">
            <button type="button" class="ai-image-btn" data-expand-image="${cardId}" title="${t('imageStudio.expand', { defaultValue: 'Agrandir' })}">
              <span aria-hidden="true">🔍</span>
              <span>${t('imageStudio.expand', { defaultValue: 'Agrandir' })}</span>
            </button>
            <button type="button" class="ai-image-btn" data-copy-image="${cardId}" title="${t('imageStudio.copyImage', { defaultValue: 'Copier' })}">
              <span aria-hidden="true">📋</span>
            </button>
            <button type="button" class="ai-image-btn primary" data-download-image="${cardId}" title="${t('imageStudio.download', { defaultValue: 'Télécharger' })}">
              <span aria-hidden="true">📥</span>
            </button>
          </div>
        </div>
        <div class="ai-image-preview-container" data-expand-image="${cardId}" title="${t('imageStudio.clickToExpand', { defaultValue: 'Cliquer pour ouvrir en plein écran' })}">
          <img src="${result.image_base64}" alt="${safePrompt}" class="ai-image-preview" data-image-src="${cardId}" />
          <div class="ai-image-preview-overlay">
            <span class="ai-image-preview-badge">🔍 ${t('imageStudio.clickToExpand', { defaultValue: 'Agrandir l\'image' })}</span>
          </div>
        </div>
        <div class="ai-image-footer">
          <p class="ai-image-prompt" title="${safePrompt}">
            <span class="ai-image-prompt-icon">💡</span>
            <span>${safePrompt}</span>
          </p>
          <button type="button" class="ai-image-regen-btn" data-regen-image="${encodedPrompt}" title="${t('imageStudio.regenerate', { defaultValue: 'Régénérer cette image' })}">
            <span>🔄</span>
            <span>${t('imageStudio.regenerate', { defaultValue: 'Régénérer' })}</span>
          </button>
        </div>
      </div>
    `;
  }

  /** Carte d'invitation au téléchargement du moteur 1-clic */
  static renderEngineNotReadyCard(): string {
    return `
      <div class="ai-image-card setup-needed">
        <div class="ai-image-setup-box">
          <div class="ai-image-setup-icon">🎨</div>
          <div class="ai-image-setup-info">
            <h4>${t('imageStudio.engineNotInstalledTitle', { defaultValue: 'Studio d\'Image Local Non Installé' })}</h4>
            <p>${t('imageStudio.engineNotInstalledDesc', { defaultValue: 'Pour générer des images 100% en local et sans cloud, téléchargez le moteur léger Stable Diffusion (SD.cpp).' })}</p>
          </div>
          <button type="button" class="ai-image-install-btn" data-install-sd="true">
            <span>📥</span>
            <span>${t('imageStudio.downloadEngineBtn', { defaultValue: 'Télécharger le Moteur (1-Clic)' })}</span>
          </button>
        </div>
      </div>
    `;
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
