/**
 * renderMermaidDiagrams — Hydrate pending Mermaid blocks after Markdown render.
 */
import mermaid from 'mermaid';
import { decodeMermaidSource, renderMermaidErrorBlock } from './MermaidRenderer';
import { isMermaidRenderReady, repairMermaidSource } from './repairMermaidSource';

let initialized = false;
let renderQueue: Promise<void> = Promise.resolve();

function ensureMermaidInit(): void {
  if (initialized) return;
  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.classList.contains('dark-theme');
  mermaid.initialize({
    startOnLoad: false,
    theme: isDark ? 'dark' : 'default',
    securityLevel: 'strict',
    fontFamily: 'inherit',
  });
  initialized = true;
}

export function renderMermaidDiagrams(root: ParentNode = document, force = false): void {
  const pending = root.querySelectorAll<HTMLElement>(
    '.mermaid-diagram[data-mermaid-source]:not([data-mermaid-rendered])',
  );
  if (pending.length === 0) return;

  renderQueue = renderQueue.then(async () => {
    ensureMermaidInit();
    for (const el of Array.from(pending)) {
      const encoded = el.getAttribute('data-mermaid-source') || '';
      const raw = decodeMermaidSource(encoded).trim();
      if (!raw) continue;

      if (!force && !isMermaidRenderReady(raw)) {
        el.textContent = raw;
        continue;
      }

      const source = repairMermaidSource(raw);
      el.removeAttribute('data-mermaid-source');
      el.textContent = source;
      el.setAttribute('data-mermaid-rendered', 'pending');

      try {
        const { svg } = await mermaid.render(`mmd-${el.id}`, source);
        el.innerHTML = svg;
        el.setAttribute('data-mermaid-rendered', 'true');
        if (source !== raw) {
          el.setAttribute('data-mermaid-repaired', 'true');
        }
      } catch (err) {
        el.outerHTML = renderMermaidErrorBlock(source, String(err));
      }
    }
  });
}

/** Force render after generation completes (even if edges were incomplete before repair). */
export function finalizeMermaidDiagrams(root: ParentNode = document): void {
  root.querySelectorAll<HTMLElement>('.mermaid-diagram[data-mermaid-rendered="pending"]').forEach((el) => {
    el.removeAttribute('data-mermaid-rendered');
  });
  root.querySelectorAll<HTMLElement>('.mermaid-diagram:not([data-mermaid-rendered])').forEach((el) => {
    if (!el.hasAttribute('data-mermaid-source') && el.textContent?.trim()) {
      el.setAttribute('data-mermaid-source', encodeURIComponent(el.textContent.trim()));
    }
  });
  renderMermaidDiagrams(root, true);
}
