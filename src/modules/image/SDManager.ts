/**
 * SDManager — Gestionnaire d'état et d'exécution du Studio d'Images Stable Diffusion (SD.cpp).
 */
import { imageApi } from '../../api/image';
import type { SDStatus, ImageGenerationResult, SDDownloadProgress } from '../../types';
import { FooocusEngine } from './FooocusEngine';
import { telemetryService } from '../telemetry/TelemetryService';

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
    return this.downloadModel('juggernaut', onProgress);
  }

  async downloadModel(modelKey: 'juggernaut' | 'sd15', onProgress?: (p: SDDownloadProgress) => void): Promise<void> {
    if (this.isDownloading) return;
    this.isDownloading = true;

    let unlisten: (() => void) | null = null;
    if (onProgress) {
      unlisten = await imageApi.onDownloadProgress((p) => {
        onProgress(p);
      });
    }

    try {
      await imageApi.downloadSDModel(modelKey);
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
    modelName?: string,
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
      const result = await imageApi.generateImage(finalPrompt, effectiveNegative, width, height, steps, undefined, modelName);
      result.prompt = prompt; // Préserve le prompt d'origine pour l'affichage
      telemetryService.trackEvent(modelName?.includes('1.5') ? 'image_sd15' : 'image_sdxl');
      return result;
    } finally {
      if (timerInterval) clearInterval(timerInterval);
      if (unlisten) unlisten();
    }
  }

  /**
   * Analyse si le message de l'utilisateur est une demande explicite de génération d'image.
   */
  /**
   * Analyse si le message de l'utilisateur est une demande explicite de génération d'image.
   */
  isImagePrompt(text: string): { isImage: boolean; cleanPrompt: string } {
    const trimmed = text.trim();
    if (!trimmed || trimmed.length < 3) return { isImage: false, cleanPrompt: '' };

    // 1. Commandes slash (/image, /photo, /draw, /sd)
    const slashMatch = trimmed.match(/^\/(?:image|img|photo|draw|sd|pic)\s+([\s\S]+)/i);
    if (slashMatch) {
      return { isImage: true, cleanPrompt: slashMatch[1].trim() };
    }

    // 2. Normalisation sans accents pour le matching d'intention
    const firstLine = trimmed.split('\n')[0].trim();
    const normalizedFirstLine = firstLine
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Supprime les diacritiques pour la regex
      .toLowerCase();

    const frRegexes = [
      /^(?:(?:peux|pourrais|pourriez)-tu\s+|(?:peux|pourrais|pourriez)-vous\s+|veuillez\s+|tu\s+|vous\s+)?(?:me\s+|nous\s+)?(?:generes?|generer|crees?|creer|fais?|faites?|faire|dessines?|dessinez|dessiner|illustres?|illustrez|illustrer|peins?|peignez|peindre|produis?|produisez|produire|sors(?:-moi)?)\s+(?:une|un|des)?\s*(?:image|photo|photographie|illustration|visuel|portrait|dessin|tableau|rendu(?:\s+3d)?|art)?\s*(?:de|d'|sur|pour|avec|representant|montrant)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:je\s+veux|je\s+souhaite|j'aimerais|il\s+me\s+faut)\s+(?:une|un|des)?\s*(?:image|photo|illustration|visuel|dessin|portrait)\s*(?:de|d'|sur|pour|avec|representant|montrant)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:image|photo|illustration|visuel|dessin|portrait|tableau)\s*(?:de|d'|sur|pour|representant|montrant)\s*[:,\-]?\s*(.*)$/i,
      /^(?:dessines?|dessinez|illustres?|illustrez|peins?|peignez)\s+(?:moi\s+)?(?:un|une|des)?\s*(.*)$/i,
    ];

    const enRegexes = [
      /^(?:can\s+you\s+|please\s+|could\s+you\s+|you\s+)?(?:generate|create|make|draw|paint|render|illustrate|produce)\s+(?:an?|the|some)?\s*(?:image|photo|picture|photograph|illustration|visual|portrait|artwork|drawing|painting|3d\s+render)?\s*(?:of|about|for|with|depicting|showing)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:i\s+want|i\s+need|i\s+would\s+like)\s+(?:an?|the|some)?\s*(?:image|photo|picture|illustration|visual|drawing)\s*(?:of|about|for|with|depicting|showing)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:image|photo|picture|illustration|artwork)\s*(?:of|about|for|showing|depicting)\s*[:,\-]?\s*(.*)$/i,
      /^(?:draw|paint|illustrate)\s+(?:me\s+)?(?:an?|the|some)?\s*(.*)$/i,
    ];

    const arRegexes = [
      /^(?:من\s+فضلك\s+|لو\s+سمحت\s+)?(?:ارسم|أنشئ|انشئ|ولد|ولّد|صمم|اعمل|أنتج|انتج|طلع|هات)\s+(?:لي\s+)?(?:صورة|رسمة|لوحة|تصميم|بوستر|بورتريه|صوره)?\s*(?:لـ|عن|في|توضح|تظهر)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:أريد|اريد|أحتاج|احتاج|حابب)\s+(?:صورة|رسمة|لوحة|تصميم)\s*(?:لـ|عن|في)?\s*[:,\-]?\s*(.*)$/i,
      /^(?:صورة|رسمة|لوحة)\s*(?:لـ|عن|في)\s*[:,\-]?\s*(.*)$/i,
    ];

    for (const regex of [...frRegexes, ...enRegexes]) {
      const match = normalizedFirstLine.match(regex);
      if (match && match[1] !== undefined && match[1].trim().length > 0) {
        const remainingLines = trimmed.split('\n').slice(1).join('\n').trim();
        const matchedSuffix = match[1].trim();
        let cleanFirstLine = '';
        if (matchedSuffix) {
          const idx = normalizedFirstLine.lastIndexOf(matchedSuffix);
          cleanFirstLine = idx !== -1 ? firstLine.slice(idx).trim() : matchedSuffix;
        }
        const cleanPrompt = remainingLines
          ? (cleanFirstLine ? cleanFirstLine + '\n' + remainingLines : remainingLines)
          : cleanFirstLine || trimmed;
        return { isImage: true, cleanPrompt };
      }
    }

    for (const regex of arRegexes) {
      const match = firstLine.match(regex);
      if (match && match[1] !== undefined && match[1].trim().length > 0) {
        const remainingLines = trimmed.split('\n').slice(1).join('\n').trim();
        const firstClean = match[1].trim();
        const cleanPrompt = remainingLines
          ? (firstClean ? firstClean + '\n' + remainingLines : remainingLines)
          : firstClean || trimmed;
        return { isImage: true, cleanPrompt };
      }
    }

    return { isImage: false, cleanPrompt: '' };
  }

  async openModelsFolder(): Promise<void> {
    try {
      await imageApi.openSDFolder();
    } catch (err) {
      console.error('Failed to open SD folder:', err);
    }
  }
}

export const sdManager = SDManager.getInstance();
