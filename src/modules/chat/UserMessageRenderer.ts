/**
 * UserMessageRenderer — Premium user bubble (ChatGPT-style), light inline markdown only.
 */
import type { Message } from '../../types';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { escapeHtml } from '../../utils';

export interface UserAttachmentChip {
  kind: 'document' | 'image';
  name: string;
}

export interface ParsedUserMessage {
  attachment?: UserAttachmentChip;
  body: string;
}

/** Resolve text shown in the user bubble (never the raw embedded document). */
export function resolveUserDisplayText(msg: Message): string {
  if (msg.displayContent) return msg.displayContent;
  if (msg.llmContent && msg.content !== msg.llmContent) return msg.content;
  return normalizeLegacyDocumentContent(msg.content);
}

/** Legacy DB rows stored the full document block in `content`. */
function normalizeLegacyDocumentContent(text: string): string {
  const parsed = parseUserDisplayContent(text);
  if (parsed.attachment) {
    const body = parsed.body;
    return body
      ? `📎 **[${parsed.attachment.name}]**\n\n${body}`
      : `📎 **[${parsed.attachment.name}]**`;
  }
  return text;
}

/** Split attachment header (📎/🖼️ **[name]**) or legacy document block from user text. */
export function parseUserDisplayContent(text: string): ParsedUserMessage {
  const trimmed = text.trim();
  const match = trimmed.match(/^(🖼️|📎)\s*\*\*\[(.+?)\]\*\*\s*(?:\n\n([\s\S]*))?$/);
  if (match) {
    return {
      attachment: {
        kind: match[1] === '🖼️' ? 'image' : 'document',
        name: match[2].trim(),
      },
      body: (match[3] ?? '').trim(),
    };
  }

  const legacy = trimmed.match(
    /^\[DOCUMENT ATTACHÉ:\s*"([^"]+)"\s*\([^)]+\)\][\s\S]*?=+\s*[\s\S]*?=+\s*([\s\S]*)$/i,
  );
  if (legacy) {
    return {
      attachment: { kind: 'document', name: legacy[1].trim() },
      body: legacy[2].trim(),
    };
  }

  const legacyOnly = trimmed.match(/^\[DOCUMENT ATTACHÉ:\s*"([^"]+)"\s*\([^)]+\)\]/i);
  if (legacyOnly) {
    return {
      attachment: { kind: 'document', name: legacyOnly[1].trim() },
      body: '',
    };
  }

  return { body: trimmed };
}

/** Safe inline markdown for user messages (bold, italic, code, line breaks). */
export function renderUserInlineMarkdown(text: string): string {
  let html = escapeHtml(text);
  html = html.replace(/`([^`\n]+)`/g, '<code class="user-inline-code">$1</code>');
  html = html.replace(/\*\*([^*\n]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/(?<!\*)\*([^*\n]+)\*(?!\*)/g, '<em>$1</em>');
  html = html.replace(/\n/g, '<br>');
  return html;
}

function renderAttachmentChip(chip: UserAttachmentChip): string {
  const icon = chip.kind === 'image' ? '🖼️' : '📎';
  const label =
    chip.kind === 'image' ? t('chat.userAttachmentImage') : t('chat.userAttachmentDoc');
  return `
    <div class="user-attachment-chip" title="${escapeHtml(chip.name)}">
      <span class="user-attachment-icon" aria-hidden="true">${icon}</span>
      <span class="user-attachment-meta">
        <span class="user-attachment-label">${escapeHtml(label)}</span>
        <span class="user-attachment-name">${escapeHtml(chip.name)}</span>
      </span>
    </div>`;
}

export function renderUserMessageBody(displayText: string): string {
  const parsed = parseUserDisplayContent(displayText);
  const parts: string[] = [];

  if (parsed.attachment) {
    parts.push(renderAttachmentChip(parsed.attachment));
  }

  if (parsed.body) {
    parts.push(`<div class="user-message-text">${renderUserInlineMarkdown(parsed.body)}</div>`);
  } else if (parsed.attachment) {
    parts.push(`<div class="user-message-text user-message-text-muted">${escapeHtml(t('chat.userAttachmentOnly'))}</div>`);
  }

  return parts.join('');
}

export function renderUserMessageActions(messageId: string): string {
  return `
    <div class="message-actions user-message-actions">
      <button class="message-action-btn" data-edit="${messageId}" title="${t('chat.edit')}">${icons.edit}</button>
      <button class="message-action-btn" data-copy="${messageId}" title="${t('chat.copy')}">${icons.copy}</button>
    </div>`;
}
