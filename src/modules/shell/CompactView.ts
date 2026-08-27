/**

 * CompactView — Single-line quick prompt bar with expanded feature parity.

 */

import { api } from '../../api';

import { t } from '../../i18n';

import { icons } from '../../ui/icons';

import type { ShellHost } from './ShellHost';



export class CompactView {

  render(host: ShellHost): void {

    host.sidebarOpen = false;

    const activeModel = host.sidebarModule.currentConversation?.model || host.settings.default_model || host.models[0]?.name || 'qwen2.5:1.5b';

    const shortModel = activeModel.split(':')[0];

    const showSuggestions = host.chatModule.messages.length === 0;

    const suggestionsHtml = showSuggestions ? host.renderCompactSuggestions() : '';



    host.getRootElement().innerHTML = `

      <div class="compact-widget">

        <div class="compact-titlebar">

          <div class="titlebar-left" data-tauri-drag-region>

            <div class="titlebar-icon"><img src="/logo.png" class="app-logo-icon" alt="Logo" /></div>

            <div class="titlebar-name" data-tauri-drag-region>${t('app.title')}</div>

            <span class="model-badge clickable" id="compactModelBadge" title="${t('settings.defaultModel')} : ${activeModel}" role="button" tabindex="0">

              ${host.escapeText(shortModel)} <span class="badge-chevron">▾</span>

            </span>

            <span class="status-dot ${host.isConnected ? 'connected' : 'disconnected'}" id="statusDot" title="${host.isConnected ? t('settings.connected') : t('settings.notConnected')}"></span>

          </div>

          <div class="titlebar-right">

            <button class="tb-btn web-toggle-btn ${host.webSearchEnabled ? 'active' : ''}" id="compactWebToggle" title="${t('web.toggleBtn')}" type="button">${icons.globe}</button>

            <button class="tb-btn" id="compactExportBtn" title="${t('chat.export')}" type="button">${icons.download}</button>

            <button class="tb-btn" id="compactSettingsBtn" title="${t('common.settings')}" type="button">${icons.settings}</button>

            <button class="tb-btn" id="toBubbleBtn" title="${t('widget.bubbleMode')}" type="button">${icons.bubble}</button>

            <button class="tb-btn ${host.pinned ? 'active' : ''}" id="pinBtn" title="${host.pinned ? t('widget.unpin') : t('widget.pin')}" type="button">${icons.pin}</button>

            <button class="tb-btn" id="toExpandedBtn" title="${t('widget.expandedMode')}" type="button">${icons.expand}</button>

            <button class="tb-btn close" id="closeBtn" title="${t('common.close')}" type="button">${icons.close}</button>

          </div>

        </div>

        ${showSuggestions ? `<div class="compact-suggestions-wrap">${suggestionsHtml}</div>` : ''}

        <div class="compact-body">

          <div class="compact-input-row">

            <input

              type="text"

              class="compact-input"

              id="compactInput"

              placeholder="${t('widget.quickPrompt')}"

              autocomplete="off"

            />

            <button class="voice-btn ${!host.settings.voice_enabled ? 'not-configured' : ''}" id="compactVoiceMicBtn" title="${host.settings.voice_enabled ? t('voice.micBtn') : t('voice.enableVoice')}" style="width:30px;height:30px;">

              ${icons.microphone}

            </button>

            <button class="compact-send-btn" id="compactSendBtn" disabled title="${t('chat.send')}">

              ${icons.send}

            </button>

          </div>

        </div>

        <div class="stats-bar compact-stats-bar" id="compactStatsBar">

          <span class="stats-item stats-loading">…</span>

        </div>

      </div>

      <div class="toast" id="toast">

        <span class="toast-icon" id="toastIcon"></span>

        <span id="toastText"></span>

      </div>

    `;

  }



  attachEvents(host: ShellHost): void {

    const input = document.getElementById('compactInput') as HTMLInputElement;

    const sendBtn = document.getElementById('compactSendBtn') as HTMLButtonElement;



    input?.focus();



    input?.addEventListener('input', () => {

      sendBtn.disabled = input.value.trim().length === 0;

    });



    const triggerSend = async () => {

      const text = input.value.trim();

      if (!text) return;

      await host.setMode('expanded');

      const chatInput = host.getChatInput();

      if (chatInput) {

        chatInput.value = text;

        await host.sendMessage();

      }

    };



    input?.addEventListener('keydown', (e) => {

      if (e.key === 'Enter') {

        e.preventDefault();

        void triggerSend();

      }

    });



    sendBtn?.addEventListener('click', () => void triggerSend());



    document.querySelector('.compact-suggestions-wrap')?.addEventListener('click', (e) => {

      const btn = (e.target as HTMLElement).closest('[data-fill-prompt]') as HTMLElement;

      if (!btn) return;

      const text = btn.getAttribute('data-fill-prompt') || '';

      if (input) {

        input.value = text;

        sendBtn.disabled = false;

        input.focus();

      }

    });



    document.getElementById('compactWebToggle')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      host.toggleWebSearch();

    });



    document.getElementById('compactExportBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      host.openExportMenu(document.getElementById('compactExportBtn') ?? undefined);

    });



    document.getElementById('compactSettingsBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      void host.setMode('expanded').then(() => host.toggleSettings(true));

    });



    const badge = document.getElementById('compactModelBadge');

    badge?.addEventListener('click', (e) => {

      e.stopPropagation();

      host.openModelSwitcher(badge);

    });



    document.getElementById('toBubbleBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      void host.setMode('bubble');

    });

    document.getElementById('toExpandedBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      void host.setMode('expanded');

    });

    document.getElementById('pinBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      void host.togglePin();

    });

    document.getElementById('closeBtn')?.addEventListener('click', (e) => {

      e.preventDefault();

      e.stopPropagation();

      void api.widgetClose();

    });



    host.attachVoiceEvents();



    const statsBar = document.getElementById('compactStatsBar');

    if (statsBar) {

      host.statsModule.detach();

      host.statsModule.attach(statsBar, host.settings.language || 'fr');

    }

  }

}


