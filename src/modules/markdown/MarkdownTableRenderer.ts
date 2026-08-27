/**
 * MarkdownTableRenderer — Premium GFM table rendering (ChatGPT-style).
 * Wraps tables in scrollable cards with copy-to-clipboard support.
 */
import { t } from '../../i18n';
import type { Renderer } from 'marked';

let tableCounter = 0;

export function attachTableRenderer(renderer: Renderer): void {
  renderer.table = (header: string, body: string): string => {
    tableCounter += 1;
    const id = `md-table-${Date.now()}-${tableCounter}`;
    return [
      `<div class="md-table-card" data-md-table-id="${id}">`,
      '  <div class="md-table-toolbar">',
      `    <span class="md-table-label">${t('chat.tableLabel')}</span>`,
      '    <button type="button" class="md-table-copy-btn" data-copy-table="true"',
      `      title="${t('chat.copyTable')}" aria-label="${t('chat.copyTable')}">`,
      '      <span class="md-table-copy-icon" aria-hidden="true">📋</span>',
      `      <span class="md-table-copy-label">${t('chat.copyTable')}</span>`,
      '    </button>',
      '  </div>',
      '  <div class="md-table-scroll" tabindex="0" role="region">',
      `    <table class="md-table">${header}${body}</table>`,
      '  </div>',
      '</div>',
    ].join('\n');
  };

  renderer.tablerow = (content: string): string => `<tr>${content}</tr>`;

  renderer.tablecell = (
    content: string,
    flags: { header: boolean; align: 'center' | 'left' | 'right' | null },
  ): string => {
    const tag = flags.header ? 'th' : 'td';
    const alignClass = flags.align ? ` md-table-align-${flags.align}` : '';
    const scopeAttr = flags.header ? ' scope="col"' : '';
    return `<${tag} class="md-table-cell${alignClass}"${scopeAttr}>${content}</${tag}>`;
  };
}

/** Stabilise incomplete GFM tables during streaming. */
export function autoCloseMarkdownTables(text: string): string {
  const lines = text.split('\n');
  const pipeLines = lines.filter((l) => /^\s*\|.+\|\s*$/.test(l.trim()));
  if (pipeLines.length < 2) return text;

  const lastPipeIdx = (() => {
    for (let i = lines.length - 1; i >= 0; i--) {
      if (/^\s*\|.+\|\s*$/.test(lines[i].trim())) return i;
    }
    return -1;
  })();
  if (lastPipeIdx < 0) return text;

  const headerLine = pipeLines[0]?.trim() ?? '';
  const colCount = (headerLine.match(/\|/g) ?? []).length - 1;
  if (colCount < 1) return text;

  const hasSeparator = pipeLines.some((l) =>
    /^\s*\|[\s\-:|]+\|\s*$/.test(l.trim()),
  );

  let result = text;
  if (!hasSeparator && pipeLines.length >= 1) {
    const sep = '|' + Array(colCount).fill(' --- ').join('|') + '|';
    const insertAt = lines.findIndex((l) => l.trim() === pipeLines[0]?.trim());
    if (insertAt >= 0) {
      const patched = [...lines];
      patched.splice(insertAt + 1, 0, sep);
      result = patched.join('\n');
    }
  }

  const lastLine = lines[lastPipeIdx]?.trim() ?? '';
  if (/^\s*\|.+\|\s*$/.test(lastLine) && !lastLine.includes('---')) {
    const cells = lastLine.split('|').filter((c) => c.trim() !== '');
    if (cells.length > 0 && cells.length < colCount) {
      const padded = '| ' + cells.map((c) => c.trim()).join(' | ') +
        Array(colCount - cells.length).fill(' … ').join(' | ') + ' |';
      result = result.replace(/\s*$/, '\n' + padded);
    }
  }

  return result;
}

/** Extract TSV from a rendered table for clipboard (Excel/Sheets paste). */
export function tableElementToTsv(table: HTMLTableElement): string {
  return Array.from(table.rows)
    .map((row) =>
      Array.from(row.cells)
        .map((cell) => cell.innerText.replace(/\t/g, ' ').replace(/\n/g, ' ').trim())
        .join('\t'),
    )
    .join('\n');
}

/** Copy-table click handler — wire from chat container delegation. */
export async function handleCopyTableClick(
  btn: HTMLElement,
  onError: (msg: string) => void,
): Promise<boolean> {
  const card = btn.closest('.md-table-card');
  const table = card?.querySelector('table.md-table') as HTMLTableElement | null;
  if (!table) return false;

  try {
    const tsv = tableElementToTsv(table);
    await navigator.clipboard.writeText(tsv);
    const iconEl = btn.querySelector('.md-table-copy-icon');
    const labelEl = btn.querySelector('.md-table-copy-label');
    if (iconEl) iconEl.textContent = '✓';
    if (labelEl) labelEl.textContent = t('chat.copied');
    btn.classList.add('copied');
    setTimeout(() => {
      if (iconEl) iconEl.textContent = '📋';
      if (labelEl) labelEl.textContent = t('chat.copyTable');
      btn.classList.remove('copied');
    }, 2000);
    return true;
  } catch {
    onError(t('common.error'));
    return true;
  }
}
