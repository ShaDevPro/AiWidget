/**
 * ExpandedViewController — Event bindings for expanded mode.
 */
import { api } from '../../api';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { t } from '../../i18n';
import { helpModule } from '../help/HelpModule';
import { aboutModule } from '../about/AboutModule';
import { footerMenuModule } from '../menu/FooterMenuModule';
import { handleCopyTableClick } from '../markdown';
import { decodeMermaidSource, MermaidModal } from '../markdown/MermaidRenderer';
import { ImageModal } from '../image/ImageModal';
import { sdManager } from '../image/SDManager';
import { screenSnipper } from '../snipper/ScreenSnipper';
import type { ShellHost } from './ShellHost';

export class ExpandedViewController {
  attach(host: ShellHost): void {
    // Mode switches
    document.getElementById('toBubbleBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void host.setMode('bubble');
    });
    document.getElementById('toCompactBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void host.setMode('compact');
    });

    // Titlebar actions
    document.getElementById('pinBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void host.togglePin();
    });
    document.getElementById('minBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void api.widgetMinimize();
    });
    document.getElementById('maxBtn')?.addEventListener('click', async (e) => {
      e.preventDefault();
      e.stopPropagation();
      await api.widgetMaximize();
      setTimeout(() => {
        const isWide = window.innerWidth >= 650;
        host.sidebarOpen = isWide;
        document.querySelector('.sidebar')?.classList.toggle('collapsed', !host.sidebarOpen);
        document.getElementById('toggleSidebar')?.classList.toggle('active', host.sidebarOpen);
      }, 150);
    });
    document.getElementById('closeBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      void api.widgetClose();
    });

    document.getElementById('toggleSidebar')?.addEventListener('click', () => {
      host.sidebarOpen = !host.sidebarOpen;
      document.querySelector('.sidebar')?.classList.toggle('collapsed', !host.sidebarOpen);
      document.getElementById('toggleSidebar')?.classList.toggle('active', host.sidebarOpen);
    });

    window.addEventListener('resize', () => {
      if (host.mode === 'expanded') {
        const isWide = window.innerWidth >= 650;
        if (isWide && !host.sidebarOpen) {
          host.sidebarOpen = true;
          document.querySelector('.sidebar')?.classList.toggle('collapsed', false);
          document.getElementById('toggleSidebar')?.classList.toggle('active', true);
        } else if (!isWide && host.sidebarOpen) {
          host.sidebarOpen = false;
          document.querySelector('.sidebar')?.classList.toggle('collapsed', true);
          document.getElementById('toggleSidebar')?.classList.toggle('active', false);
        }
      }
    });

    // Sidebar actions
    document.getElementById('newChatBtn')?.addEventListener('click', () => void host.newConversation());
    document.getElementById('searchInput')?.addEventListener('input', async (e) => {
      host.searchQuery = (e.target as HTMLInputElement).value;
      if (host.searchQuery.trim().length >= 2) {
        try {
          host.messageSearchResults = await api.searchMessages(host.searchQuery.trim());
        } catch {
          host.messageSearchResults = [];
        }
      } else {
        host.messageSearchResults = [];
      }
      host.refreshConvList();
    });

    document.getElementById('convList')?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;
      const pinBtn = target.closest('[data-pin-id]') as HTMLElement;
      if (pinBtn) {
        e.stopPropagation();
        const id = pinBtn.getAttribute('data-pin-id')!;
        try {
          await api.toggleConversationPin(id);
          host.sidebarModule.conversations = await api.getConversations();
          host.refreshConvList();
        } catch (err) {
          host.toast((err as Error).message || String(err), 'error');
        }
        return;
      }
      const deleteBtn = target.closest('[data-delete-id]') as HTMLElement;
      if (deleteBtn) {
        e.stopPropagation();
        const id = deleteBtn.getAttribute('data-delete-id')!;
        void host.deleteConversation(id);
        return;
      }
      const convItem = target.closest('[data-conv-id]') as HTMLElement;
      if (convItem) {
        const id = convItem.getAttribute('data-conv-id')!;
        void host.openConversation(id);
      }
    });

    document.querySelectorAll('.lang-quick button').forEach((btn) => {
      btn.addEventListener('click', () => {
        const lang = btn.getAttribute('data-lang')!;
        void host.setLanguage(lang);
      });
    });

    // Main header buttons
    document.getElementById('exportChatBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      host.openExportMenu();
    });
    document.getElementById('refreshBtn')?.addEventListener('click', async () => {
      await host.refreshConnection();
      await host.refreshModels();
      host.toast(t('common.success'), 'success');
    });
    document.getElementById('tbModelBadge')?.addEventListener('click', (e) => {
      e.stopPropagation();
      const badge = document.getElementById('tbModelBadge');
      if (badge) host.openModelSwitcher(badge);
    });

    document.getElementById('settingsBtn')?.addEventListener('click', () => host.toggleSettings(true));
    document.getElementById('backdrop')?.addEventListener('click', () => host.toggleSettings(false));
    document.getElementById('closeSettingsBtn')?.addEventListener('click', () => host.toggleSettings(false));
    document.getElementById('confirmCancel')?.addEventListener('click', () => host.hideConfirm());
    document.getElementById('modalBackdrop')?.addEventListener('click', () => host.hideConfirm());

    // Chat input
    host.setChatContainer(document.getElementById('chatContainer'));
    host.setChatInput(document.getElementById('chatInput') as HTMLTextAreaElement);

    // Attach smart scroll module to the chat container
    const chatContainer = host.getChatContainer();
    if (chatContainer) {
      host.streamModule.attach(chatContainer);
    }

    // Attach stats bar module (expanded mode only)
    const statsBar = document.getElementById('statsBar');
    if (statsBar) {
      host.statsModule.detach();
      host.statsModule.attach(statsBar, host.settings.language || 'fr');
    }

    // Attach profile block at top of sidebar
    const sidebar = document.querySelector<HTMLElement>('.sidebar');
    if (sidebar && host.activeProfile) {
      host.profileModule.attachSidebar(sidebar);
    }

    // ── Help section ────────────────────────────────────────────────
    const helpEl = document.getElementById('helpSection');
    if (helpEl) {
      helpModule.renderInto(helpEl);
    }

    // ── Footer Menu (License, Contact, Feedback, Privacy, Terms) ───
    const footerMenuEl = document.getElementById('footerMenuSection');
    if (footerMenuEl) {
      footerMenuModule.onOpenLicense = () => {
        host.promptLicense('pro');
      };
      footerMenuModule.renderInto(footerMenuEl, host.activeProfile?.role === 'admin', host.settings.execution_mode === 'pro');
    }

    // ── About / Copyright section ────────────────────────────────────
    const aboutEl = document.getElementById('aboutSection');
    if (aboutEl) {
      aboutModule.renderInto(aboutEl);
    }

    document.getElementById('inputWrapper')?.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (!target.closest('button') && !target.closest('input')) {
        host.getChatInput()?.focus();
      }
    });

    host.getChatInput()?.addEventListener('input', () => host.autoResizeTextarea());
    host.getChatInput()?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        void host.sendMessage();
      }
    });

    // Clipboard paste event (Ctrl+V) for screenshots & images
    window.addEventListener('paste', async (e) => {
      const items = e.clipboardData?.items;
      const hasImage = items && Array.from(items).some((item) => item.type.indexOf('image') !== -1);
      if (hasImage) {
        if (!host.checkFeatureAccess('rag')) {
          host.promptLicense('lite');
          return;
        }
        const opts = host.getVisionAttachOptions();
        const handled = await host.documentManager.handlePaste(e, opts);
        if (handled) {
          host.renderAttachmentBar();
          host.toast(opts.visionMode ? t('doc.visionReady') : t('doc.ocrProcessing'), 'info');
        }
      }
    });

    // Send button — wired via App.updateSendButton() (onclick), not here (avoids double-fire)
    host.autoResizeTextarea();
    document.getElementById('attachFileBtn')?.addEventListener('click', async () => {
      if (!host.checkFeatureAccess('rag')) {
        host.promptLicense('lite');
        return;
      }
      try {
        const selected = await openDialog({
          multiple: false,
          filters: [
            {
              name: 'Documents & Images (OCR)',
              extensions: ['pdf', 'png', 'jpg', 'jpeg', 'webp', 'bmp', 'docx', 'xlsx', 'csv', 'txt', 'md', 'json', 'py', 'ts', 'js', 'rs', 'html', 'css', 'sql', 'log'],
            },
          ],
        });
        if (selected && typeof selected === 'string') {
          const fileName = selected.split(/[\\/]/).pop() || 'document';
          await host.documentManager.attachFilePath(selected, fileName);
          host.renderAttachmentBar();
        }
      } catch (err) {
        host.toast(String(err), 'error');
      }
    });

    document.getElementById('snipScreenBtn')?.addEventListener('click', async () => {
      screenSnipper.init(host.documentManager, {
        show: (msg: string, type: any) => host.toast(msg, type),
        success: (msg: string) => host.toast(msg, 'success'),
        error: (msg: string) => host.toast(msg, 'error'),
        info: (msg: string) => host.toast(msg, 'info'),
        warning: (msg: string) => host.toast(msg, 'warning'),
      } as any);
      const ok = await screenSnipper.captureScreen();
      if (ok) {
        host.renderAttachmentBar();
      }
    });

    // Ensure attachment bar is rendered if doc is already attached
    host.renderAttachmentBar();

    // Voice events
    host.attachVoiceEvents();

    document.getElementById('webSearchToggle')?.addEventListener('click', () => {
      host.toggleWebSearch();
    });

    document.getElementById('courseStudioToggle')?.addEventListener('click', () => {
      host.toggleCourseStudio();
    });

    host.getChatContainer()?.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // Mail Card Copy Action
      const copyMailBtn = target.closest('[data-copy-mail]') as HTMLElement;
      if (copyMailBtn) {
        e.stopPropagation();
        const rawEncoded = copyMailBtn.getAttribute('data-copy-mail') || '';
        const rawMail = decodeURIComponent(rawEncoded);
        try {
          await navigator.clipboard.writeText(rawMail);
          const labelEl = copyMailBtn.querySelector('.mail-btn-label');
          if (labelEl) labelEl.textContent = t('mail.copied');
          copyMailBtn.classList.add('copied');
          setTimeout(() => {
            if (labelEl) labelEl.textContent = t('mail.copyMail');
            copyMailBtn.classList.remove('copied');
          }, 2000);
          host.toast(t('mail.copied'), 'success');
        } catch {
          host.toast(t('common.error'), 'error');
        }
        return;
      }

      // Mail Card Open Client Action (mailto:)
      const openMailBtn = target.closest('[data-open-mail]') as HTMLElement;
      if (openMailBtn) {
        e.stopPropagation();
        const to = decodeURIComponent(openMailBtn.getAttribute('data-open-mail') || '');
        const subject = decodeURIComponent(openMailBtn.getAttribute('data-mail-subject') || '');
        const body = decodeURIComponent(openMailBtn.getAttribute('data-mail-body') || '');

        let cleanTo = to;
        const emailMatch = to.match(/<([^>]+)>/);
        if (emailMatch) {
          cleanTo = emailMatch[1];
        }

        const mailtoUrl = `mailto:${cleanTo}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
        try {
          const { open: openBrowser } = await import('@tauri-apps/api/shell');
          await openBrowser(mailtoUrl);
          host.toast(t('mail.openingClient'), 'info');
        } catch (err) {
          console.error('Failed to open mailto URL:', err);
          host.toast(t('common.error'), 'error');
        }
        return;
      }

      const copyTableBtn = target.closest('[data-copy-table]') as HTMLElement;
      if (copyTableBtn) {
        e.stopPropagation();
        void handleCopyTableClick(copyTableBtn, (msg) => host.toast(msg, 'error'));
        return;
      }

      const copyCodeBtn = target.closest('[data-copy-code]') as HTMLElement;
      if (copyCodeBtn) {
        e.stopPropagation();
        const rawEncoded = copyCodeBtn.getAttribute('data-copy-code') || '';
        const rawCode = decodeURIComponent(rawEncoded);
        try {
          await navigator.clipboard.writeText(rawCode);
          const iconEl = copyCodeBtn.querySelector('.copy-icon');
          const labelEl = copyCodeBtn.querySelector('.copy-label');
          if (iconEl) iconEl.textContent = '✓';
          if (labelEl) labelEl.textContent = t('chat.copied');
          copyCodeBtn.classList.add('copied');
          setTimeout(() => {
            if (iconEl) iconEl.textContent = '📋';
            if (labelEl) labelEl.textContent = t('chat.copyCode');
            copyCodeBtn.classList.remove('copied');
          }, 2000);
        } catch {
          host.toast(t('common.error'), 'error');
        }
        return;
      }

      const copyMermaidBtn = target.closest('[data-copy-mermaid]') as HTMLElement;
      if (copyMermaidBtn) {
        e.stopPropagation();
        const encoded = copyMermaidBtn.getAttribute('data-copy-mermaid') || '';
        try {
          await navigator.clipboard.writeText(decodeMermaidSource(encoded));
          copyMermaidBtn.classList.add('copied');
          setTimeout(() => copyMermaidBtn.classList.remove('copied'), 2000);
        } catch {
          host.toast(t('common.error'), 'error');
        }
        return;
      }

      const expandMermaidBtn = target.closest('[data-expand-mermaid]') as HTMLElement;
      if (expandMermaidBtn) {
        e.stopPropagation();
        const cardId = expandMermaidBtn.getAttribute('data-expand-mermaid') || '';
        const card = document.querySelector(`.mermaid-card[data-mermaid-card="${cardId}"]`);
        const diagramEl = card?.querySelector('.mermaid-diagram');
        const svgEl = diagramEl?.querySelector('svg');
        const encoded = diagramEl?.getAttribute('data-mermaid-source') || '';
        const rawSource = decodeMermaidSource(encoded) || diagramEl?.textContent || '';

        if (svgEl) {
          MermaidModal.open(svgEl.outerHTML, rawSource);
        } else if (rawSource) {
          MermaidModal.open(`<div class="mermaid-diagram" id="${cardId}">${rawSource}</div>`, rawSource);
        }
        return;
      }

      // Image Studio Expand Modal
      const expandImgBtn = target.closest('[data-expand-image]') as HTMLElement;
      if (expandImgBtn) {
        e.stopPropagation();
        const cardId = expandImgBtn.getAttribute('data-expand-image') || '';
        const card = document.querySelector(`.ai-image-card[data-image-card="${cardId}"]`);
        const imgEl = card?.querySelector('.ai-image-preview') as HTMLImageElement | null;
        const promptEl = card?.querySelector('.ai-image-prompt span:last-child');
        const prompt = promptEl?.textContent || 'Image IA';
        if (imgEl?.src) {
          ImageModal.open(imgEl.src, prompt);
        }
        return;
      }

      // Image Studio Download Image
      const downloadImgBtn = target.closest('[data-download-image]') as HTMLElement;
      if (downloadImgBtn) {
        e.stopPropagation();
        const cardId = downloadImgBtn.getAttribute('data-download-image') || '';
        const card = document.querySelector(`.ai-image-card[data-image-card="${cardId}"]`);
        const imgEl = card?.querySelector('.ai-image-preview') as HTMLImageElement | null;
        const promptEl = card?.querySelector('.ai-image-prompt span:last-child');
        const prompt = promptEl?.textContent || 'image';
        if (imgEl?.src) {
          const a = document.createElement('a');
          a.href = imgEl.src;
          const safeName = prompt.slice(0, 30).replace(/[^a-zA-Z0-9_\-\u0600-\u06FF]/g, '_') || 'image';
          a.download = `AI_Widget_${safeName}_${Date.now()}.png`;
          document.body.appendChild(a);
          a.click();
          setTimeout(() => document.body.removeChild(a), 200);
          host.toast(t('imageStudio.downloadSuccess', { defaultValue: 'Image téléchargée !' }), 'success');
        }
        return;
      }

      // Image Studio Copy Image
      const copyImgBtn = target.closest('[data-copy-image]') as HTMLElement;
      if (copyImgBtn) {
        e.stopPropagation();
        const cardId = copyImgBtn.getAttribute('data-copy-image') || '';
        const card = document.querySelector(`.ai-image-card[data-image-card="${cardId}"]`);
        const imgEl = card?.querySelector('.ai-image-preview') as HTMLImageElement | null;
        if (imgEl?.src) {
          try {
            const resp = await fetch(imgEl.src);
            const blob = await resp.blob();
            await navigator.clipboard.write([
              new ClipboardItem({
                [blob.type]: blob,
              }),
            ]);
            host.toast(t('chat.copied'), 'success');
          } catch {
            host.toast(t('common.error'), 'error');
          }
        }
        return;
      }

      // Image Studio Regenerate
      const regenImgBtn = target.closest('[data-regen-image]') as HTMLElement;
      if (regenImgBtn) {
        e.stopPropagation();
        const rawPrompt = decodeURIComponent(regenImgBtn.getAttribute('data-regen-image') || '');
        const chatInput = host.getChatInput();
        if (chatInput && rawPrompt) {
          chatInput.value = `Dessine ${rawPrompt}`;
          host.autoResizeTextarea();
          const sendBtn = document.getElementById('sendBtn');
          sendBtn?.click();
        }
        return;
      }

      // Image Studio 1-Click Install Engine
      const installSdBtn = target.closest('[data-install-sd]') as HTMLElement;
      if (installSdBtn) {
        e.stopPropagation();
        const setupBox = installSdBtn.closest('.ai-image-setup-box') as HTMLElement | null;
        if (setupBox) {
          setupBox.innerHTML = `
            <div class="ai-image-setup-icon">⏳</div>
            <div class="ai-image-setup-info">
              <h4>${t('imageStudio.downloadingEngine', { defaultValue: 'Téléchargement du moteur en cours...' })}</h4>
              <p id="sdInlineStatusText">${t('imageStudio.generatingHint', { defaultValue: 'Connexion aux serveurs de téléchargement...' })}</p>
            </div>
            <div class="ai-image-download-progress-wrap">
              <div class="ai-image-download-progress-bar">
                <div class="ai-image-download-progress-fill" id="sdInlineFill" style="width: 5%;"></div>
              </div>
              <div class="ai-image-download-progress-text">
                <span id="sdInlineStatusLabel">0%</span>
                <span id="sdInlineSpeed">Modèle IA 1.5 Go</span>
              </div>
            </div>
          `;
        }

        try {
          await sdManager.downloadEngine((p) => {
            const fill = document.getElementById('sdInlineFill');
            const label = document.getElementById('sdInlineStatusLabel');
            const statusText = document.getElementById('sdInlineStatusText');
            if (fill) fill.style.width = `${Math.max(5, p.percentage)}%`;
            if (label) label.textContent = `${Math.round(p.percentage)}%`;
            if (statusText) statusText.textContent = p.status;
          });
          host.toast(t('imageStudio.engineReady', { defaultValue: 'Moteur d\'images prêt !' }), 'success');
          const chatCtrl = (host as any).chatController;
          if (chatCtrl) chatCtrl.renderMessagesView();
        } catch (err: any) {
          console.error('Install SD failed:', err);
          const msg = typeof err === 'string' ? err : err?.message || t('common.error');
          host.toast(msg, 'error');
          const chatCtrl = (host as any).chatController;
          if (chatCtrl) chatCtrl.renderMessagesView();
        }
        return;
      }

      const promptBtn = target.closest('[data-fill-prompt]') as HTMLElement;
      const chatInput = host.getChatInput();
      if (promptBtn && chatInput) {
        const text = promptBtn.getAttribute('data-fill-prompt') || '';
        chatInput.value = text;
        host.autoResizeTextarea();
        chatInput.focus();
        return;
      }
      const retryWebBtn = target.closest('[data-trigger-web-retry]') as HTMLElement;
      if (retryWebBtn) {
        host.showWebPrivacyModal('post-refusal');
        return;
      }

      const copyBtn = target.closest('[data-copy]') as HTMLElement;
      if (copyBtn) {
        const id = copyBtn.getAttribute('data-copy')!;
        void host.copyMessage(id);
        return;
      }

      const regenBtn = target.closest('[data-regenerate]') as HTMLElement;
      if (regenBtn) {
        const id = regenBtn.getAttribute('data-regenerate')!;
        void host.regenerateMessage(id);
        return;
      }

      const editBtn = target.closest('[data-edit]') as HTMLElement;
      if (editBtn) {
        const id = editBtn.getAttribute('data-edit')!;
        void host.editMessage(id);
        return;
      }
    });
  }
}
