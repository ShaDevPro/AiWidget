/**
 * BubbleView — Minimal floating bubble widget mode.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import type { ShellHost } from './ShellHost';

export class BubbleView {
  render(host: ShellHost): void {
    host.sidebarOpen = false; // pas de sidebar en mode bulle
    host.getRootElement().innerHTML = `
      <div class="bubble-widget" id="bubbleWidget" data-tauri-drag-region title="${t('widget.clickToExpand')} (${t('widget.dragHint')})">
        <div class="bubble-glow"></div>
        <div class="bubble-inner" data-tauri-drag-region>
          <div class="bubble-icon" data-tauri-drag-region>
            <img src="/logo.png" class="bubble-logo-img" alt="Logo" data-tauri-drag-region />
          </div>
          <span class="bubble-status ${host.isConnected ? 'connected' : 'disconnected'}" title="${host.isConnected ? t('settings.connected') : t('settings.notConnected')}"></span>
          ${host.webSearchEnabled ? `<span class="bubble-web-dot active" title="${t('web.active')}"></span>` : ''}
        </div>
        <div class="bubble-actions">
          <button class="bubble-btn expand-btn" id="bubbleExpandBtn" title="${t('widget.expandedMode')}">${icons.expand}</button>
          <button class="bubble-btn close-btn" id="bubbleCloseBtn" title="${t('common.close')}">${icons.close}</button>
        </div>
      </div>
    `;

    const bubble = document.getElementById('bubbleWidget');
    let isClick = true;
    let startX = 0;
    let startY = 0;

    bubble?.addEventListener('mousedown', (e) => {
      isClick = true;
      startX = e.screenX;
      startY = e.screenY;
    });

    bubble?.addEventListener('mousemove', (e) => {
      if (Math.abs(e.screenX - startX) > 4 || Math.abs(e.screenY - startY) > 4) {
        isClick = false;
      }
    });

    bubble?.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).closest('.bubble-actions')) return;
      if (isClick) {
        void host.setMode('compact');
      }
    });

    document.getElementById('bubbleExpandBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      void host.setMode('expanded');
    });

    document.getElementById('bubbleCloseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      void api.widgetClose();
    });
  }
}
