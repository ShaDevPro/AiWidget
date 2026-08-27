import { marked } from 'marked';
import hljs from 'highlight.js';
import katex from 'katex';
import { t } from './i18n';
import type { Message } from './types';
import { attachTableRenderer, autoCloseMarkdownTables } from './modules/markdown';
import { renderMermaidBlock } from './modules/markdown/MermaidRenderer';

export function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

const renderer = new marked.Renderer();

renderer.code = (code: string, infostring: string | undefined): string => {
  const lang = (infostring || '').trim().split(/\s+/)[0].toLowerCase();

  if (lang === 'mermaid') {
    const trimmed = code.trim();
    if (!trimmed) return '';
    return renderMermaidBlock(trimmed);
  }

  const trimmedCode = code.trim();
  if (!trimmedCode) return '';

  let highlighted = '';

  if (lang && hljs.getLanguage(lang)) {
    try {
      highlighted = hljs.highlight(trimmedCode, { language: lang, ignoreIllegals: true }).value;
    } catch {
      highlighted = escapeHtml(trimmedCode);
    }
  } else {
    highlighted = escapeHtml(trimmedCode);
  }

  const rawCodeAttr = encodeURIComponent(trimmedCode);
  const displayLang = lang || 'code';

  return `
    <div class="chat-code-block">
      <div class="chat-code-header">
        <span class="chat-code-lang">${escapeHtml(displayLang)}</span>
        <button class="chat-code-copy-btn" data-copy-code="${rawCodeAttr}" title="${t('chat.copyCode')}">
          <span class="copy-icon">📋</span>
          <span class="copy-label">${t('chat.copyCode')}</span>
        </button>
      </div>
      <pre class="chat-code-pre"><code class="hljs language-${escapeHtml(displayLang)}">${highlighted}</code></pre>
    </div>
  `;
};

attachTableRenderer(renderer);

marked.use({
  gfm: true,
  breaks: true,
  renderer,
});

export function autoCloseMarkdown(text: string): string {
  let result = autoCloseMarkdownTables(text);
  // Auto-close unclosed code block fences (```)
  const codeBlockMatches = result.match(/^```|^~~~/gm);
  if (codeBlockMatches && codeBlockMatches.length % 2 !== 0) {
    result += '\n```';
  }
  return result;
}

export function renderMarkdown(text: string): string {
  try {
    const html = marked.parse(text) as string;
    return renderMathInHtml(html);
  } catch {
    return escapeHtml(text).replace(/\n/g, '<br>');
  }
}

/** Render $inline$ and $$block$$ math via KaTeX (after Markdown parse). */
function renderMathInHtml(html: string): string {
  // Block math $$...$$
  let out = html.replace(/\$\$([\s\S]+?)\$\$/g, (_m, expr: string) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<code>${escapeHtml(expr)}</code>`;
    }
  });
  // Inline math $...$ (avoid $$)
  out = out.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (_m, expr: string) => {
    try {
      return katex.renderToString(expr.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${escapeHtml(expr)}</code>`;
    }
  });
  return out;
}

export function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }
    if (diffDays === 1) {
      return 'Yesterday';
    }
    if (diffDays < 7) {
      return date.toLocaleDateString([], { weekday: 'long' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

export function getDateGroupKey(dateStr: string): 'today' | 'yesterday' | '7d' | 'older' {
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays < 7) return '7d';
    return 'older';
  } catch {
    return 'older';
  }
}

export function formatMessageTime(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export function formatSmartMessageTimestamp(dateStr: string, lang = 'fr'): string {
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';

    const now = new Date();
    const isToday =
      date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();

    const locale = lang === 'ar' ? 'ar-SA' : lang === 'fr' ? 'fr-FR' : 'en-US';

    const timeStr = date.toLocaleTimeString(locale, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (isToday) {
      return timeStr;
    }

    const dateStrFormatted = date.toLocaleDateString(locale, {
      day: 'numeric',
      month: 'short',
    });

    return `${dateStrFormatted} · ${timeStr}`;
  } catch {
    return '';
  }
}

export function generateSmartTitle(firstMessage: string): string {
  const clean = firstMessage
    .replace(/^([#>\s*-]|\d+\.)+/gm, '')
    .replace(/\s+/g, ' ')
    .trim();

  if (!clean) return 'Discussion';

  let sentence = clean.split(/[.?!:\n]/)[0].trim();
  if (sentence.length > 40) {
    sentence = sentence.substring(0, 37).trim() + '...';
  }
  return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

export function getConversationTitle(firstMessage: string): string {
  return generateSmartTitle(firstMessage);
}

export function debounce<T extends (...args: unknown[]) => void>(
  fn: T,
  delay: number,
): (...args: Parameters<T>) => void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return (...args: Parameters<T>) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
}

export function isUserMessage(msg: Message): boolean {
  return msg.role === 'user';
}

export function stripMentions(text: string): string {
  return text.replace(/@\w+/g, '').trim();
}
