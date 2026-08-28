/**
 * MessageRenderer — Formats chat messages into modern, interactive HTML.
 */
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { renderMarkdown, formatDate, escapeHtml } from '../../utils';
import { prepareAssistantMarkdown } from '../markdown/normalizeMarkdown';
import {
  renderUserMessageActions,
  renderUserMessageBody,
  resolveUserDisplayText,
} from './UserMessageRenderer';
import type { Message } from '../../types';

export class MessageRenderer {
  static renderMessages(
    messages: Message[],
    isGenerating: boolean,
    pendingAssistantId: string | null,
    modelName: string,
    onEscapeText: (text: string) => string,
    userPseudo: string = 'Vous',
    language: string = 'fr',
    webSearchEnabled: boolean = false,
  ): string {
    if (messages.length === 0) {
      return '';
    }

    const shortModel = modelName.split(':')[0];

    return messages
      .map((m) => {
        const isUser = m.role === 'user';
        const isPending = !isUser && m.id === pendingAssistantId && !m.content;
        const timestamp = formatDate(m.created_at);

        let bodyContent = '';

        if (isUser) {
          const userText = resolveUserDisplayText(m);
          bodyContent = `
            <div class="msg-user-header">
              <span class="msg-timestamp">${timestamp}</span>
              <span class="msg-user-name">${onEscapeText(userPseudo)}</span>
              <div class="msg-user-avatar">${icons.user}</div>
            </div>
            <div class="message-bubble user-bubble-premium">
              ${renderUserMessageBody(userText)}
            </div>
            ${renderUserMessageActions(m.id)}
          `;
        } else {
          const rawContent = m.content || '';
          let renderedContent = '';

          if (isPending) {
            renderedContent = `
              <div class="thinking-premium-card ${webSearchEnabled ? 'web-mode' : ''}">
                <div class="thinking-orb">
                  <div class="orb-core"></div>
                  <div class="orb-ring"></div>
                  ${webSearchEnabled ? icons.globe : icons.sparkles}
                </div>
                <div class="thinking-body">
                  <div class="thinking-title-row">
                    <span class="thinking-step-text fade-in" id="thinkingStepText">${t('chat.thinking') || 'Réflexion en cours...'}</span>
                    <div class="thinking-wave-bars">
                      <span></span><span></span><span></span><span></span>
                    </div>
                  </div>
                  <div class="thinking-meta-badge">
                    ${webSearchEnabled ? `${icons.shieldCheck} ${t('web.privacyTitle') || 'Web Search'}` : `${icons.brain} Engine`}
                  </div>
                </div>
              </div>
            `;
          } else {
            const prepared = prepareAssistantMarkdown(rawContent);
            const isRawHtmlCard = rawContent.trim().startsWith('<div class="course-finished-card') ||
                                  rawContent.trim().startsWith('<div class="course-live-card') ||
                                  rawContent.trim().startsWith('<div class=');
            renderedContent = `
              <div class="message-bubble ${isRawHtmlCard ? 'course-card-bubble' : 'markdown-body'}">
                ${isRawHtmlCard ? rawContent.trim() : renderMarkdown(prepared)}
              </div>
            `;

            if (m.webSources && m.webSources.length > 0) {
              renderedContent += this.renderWebSourcesBar(m.webSources);
            }

            if (this.hasWebRefusal(rawContent) && !webSearchEnabled) {
              renderedContent += `
                <div class="web-search-retry-banner">
                  <div class="web-search-retry-text">
                    <span class="web-search-retry-icon">${t('web.retry.icon')}</span>
                    <span><strong>${t('web.retry.title')}</strong> ${t('web.retry.desc')}</span>
                  </div>
                  <button class="sp-btn-primary web-search-retry-btn" data-trigger-web-retry="${m.id}">
                    ${icons.globe} ${t('web.retry.btn')}
                  </button>
                </div>
              `;
            }
          }

          bodyContent = `
            <div class="msg-bot-header">
              <img src="/logo.png" class="msg-bot-logo" alt="Logo" />
              <span class="msg-bot-name">WidgetAI</span>
              <span class="msg-bot-model">${onEscapeText(shortModel)}</span>
              <span class="msg-timestamp">${timestamp}</span>
            </div>
            ${renderedContent}
            ${!isPending && rawContent ? `
              <div class="message-actions">
                <button class="message-action-btn" data-copy="${m.id}" title="${t('chat.copy')}">${icons.copy}</button>
                <button class="message-action-btn" data-regenerate="${m.id}" title="${t('chat.regenerate')}">${icons.refresh}</button>
              </div>
            ` : ''}
          `;
        }

        return `
          <div class="message ${isUser ? 'user' : 'assistant'} ${isPending ? 'pending' : ''}" data-msg-id="${m.id}">
            <div class="message-body">
              ${bodyContent}
            </div>
          </div>
        `;
      })
      .join('');
  }

  static renderWebSourcesBar(sources: { title: string; url: string }[]): string {
    const chips = sources
      .slice(0, 6)
      .map(
        (s, i) =>
          `<a class="web-source-chip" href="${encodeURI(s.url)}" target="_blank" rel="noopener noreferrer" title="${escapeHtml(s.title)}">` +
          `<span class="web-source-num">${i + 1}</span>` +
          `<span class="web-source-title">${escapeHtml(s.title)}</span></a>`,
      )
      .join('');
    return `
      <div class="web-sources-bar">
        <span class="web-sources-label">${t('web.sourcesLabel')}</span>
        <div class="web-sources-chips">${chips}</div>
      </div>`;
  }

  static hasWebRefusal(content: string): boolean {
    const l = content.toLowerCase();
    const refusalPhrases = [
      'pas accès', 'pas acces', 'ne dispose pas', 'ne possède pas', 'ne possede pas',
      'pas en mesure', 'impossible de', 'données actuelles', 'donnees actuelles',
      'temps réel', 'temps reel', 'en direct', 'information à jour', 'information a jour',
      'données récentes', 'donnees recentes', 'my training', 'cutoff', 'knowledge cutoff',
      'no access to', 'cannot browse', 'cannot access the internet', 'unable to provide real-time',
    ];
    const webContextPhrases = [
      'internet', 'web', 'météo', 'meteo', 'température', 'temperature', 'weather',
      'actuel', 'aujourd', 'today', 'demain', 'tomorrow', 'en ligne', 'online',
      'actualité', 'actualite', 'news', 'cours du', 'prix du',
    ];
    return refusalPhrases.some((p) => l.includes(p)) && webContextPhrases.some((p) => l.includes(p));
  }
}
