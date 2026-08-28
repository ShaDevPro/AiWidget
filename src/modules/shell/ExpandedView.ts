/**
 * ExpandedView — Full chat layout HTML.
 */
import { t, currentLanguage } from '../../i18n';
import { icons } from '../../ui/icons';
import type { ShellHost } from './ShellHost';

export class ExpandedView {
  render(host: ShellHost): void {
    const activeModel = host.sidebarModule.currentConversation?.model || host.settings.default_model || host.models[0]?.name || 'qwen2.5:1.5b';
    const shortModel = activeModel.split(':')[0];

    host.getRootElement().innerHTML = `
      <div class="app">
        <!-- CUSTOM TITLEBAR -->
        <header class="widget-titlebar">
          <div class="titlebar-left" data-tauri-drag-region>
            <div class="titlebar-icon"><img src="/logo.png" class="app-logo-icon" alt="Logo" /></div>
            <div class="titlebar-name" id="tbName" data-tauri-drag-region>
              ${host.sidebarModule.currentConversation ? host.escapeText(host.sidebarModule.currentConversation.title) : t('app.title')}
            </div>
            <span class="model-badge clickable" id="tbModelBadge" title="${t('settings.defaultModel')} : ${activeModel}" role="button" tabindex="0">
              ${host.escapeText(shortModel)} <span class="badge-chevron">▾</span>
            </span>
          </div>

          <!-- TITLEBAR CENTER / HEADER: Status, Quota, Aide, Choix de langues -->
          <div class="titlebar-center" data-tauri-drag-region>
            <div class="tb-status-badge ${host.isConnected ? 'connected' : 'disconnected'}" id="statusIndicator" title="${host.isConnected ? t('settings.connected') : t('settings.notConnected')}">
              <span class="status-dot ${host.isConnected ? 'connected' : 'disconnected'}" id="statusDot"></span>
              <span class="tb-status-text" id="statusText">
                ${host.isConnected ? t('settings.connected') : t('settings.notConnected')}
              </span>
            </div>

            <!-- QUOTA BADGE (Uniquement en Mode Réseau Entreprise PRO) -->
            ${host.settings.execution_mode === 'pro' && host.licenseModule.currentQuota && !host.licenseModule.currentQuota.is_admin ? `
              <div class="tb-quota-badge ${host.getQuotaBadgeClass()}" id="quotaIndicator" title="${host.getQuotaTooltip()}">
                <span class="tb-quota-icon">⚡</span>
                <span class="tb-quota-text">${host.getQuotaLabel()}</span>
              </div>
            ` : ''}

            <div id="helpSection"></div>

            <div class="tb-lang-quick lang-quick">
              ${['fr', 'en', 'ar']
                .map(
                  (l) =>
                    `<button class="${currentLanguage() === l ? 'active' : ''}" data-lang="${l}">${l.toUpperCase()}</button>`,
                )
                .join('')}
            </div>
          </div>

          <div class="titlebar-right">
            <button class="tb-btn ${host.sidebarOpen ? 'active' : ''}" id="toggleSidebar" title="${t('widget.sidebar')}" type="button">${icons.sidebar}</button>
            <button class="tb-btn" id="toBubbleBtn" title="${t('widget.bubbleMode')}" type="button">${icons.bubble}</button>
            <button class="tb-btn" id="toCompactBtn" title="${t('widget.compactMode')}" type="button">${icons.compress}</button>
            <button class="tb-btn ${host.pinned ? 'active' : ''}" id="pinBtn" title="${host.pinned ? t('widget.unpin') : t('widget.pin')}" type="button">${icons.pin}</button>
            <button class="tb-btn" id="minBtn" title="${t('widget.minimize')}" type="button">${icons.minus}</button>
            <button class="tb-btn" id="maxBtn" title="${t('widget.maximize')}" type="button">${icons.maximize}</button>
            <button class="tb-btn close" id="closeBtn" title="${t('common.close')}" type="button">${icons.close}</button>
          </div>
        </header>

        <!-- WIDGET BODY -->
        <div class="widget-body">
          <!-- COLLAPSIBLE SIDEBAR -->
          <aside class="sidebar ${host.sidebarOpen ? '' : 'collapsed'}">
            <div class="search-box">
              ${icons.search}
              <input type="text" id="searchInput" placeholder="${t('common.search')}..." value="${host.escapeText(host.searchQuery)}" />
            </div>
            <div class="conversations-list" id="convList">
              ${host.renderConversationList()}
            </div>
            <div class="sidebar-footer">
              <div id="footerMenuSection"></div>
              <div id="aboutSection"></div>
            </div>
          </aside>

          <!-- MAIN CHAT PANE -->
          <main class="main">
            <header class="main-header">
              <div class="main-header-left">
                <h2 class="main-title" id="mainTitle">
                  ${host.sidebarModule.currentConversation ? host.escapeText(host.sidebarModule.currentConversation.title) : t('app.subtitle')}
                </h2>
              </div>
              <div class="main-header-right">
                <button class="icon-btn" id="exportChatBtn" title="${t('chat.export')}">${icons.download}</button>
                <button class="icon-btn" id="refreshBtn" title="${t('common.retry')}">${icons.refresh}</button>
                <button class="icon-btn ${host.settingsOpen ? 'active' : ''}" id="settingsBtn" title="${t('common.settings')}">${icons.settings}</button>
              </div>
            </header>

            <div class="chat-container" id="chatContainer">
              ${host.sidebarModule.currentConversation && host.chatModule.messages.length > 0 ? host.renderMessages() : host.renderEmptyChat()}
            </div>

            <div class="chat-input-container">
              <div class="doc-attachment-zone" id="docAttachmentZone"></div>
              <div class="chat-input-wrapper" id="inputWrapper">
                ${host.voiceModule.voiceState !== 'idle' ? `
                  <div class="voice-inline-indicator" id="voiceInlineIndicator">
                    <div class="voice-inline-bars" id="voiceInlineBars">
                      ${Array.from({length: 8}, (_, i) => `<div class="voice-inline-bar" id="vbar${i}" style="height:4px"></div>`).join('')}
                    </div>
                    <span class="voice-inline-label">${
                      host.voiceModule.voiceState === 'recording' ? t('voice.listening') :
                      host.voiceModule.voiceState === 'transcribing' ? t('voice.transcribing') :
                      host.voiceModule.voiceState === 'thinking' ? t('voice.thinking') :
                      t('voice.speaking')
                    }</span>
                    ${host.voiceModule.voiceState === 'recording' ? `
                      <button class="voice-stop-btn" id="voiceStopBtn" style="padding:5px 14px;font-size:11px;">
                        ${icons.stop} ${t('voice.stopBtn')}
                      </button>
                    ` : (host.voiceModule.voiceState === 'speaking' || host.voiceModule.voiceState === 'thinking') ? `
                      <button class="voice-stop-btn" id="voiceStopSpeakBtn" style="padding:5px 14px;font-size:11px;">
                        ${icons.stop} ${t('voice.stopBtn')}
                      </button>
                    ` : ''}
                  </div>
                ` : `
                  <textarea
                    class="chat-input"
                    id="chatInput"
                    placeholder="${t('chat.placeholder')}"
                    rows="1"
                  ></textarea>
                `}
                <div class="input-actions">
                  <button class="input-new-chat-btn" id="newChatBtn" title="${t('sidebar.newChat')}">
                    ${icons.plus} <span>${t('sidebar.newChat')}</span>
                  </button>
                  <div class="input-actions-spacer"></div>
                  <button class="input-web-btn web-toggle-btn ${host.webSearchEnabled ? 'active' : ''}" id="webSearchToggle" title="${t('web.toggleBtn')}">
                    ${icons.globe} <span>Web</span>
                  </button>
                  <button class="input-course-btn course-toggle-btn ${host.courseStudioEnabled ? 'active' : ''}" id="courseStudioToggle" title="${t('courseStudio.toggleBtn', { defaultValue: 'Mode Cours & Formations' })}">
                    <span class="course-icon">🎓</span> <span>${t('courseStudio.btnLabel', { defaultValue: 'Cours' })}</span>
                  </button>
                  <button class="input-attach-btn" id="attachFileBtn" title="${t('rag.addDocBtn')}">
                    ${icons.paperclip}
                  </button>
                  <button class="voice-btn ${host.voiceModule.voiceState === 'recording' ? 'recording' : host.voiceModule.voiceState === 'speaking' ? 'speaking' : ''} ${!host.settings.voice_enabled ? 'not-configured' : ''}" id="voiceMicBtn" title="${host.settings.voice_enabled ? t('voice.micBtn') : t('voice.enableVoice')}">
                    ${host.voiceModule.voiceState === 'speaking' ? icons.speaker : host.voiceModule.voiceState !== 'idle' ? icons.waveform : icons.microphone}
                  </button>
                  <button class="send-btn" id="sendBtn" disabled title="${t('chat.send')}">
                    ${icons.send}
                  </button>
                </div>
              </div>
            </div>
            <!-- STATS BAR — bottom of expanded mode, inside main layout -->
            <div class="stats-bar" id="statsBar">
              <span class="stats-item stats-loading">…</span>
            </div>
          </main>
        </div>
      </div>

      <!-- DRAG AND DROP OVERLAY -->
      <div class="drag-drop-overlay" id="dragDropOverlay">
        <div class="drag-drop-icon">${icons.book}</div>
        <div class="drag-drop-text">${t('rag.dropOverlayText')}</div>
      </div>

      <!-- CORNER RESIZE HANDLE -->
      <div class="resize-handle" id="resizeHandle" title="${t('widget.resizeHint')}"></div>

      <!-- ONBOARDING OVERLAY SLOT -->
      <div id="onboardingSlot"></div>

      <!-- SETTINGS DRAWER -->
      <div class="backdrop ${host.settingsOpen ? 'show' : ''}" id="backdrop"></div>
      <div class="settings-panel ${host.settingsOpen ? 'open' : ''}" id="settingsPanel">
        ${host.renderSettings()}
      </div>

      <!-- MODALS & TOAST (web privacy modal lives on document.body — see ModalsManager) -->
      <div class="modal" id="confirmModal">
        <h3>${t('common.confirm')}</h3>
        <p id="confirmText"></p>
        <div class="modal-actions">
          <button class="btn-secondary" id="confirmCancel">${t('common.cancel')}</button>
          <button class="btn-primary" id="confirmOk">${t('common.confirm')}</button>
        </div>
      </div>
      <div class="backdrop" id="modalBackdrop"></div>
      <div class="toast" id="toast">
        <span class="toast-icon" id="toastIcon"></span>
        <span id="toastText"></span>
      </div>
    `;
  }
}
