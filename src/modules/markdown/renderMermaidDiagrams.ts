/**
 * renderMermaidDiagrams — Hydrate pending Mermaid blocks after Markdown render.
 */
import mermaid from 'mermaid';
import { decodeMermaidSource, renderMermaidErrorBlock } from './MermaidRenderer';
import { isMermaidRenderReady, repairMermaidSource, repairMermaidFallback } from './repairMermaidSource';

let currentTheme: 'dark' | 'light' | null = null;
let renderQueue: Promise<void> = Promise.resolve();

function ensureMermaidInit(): void {
  const isDark =
    document.documentElement.getAttribute('data-theme') === 'dark' ||
    document.body.classList.contains('dark-theme');
  const targetTheme = isDark ? 'dark' : 'light';

  if (currentTheme === targetTheme) return;

  if (isDark) {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      themeVariables: {
        darkMode: true,
        background: 'transparent',
        mainBkg: '#1e293b',
        primaryColor: '#312e81',
        primaryTextColor: '#f8fafc',
        primaryBorderColor: '#6366f1',
        lineColor: '#818cf8',
        secondaryColor: '#1e1b4b',
        secondaryTextColor: '#e2e8f0',
        secondaryBorderColor: '#4f46e5',
        tertiaryColor: '#0f172a',
        tertiaryTextColor: '#cbd5e1',
        tertiaryBorderColor: '#475569',
        noteBkgColor: '#1e293b',
        noteTextColor: '#e2e8f0',
        noteBorderColor: '#6366f1',
        nodeBorder: '#6366f1',
        clusterBkg: '#0f172a',
        clusterBorder: '#4338ca',
        defaultLinkColor: '#818cf8',
        titleColor: '#f1f5f9',
        edgeLabelBackground: '#1e293b',
        actorBorder: '#6366f1',
        actorBkg: '#1e293b',
        actorTextColor: '#f8fafc',
        actorLineColor: '#818cf8',
        signalColor: '#818cf8',
        signalTextColor: '#f8fafc',
        labelBoxBkgColor: '#1e293b',
        labelBoxBorderColor: '#6366f1',
        labelTextColor: '#f8fafc',
        loopTextColor: '#f8fafc',
        activationBorderColor: '#6366f1',
        activationBkgColor: '#312e81',
        sequenceNumberColor: '#ffffff',
        sectionBkgColor: '#1e293b',
        altSectionBkgColor: '#0f172a',
        gridColor: '#334155',
        fontSize: '13px',
      },
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        padding: 16,
        nodeSpacing: 45,
        rankSpacing: 45,
      },
    });
  } else {
    mermaid.initialize({
      startOnLoad: false,
      theme: 'base',
      securityLevel: 'strict',
      fontFamily: "'Segoe UI', system-ui, -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      themeVariables: {
        darkMode: false,
        background: 'transparent',
        mainBkg: '#ffffff',
        primaryColor: '#eef2ff',
        primaryTextColor: '#1e1b4b',
        primaryBorderColor: '#6366f1',
        lineColor: '#4f46e5',
        secondaryColor: '#f0fdf4',
        secondaryTextColor: '#14532d',
        secondaryBorderColor: '#22c55e',
        tertiaryColor: '#f8fafc',
        tertiaryTextColor: '#0f172a',
        tertiaryBorderColor: '#cbd5e1',
        noteBkgColor: '#fefce8',
        noteTextColor: '#713f12',
        noteBorderColor: '#eab308',
        nodeBorder: '#6366f1',
        clusterBkg: '#f8faff',
        clusterBorder: '#c7d2fe',
        defaultLinkColor: '#4f46e5',
        titleColor: '#1e1b4b',
        edgeLabelBackground: '#ffffff',
        actorBorder: '#6366f1',
        actorBkg: '#eef2ff',
        actorTextColor: '#1e1b4b',
        actorLineColor: '#6366f1',
        signalColor: '#4f46e5',
        signalTextColor: '#1e1b4b',
        labelBoxBkgColor: '#ffffff',
        labelBoxBorderColor: '#6366f1',
        labelTextColor: '#1e1b4b',
        loopTextColor: '#1e1b4b',
        activationBorderColor: '#4f46e5',
        activationBkgColor: '#e0e7ff',
        sequenceNumberColor: '#ffffff',
        sectionBkgColor: '#ffffff',
        altSectionBkgColor: '#f8fafc',
        gridColor: '#e2e8f0',
        fontSize: '13px',
      },
      flowchart: {
        curve: 'basis',
        htmlLabels: true,
        padding: 16,
        nodeSpacing: 45,
        rankSpacing: 45,
      },
    });
  }

  currentTheme = targetTheme;
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
        const uid = `mmd-${el.id || 'diag'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const { svg } = await mermaid.render(uid, source);
        el.innerHTML = svg;
        el.setAttribute('data-mermaid-rendered', 'true');
        if (source !== raw) {
          el.setAttribute('data-mermaid-repaired', 'true');
        }
      } catch (err) {
        try {
          const fallbackSource = repairMermaidFallback(raw);
          const uid2 = `mmd-fb-${el.id || 'diag'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
          const { svg } = await mermaid.render(uid2, fallbackSource);
          el.innerHTML = svg;
          el.setAttribute('data-mermaid-rendered', 'true');
          el.setAttribute('data-mermaid-repaired', 'true');
        } catch {
          el.outerHTML = renderMermaidErrorBlock(source, String(err));
        }
      }
    }
  });
}

/** Hydrate de façon asynchrone tous les blocs Mermaid et attend la fin complète du rendu SVG. */
export async function renderMermaidDiagramsAsync(root: ParentNode = document, force = true): Promise<void> {
  finalizeMermaidDiagrams(root);
  await renderQueue;
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
