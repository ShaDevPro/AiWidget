/**
 * SDManager — Gestionnaire d'état et d'exécution du Studio d'Images Stable Diffusion (SD.cpp).
 */
import { imageApi } from '../../api/image';
import type { SDStatus, ImageGenerationResult, SDDownloadProgress } from '../../types';
import { FooocusEngine } from './FooocusEngine';

export class SDManager {
  private static instance: SDManager;
  private cachedStatus: SDStatus | null = null;
  private isDownloading = false;

  static getInstance(): SDManager {
    if (!this.instance) {
      this.instance = new SDManager();
    }
    return this.instance;
  }

  async getStatus(forceRefresh = false): Promise<SDStatus> {
    if (!this.cachedStatus || forceRefresh) {
      try {
        this.cachedStatus = await imageApi.getSDStatus();
      } catch (err) {
        console.error('Failed to get SD status:', err);
        return {
          installed: false,
          model_installed: false,
          binary_path: '',
          model_name: '',
          available_models: [],
        };
      }
    }
    return this.cachedStatus;
  }

  async isReady(): Promise<boolean> {
    const status = await this.getStatus();
    return status.installed && status.model_installed;
  }

  async downloadEngine(onProgress?: (p: SDDownloadProgress) => void): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    let unlisten: (() => void) | null = null;
    if (onProgress) {
      unlisten = await imageApi.onDownloadProgress((p) => {
        onProgress(p);
      });
    }

    try {
      await imageApi.downloadSD();
      await this.getStatus(true);
    } finally {
      this.isDownloading = false;
      if (unlisten) {
        unlisten();
      }
    }
  }

  async generateImage(
    prompt: string,
    negativePrompt?: string,
    width = 512,
    height = 512,
    steps = 8,
    cardId?: string,
    styleId = 'cinematic',
  ): Promise<ImageGenerationResult> {
    let unlisten: (() => void) | null = null;
    let timerInterval: any = null;

    if (cardId) {
      // Start live timer
      const startTime = Date.now();
      timerInterval = setInterval(() => {
        const timerEl = document.getElementById(`${cardId}-timer`);
        if (timerEl) {
          const valEl = timerEl.querySelector('.timer-val');
          if (valEl) {
            const elapsedSec = Math.floor((Date.now() - startTime) / 1000);
            const mm = String(Math.floor(elapsedSec / 60)).padStart(2, '0');
            const ss = String(elapsedSec % 60).padStart(2, '0');
            valEl.textContent = `${mm}:${ss}`;
          }
        }
      }, 1000);

      // Listen to real-time step progress
      try {
        unlisten = await imageApi.onGenerationProgress((p) => {
          const fill = document.getElementById(`${cardId}-progress-fill`);
          const msg = document.getElementById(`${cardId}-step-msg`);
          const pct = document.getElementById(`${cardId}-step-pct`);
          const statusLabel = document.getElementById(`${cardId}-status-label`);

          if (p.percentage !== undefined && fill) {
            fill.style.width = `${Math.max(8, p.percentage)}%`;
          }
          if (p.percentage !== undefined && pct) {
            pct.textContent = `${Math.round(p.percentage)}%`;
          }
          if (p.message && msg) {
            msg.textContent = p.message;
          }
          if (p.message && statusLabel) {
            statusLabel.textContent = p.message;
          }
        });
      } catch (e) {
        console.error('Failed to attach generation progress listener:', e);
      }
    }

    // Fooocus Engine : Traduction CLIP, Template de style et Negative Prompt
    const { finalPrompt, finalNegative } = FooocusEngine.expandPrompt(prompt, styleId);
    const effectiveNegative = negativePrompt || finalNegative;

    try {
      const result = await imageApi.generateImage(finalPrompt, effectiveNegative, width, height, steps);
      result.prompt = prompt; // Préserve le prompt d'origine pour l'affichage
      return result;
    } finally {
      if (timerInterval) clearInterval(timerInterval);
      if (unlisten) unlisten();
    }
  }

  /**
   * Analyse si le message de l'utilisateur est une demande explicite de génération d'image.
   */
  isImagePrompt(text: string): { isImage: boolean; cleanPrompt: string } {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return { isImage: false, cleanPrompt: '' };

    const lower = trimmed.toLowerCase();

    // Regex patterns multilingues (FR / EN / AR)
    const patterns = [
      // Français
      /^(?:peux-tu\s+)?(?:me\s+)?(?:dessiner|dessine|g[eé]n[eé]rer?\s+une\s+image(?:\s+de)?|cr[eé]er?\s+une\s+image(?:\s+de)?|fais(?:\s+moi)?\s+une\s+image(?:\s+de)?|illustre(?:\s+moi)?|peins(?:\s+moi)?)\s*[:,\-]?\s*(.+)$/i,
      // Anglais
      /^(?:please\s+)?(?:draw|generate\s+an?\s+image\s+of|generate\s+a\s+picture\s+of|create\s+an?\s+image\s+of|make\s+an?\s+image\s+of|paint|illustrate)\s*[:,\-]?\s*(.+)$/i,
      // Arabe
      /^(?:من\s+فضلك\s+)?(?:ارسم|أنشئ\s+صورة(?:\s+لـ|\s+عن)?|ولّد\s+صورة(?:\s+لـ|\s+عن)?|صمم\s+صورة(?:\s+لـ|\s+عن)?|رسمة\s+لـ)\s*[:,\-]?\s*(.+)$/i,
    ];

    for (const pattern of patterns) {
      const match = lower.match(pattern);
      if (match && match[1]) {
        // Extraire le prompt d'origine en préservant la casse
        const promptIndex = trimmed.toLowerCase().indexOf(match[1].toLowerCase());
        const clean = promptIndex !== -1 ? trimmed.slice(promptIndex).trim() : match[1].trim();
        return { isImage: true, cleanPrompt: clean };
      }
    }

    return { isImage: false, cleanPrompt: '' };
  }
}

export const sdManager = SDManager.getInstance();
