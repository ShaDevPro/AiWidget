/**
 * MermaidRenderer — ChatGPT-style diagram blocks from ```mermaid fences.
 */
import { t } from '../../i18n';

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
        <span class="mermaid-label">${t('chat.diagramLabel')}</span>
        <button type="button" class="mermaid-copy-btn" data-copy-mermaid="${encoded}" title="${t('chat.copyDiagram')}">
          <span aria-hidden="true">📋</span>
          <span>${t('chat.copyDiagram')}</span>
        </button>
      </div>
      <div class="mermaid-scroll">
        <div class="mermaid-diagram" id="${id}" data-mermaid-source="${encoded}"></div>
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
      <p class="mermaid-error-title">${escapeHtml(t('chat.diagramError'))}</p>
      <pre class="mermaid-error-source">${escapeHtml(code)}</pre>
      <p class="mermaid-error-detail">${escapeHtml(message)}</p>
    </div>
  `;
}
