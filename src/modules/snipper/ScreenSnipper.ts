/**
 * ScreenSnipper — Module de capture d'écran visuelle en 1 clic pour l'analyse IA.
 * Permet de capturer instantanément l'écran complet ou une fenêtre et de l'attacher
 * au chat pour extraction OCR, analyse de code, de tableaux ou de graphiques.
 */
import { t } from '../../i18n';
import type { DocumentManager } from '../document/DocumentManager';
import type { ToastService } from '../../ui/ToastService';

export class ScreenSnipper {
  private static instance: ScreenSnipper | null = null;
  private documentManager: DocumentManager | null = null;
  private toastService: ToastService | null = null;
  private isCapturing = false;

  public static getInstance(): ScreenSnipper {
    if (!ScreenSnipper.instance) {
      ScreenSnipper.instance = new ScreenSnipper();
    }
    return ScreenSnipper.instance;
  }

  public init(docManager: DocumentManager, toast: ToastService): void {
    this.documentManager = docManager;
    this.toastService = toast;
  }

  /**
   * Déclenche la capture d'écran (1 clic).
   */
  public async captureScreen(): Promise<boolean> {
    if (this.isCapturing) return false;
    this.isCapturing = true;

    try {
      // 1. Tenter la capture haute résolution via l'API getDisplayMedia du système
      if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
        const stream = await navigator.mediaDevices.getDisplayMedia({
          video: {
            displaySurface: 'monitor',
          } as any,
          audio: false
        });

        const video = document.createElement('video');
        video.srcObject = stream;
        video.play();

        await new Promise((resolve) => {
          video.onloadedmetadata = () => resolve(true);
        });

        // Attendre que le premier flux d'image soit prêt
        await new Promise((r) => setTimeout(r, 150));

        const canvas = document.createElement('canvas');
        canvas.width = video.videoWidth || 1920;
        canvas.height = video.videoHeight || 1080;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        }

        // Arrêter immédiatement le flux vidéo
        stream.getTracks().forEach((track) => track.stop());

        // Convertir en Blob PNG
        const blob = await new Promise<Blob | null>((resolve) => {
          canvas.toBlob((b) => resolve(b), 'image/png');
        });

        if (blob && this.documentManager) {
          const timestamp = new Date().toLocaleTimeString().replace(/:/g, '-');
          const fileName = `Capture_Ecran_${timestamp}.png`;
          await this.documentManager.attachBlobImage(blob, fileName);

          if (this.toastService) {
            this.toastService.show(t('chat.snipSuccess', { defaultValue: '📸 Capture d\'écran attachée ! Posez votre question.' }), 'success');
          }

          // Focus sur la zone de texte
          const input = document.getElementById('chatInput') as HTMLTextAreaElement | null;
          if (input) {
            input.focus();
            if (!input.value) {
              input.placeholder = t('chat.snipPlaceholder', { defaultValue: 'Ex: Que contient cette image ? Résous cette erreur...' });
            }
          }
          return true;
        }
      }
    } catch (err: any) {
      // Si l'utilisateur annule la sélection de l'écran, ne pas afficher d'erreur
      if (err?.name === 'NotAllowedError') {
        return false;
      }
      console.warn('[ScreenSnipper] getDisplayMedia error, falling back to clipboard mode:', err);
    } finally {
      this.isCapturing = false;
    }

    // Fallback : Mode Presse-papiers Windows (Win + Shift + S)
    if (this.toastService) {
      this.toastService.show(t('chat.snipHint', { defaultValue: '💡 Faites Win + Shift + S pour capturer une zone, puis Ctrl + V dans le chat.' }), 'info');
    }
    return false;
  }
}

export const screenSnipper = ScreenSnipper.getInstance();
