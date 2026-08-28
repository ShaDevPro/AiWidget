/**
 * ImageModal — Visualiseur plein écran haute définition (Lightbox) pour les images IA générées.
 * Supporte le zoom interactif, le déplacement (Pan & Drag), le téléchargement et la copie.
 */
import { t, isRTL, currentLanguage } from '../../i18n';

const IMAGE_MODAL_ID = 'imageModalGlobal';
const IMAGE_BACKDROP_ID = 'imageBackdropGlobal';

export class ImageModal {
  private static mounted = false;
  private static currentScale = 1;
  private static currentBase64 = '';
  private static currentPrompt = '';

  static init(): void {
    if (this.mounted || document.getElementById(IMAGE_MODAL_ID)) {
      this.mounted = true;
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = IMAGE_BACKDROP_ID;
    backdrop.className = 'image-modal-backdrop';

    const modal = document.createElement('div');
    modal.id = IMAGE_MODAL_ID;
    modal.className = 'image-modal-dialog';

    document.body.appendChild(backdrop);
    document.body.appendChild(modal);

    backdrop.addEventListener('click', () => this.close());

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen()) {
        this.close();
      }
    });

    this.mounted = true;
  }

  static isOpen(): boolean {
    const backdrop = document.getElementById(IMAGE_BACKDROP_ID);
    return backdrop?.classList.contains('active') ?? false;
  }

  static open(imageBase64: string, prompt: string): void {
    this.init();

    const backdrop = document.getElementById(IMAGE_BACKDROP_ID);
    const modal = document.getElementById(IMAGE_MODAL_ID);
    if (!backdrop || !modal) return;

    this.currentScale = 1;
    this.currentBase64 = imageBase64;
    this.currentPrompt = prompt;

    const lang = currentLanguage();
    const rtl = isRTL(lang);
    modal.setAttribute('dir', rtl ? 'rtl' : 'ltr');

    modal.innerHTML = `
      <div class="image-modal-header">
        <div class="image-modal-title">
          <span class="image-modal-icon">🎨</span>
          <h3 title="${escapeHtml(prompt)}">${escapeHtml(prompt.slice(0, 45))}${prompt.length > 45 ? '...' : ''}</h3>
        </div>
        <div class="image-modal-actions">
          <div class="image-zoom-controls">
            <button type="button" class="image-modal-btn" id="imgZoomOut" title="${t('imageStudio.zoomOut', { defaultValue: 'Zoom arrière' })}">
              <span>➖</span>
            </button>
            <span class="image-zoom-label" id="imgZoomLabel">100%</span>
            <button type="button" class="image-modal-btn" id="imgZoomIn" title="${t('imageStudio.zoomIn', { defaultValue: 'Zoom avant' })}">
              <span>➕</span>
            </button>
            <button type="button" class="image-modal-btn" id="imgZoomReset" title="${t('imageStudio.resetZoom', { defaultValue: 'Réinitialiser' })}">
              <span>🔄</span>
            </button>
          </div>
          <button type="button" class="image-modal-btn image-copy-btn" id="imgCopyBtn" title="${t('imageStudio.copyImage', { defaultValue: 'Copier l\'image' })}">
            <span>📋</span>
            <span>${t('imageStudio.copy', { defaultValue: 'Copier' })}</span>
          </button>
          <button type="button" class="image-modal-btn image-download-btn primary" id="imgDownloadBtn" title="${t('imageStudio.download', { defaultValue: 'Télécharger' })}">
            <span>📥</span>
            <span>${t('imageStudio.download', { defaultValue: 'Enregistrer' })}</span>
          </button>
          <button type="button" class="image-modal-close" id="imgClose" title="${t('common.close', { defaultValue: 'Fermer' })}">
            &times;
          </button>
        </div>
      </div>
      <div class="image-modal-body" id="imgModalBody">
        <div class="image-modal-canvas" id="imgModalCanvas">
          <img src="${imageBase64}" alt="${escapeHtml(prompt)}" class="image-modal-img" id="imgModalImg" />
        </div>
      </div>
    `;

    modal.querySelector('#imgClose')?.addEventListener('click', () => this.close());
    modal.querySelector('#imgZoomIn')?.addEventListener('click', () => this.zoom(0.25));
    modal.querySelector('#imgZoomOut')?.addEventListener('click', () => this.zoom(-0.25));
    modal.querySelector('#imgZoomReset')?.addEventListener('click', () => this.resetZoom());

    modal.querySelector('#imgDownloadBtn')?.addEventListener('click', () => this.downloadImage());
    modal.querySelector('#imgCopyBtn')?.addEventListener('click', (e) => this.copyImage(e.currentTarget as HTMLElement));

    this.setupPanAndScroll(modal);

    backdrop.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  static close(): void {
    const backdrop = document.getElementById(IMAGE_BACKDROP_ID);
    const modal = document.getElementById(IMAGE_MODAL_ID);
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  private static zoom(delta: number): void {
    const canvas = document.getElementById('imgModalCanvas');
    const label = document.getElementById('imgZoomLabel');
    if (!canvas) return;

    this.currentScale = Math.min(4.0, Math.max(0.25, this.currentScale + delta));
    canvas.style.transform = `scale(${this.currentScale})`;
    if (label) {
      label.textContent = `${Math.round(this.currentScale * 100)}%`;
    }
  }

  private static resetZoom(): void {
    const canvas = document.getElementById('imgModalCanvas');
    const label = document.getElementById('imgZoomLabel');
    if (!canvas) return;

    this.currentScale = 1;
    canvas.style.transform = 'scale(1)';
    if (label) {
      label.textContent = '100%';
    }
  }

  private static async downloadImage(): Promise<void> {
    const safeName = this.currentPrompt.slice(0, 30).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_') || 'image';
    const filename = `AI_Widget_${safeName}_${Date.now()}.png`;

    try {
      if ('__TAURI__' in window) {
        const { save } = await import('@tauri-apps/api/dialog');
        const { writeBinaryFile } = await import('@tauri-apps/api/fs');
        const path = await save({
          defaultPath: filename,
          filters: [{ name: 'Images PNG', extensions: ['png'] }],
        });
        if (path) {
          const base64Data = this.currentBase64.replace(/^data:image\/png;base64,/, '');
          const binaryString = window.atob(base64Data);
          const len = binaryString.length;
          const bytes = new Uint8Array(len);
          for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          await writeBinaryFile(path, bytes);
        }
      } else {
        const a = document.createElement('a');
        a.href = this.currentBase64;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => document.body.removeChild(a), 200);
      }
    } catch (err) {
      console.error('Download image failed:', err);
    }
  }

  private static async copyImage(btn: HTMLElement): Promise<void> {
    try {
      const resp = await fetch(this.currentBase64);
      const blob = await resp.blob();
      await navigator.clipboard.write([
        new ClipboardItem({
          [blob.type]: blob,
        }),
      ]);
      const originalHtml = btn.innerHTML;
      btn.innerHTML = `<span>✓</span> <span>${t('chat.copied', { defaultValue: 'Copié !' })}</span>`;
      setTimeout(() => {
        btn.innerHTML = originalHtml;
      }, 2000);
    } catch (err) {
      console.error('Copy image failed:', err);
    }
  }

  private static setupPanAndScroll(modal: HTMLElement): void {
    const body = modal.querySelector<HTMLElement>('#imgModalBody');
    if (!body) return;

    let isDown = false;
    let startX = 0;
    let startY = 0;
    let scrollLeft = 0;
    let scrollTop = 0;

    body.addEventListener('mousedown', (e) => {
      isDown = true;
      body.classList.add('panning');
      startX = e.pageX - body.offsetLeft;
      startY = e.pageY - body.offsetTop;
      scrollLeft = body.scrollLeft;
      scrollTop = body.scrollTop;
    });

    body.addEventListener('mouseleave', () => {
      isDown = false;
      body.classList.remove('panning');
    });

    body.addEventListener('mouseup', () => {
      isDown = false;
      body.classList.remove('panning');
    });

    body.addEventListener('mousemove', (e) => {
      if (!isDown) return;
      e.preventDefault();
      const x = e.pageX - body.offsetLeft;
      const y = e.pageY - body.offsetTop;
      const walkX = (x - startX) * 1.5;
      const walkY = (y - startY) * 1.5;
      body.scrollLeft = scrollLeft - walkX;
      body.scrollTop = scrollTop - walkY;
    });
  }
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
