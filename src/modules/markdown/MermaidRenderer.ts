/**
 * MermaidRenderer — Carte compacte avec visualiseur plein écran interactif (MermaidModal).
 */
import { t, isRTL, currentLanguage } from '../../i18n';

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

let diagramCounter = 0;

export function renderMermaidBlock(code: string): string {
  diagramCounter += 1;
  const id = `mermaid-${Date.now()}-${diagramCounter}`;
  const encoded = encodeURIComponent(code.trim());
  return `
    <div class="mermaid-card" data-mermaid-card="${id}">
      <div class="mermaid-toolbar">
        <div class="mermaid-toolbar-left">
          <span class="mermaid-label">${t('chat.diagramLabel', { defaultValue: 'Diagramme' })}</span>
        </div>
        <div class="mermaid-toolbar-actions">
          <button type="button" class="mermaid-action-btn mermaid-expand-btn" data-expand-mermaid="${id}" title="${t('chat.expandDiagram', { defaultValue: 'Agrandir le diagramme' })}">
            <span aria-hidden="true">🔍</span>
            <span>${t('chat.expand', { defaultValue: 'Agrandir' })}</span>
          </button>
          <button type="button" class="mermaid-action-btn mermaid-copy-btn" data-copy-mermaid="${encoded}" title="${t('chat.copyDiagram', { defaultValue: 'Copier le code' })}">
            <span aria-hidden="true">📋</span>
            <span>${t('chat.copyDiagram', { defaultValue: 'Copier' })}</span>
          </button>
        </div>
      </div>
      <div class="mermaid-preview-container" data-expand-mermaid="${id}" title="${t('chat.viewFullDiagram', { defaultValue: 'Cliquer pour agrandir le diagramme' })}">
        <div class="mermaid-diagram-compact">
          <div class="mermaid-diagram" id="${id}" data-mermaid-source="${encoded}"></div>
        </div>
        <div class="mermaid-preview-overlay">
          <span class="mermaid-preview-badge">🔍 ${t('chat.viewFullDiagram', { defaultValue: 'Cliquer pour agrandir' })}</span>
        </div>
      </div>
    </div>
  `;
}

export function decodeMermaidSource(encoded: string): string {
  try {
    return decodeURIComponent(encoded);
  } catch {
    return encoded;
  }
}

/** Fallback when Mermaid fails to parse. */
export function renderMermaidErrorBlock(code: string, message: string): string {
  return `
    <div class="mermaid-error">
      <p class="mermaid-error-title">${escapeHtml(t('chat.diagramError', { defaultValue: 'Impossible de rendre ce diagramme Mermaid' }))}</p>
      <pre class="mermaid-error-source">${escapeHtml(code)}</pre>
      <p class="mermaid-error-detail">${escapeHtml(message)}</p>
    </div>
  `;
}

const MERMAID_MODAL_ID = 'mermaidModalGlobal';
const MERMAID_BACKDROP_ID = 'mermaidBackdropGlobal';

export class MermaidModal {
  private static mounted = false;
  private static currentScale = 1;
  private static currentSource = '';

  static init(): void {
    if (this.mounted || document.getElementById(MERMAID_MODAL_ID)) {
      this.mounted = true;
      return;
    }

    const backdrop = document.createElement('div');
    backdrop.id = MERMAID_BACKDROP_ID;
    backdrop.className = 'mermaid-modal-backdrop';

    const modal = document.createElement('div');
    modal.id = MERMAID_MODAL_ID;
    modal.className = 'mermaid-modal-dialog';

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
    const backdrop = document.getElementById(MERMAID_BACKDROP_ID);
    return backdrop?.classList.contains('active') ?? false;
  }

  static open(svgHtml: string, rawSource: string, title?: string): void {
    this.init();

    const backdrop = document.getElementById(MERMAID_BACKDROP_ID);
    const modal = document.getElementById(MERMAID_MODAL_ID);
    if (!backdrop || !modal) return;

    this.currentScale = 1;
    this.currentSource = rawSource;

    const lang = currentLanguage();
    const rtl = isRTL(lang);
    modal.setAttribute('dir', rtl ? 'rtl' : 'ltr');

    const modalTitle = title || t('chat.diagramModalTitle', { defaultValue: 'Aperçu du Diagramme' });

    modal.innerHTML = `
      <div class="mermaid-modal-header">
        <div class="mermaid-modal-title">
          <span class="mermaid-modal-icon">📊</span>
          <h3>${modalTitle}</h3>
        </div>
        <div class="mermaid-modal-actions">
          <div class="mermaid-zoom-controls">
            <button type="button" class="mermaid-modal-btn" id="mmdZoomOut" title="${t('chat.zoomOut', { defaultValue: 'Zoom arrière' })}">
              <span>➖</span>
            </button>
            <span class="mermaid-zoom-label" id="mmdZoomLabel">100%</span>
            <button type="button" class="mermaid-modal-btn" id="mmdZoomIn" title="${t('chat.zoomIn', { defaultValue: 'Zoom avant' })}">
              <span>➕</span>
            </button>
            <button type="button" class="mermaid-modal-btn" id="mmdZoomReset" title="${t('chat.resetZoom', { defaultValue: 'Réinitialiser' })}">
              <span>🔄</span>
            </button>
          </div>
          <button type="button" class="mermaid-modal-btn mermaid-copy-btn-modal" id="mmdCopyCode" title="${t('chat.copyDiagram', { defaultValue: 'Copier' })}">
            <span>📋</span>
            <span>${t('chat.copyDiagram', { defaultValue: 'Copier' })}</span>
          </button>
          <button type="button" class="mermaid-modal-close" id="mmdClose" title="${t('common.close', { defaultValue: 'Fermer' })}">
            &times;
          </button>
        </div>
      </div>
      <div class="mermaid-modal-body" id="mmdModalBody">
        <div class="mermaid-modal-canvas" id="mmdModalCanvas">
          ${svgHtml}
        </div>
      </div>
    `;

    modal.querySelector('#mmdClose')?.addEventListener('click', () => this.close());
    modal.querySelector('#mmdZoomIn')?.addEventListener('click', () => this.zoom(0.2));
    modal.querySelector('#mmdZoomOut')?.addEventListener('click', () => this.zoom(-0.2));
    modal.querySelector('#mmdZoomReset')?.addEventListener('click', () => this.resetZoom());

    modal.querySelector('#mmdCopyCode')?.addEventListener('click', async (e) => {
      const btn = e.currentTarget as HTMLElement;
      try {
        await navigator.clipboard.writeText(this.currentSource);
        const originalText = btn.innerHTML;
        btn.innerHTML = `<span>✓</span> <span>${t('chat.copied', { defaultValue: 'Copié !' })}</span>`;
        setTimeout(() => {
          btn.innerHTML = originalText;
        }, 1800);
      } catch (err) {
        console.error('Failed to copy diagram:', err);
      }
    });

    this.setupPanAndScroll(modal);

    backdrop.classList.add('active');
    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  static close(): void {
    const backdrop = document.getElementById(MERMAID_BACKDROP_ID);
    const modal = document.getElementById(MERMAID_MODAL_ID);
    if (backdrop) backdrop.classList.remove('active');
    if (modal) modal.classList.remove('active');
    document.body.style.overflow = '';
  }

  private static zoom(delta: number): void {
    const canvas = document.getElementById('mmdModalCanvas');
    const label = document.getElementById('mmdZoomLabel');
    if (!canvas) return;

    this.currentScale = Math.min(3.0, Math.max(0.4, this.currentScale + delta));
    canvas.style.transform = `scale(${this.currentScale})`;
    if (label) {
      label.textContent = `${Math.round(this.currentScale * 100)}%`;
    }
  }

  private static resetZoom(): void {
    const canvas = document.getElementById('mmdModalCanvas');
    const label = document.getElementById('mmdZoomLabel');
    if (!canvas) return;

    this.currentScale = 1;
    canvas.style.transform = 'scale(1)';
    if (label) {
      label.textContent = '100%';
    }
  }

  private static setupPanAndScroll(modal: HTMLElement): void {
    const body = modal.querySelector<HTMLElement>('#mmdModalBody');
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
