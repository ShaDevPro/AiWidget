/**
 * ChatController — Orchestrates message send, generation, streaming, and web-search intent.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { autoCloseMarkdown, formatSmartMessageTimestamp, generateSmartTitle, renderMarkdown } from '../../utils';
import { prepareAssistantMarkdown } from '../markdown/normalizeMarkdown';
import { finalizeMermaidDiagrams } from '../markdown/renderMermaidDiagrams';
import { escapeText } from '../../utils/dom';
import { icons } from '../../ui/icons';
import type { AppSettings, LLMModel, Message, UserQuota } from '../../types';
import type { ChatModule } from './ChatModule';
import type { StreamModule } from '../stream/StreamModule';
import type { SidebarModule } from '../sidebar/SidebarModule';
import type { DocumentManager } from '../document/DocumentManager';
import type { ThinkingAnimator } from './ThinkingAnimator';
import type { ToastService } from '../../ui/ToastService';
import { MessageRenderer } from './MessageRenderer';
import { parseUserDisplayContent, resolveUserDisplayText } from './UserMessageRenderer';
import { WebPermissionGate } from '../web/WebPermissionGate';
import type { ModalsManager } from '../modals/ModalsManager';
import { isVisionModel } from '../../utils/visionModels';
import { sdManager } from '../image/SDManager';
import { ImageCardRenderer, generateImageCardId } from '../image/ImageCardRenderer';
import { telemetryService } from '../telemetry/TelemetryService';

export interface ChatControllerDeps {
  chatModule: ChatModule;
  streamModule: StreamModule;
  sidebarModule: SidebarModule;
  documentManager: DocumentManager;
  thinkingAnimator: ThinkingAnimator;
  toast: ToastService;
  getSettings: () => AppSettings;
  getModels: () => LLMModel[];
  isConnected: () => boolean;
  getWebSearchEnabled: () => boolean;
  setWebSearchEnabled: (v: boolean) => void;
  getCourseStudioEnabled?: () => boolean;
  setCourseStudioEnabled?: (v: boolean) => void;
  onTriggerCourseStudio?: (subject: string) => void;
  getWebSearchPrivacyAccepted: () => boolean;
  getCurrentQuota: () => UserQuota | null;
  getChatInput: () => HTMLTextAreaElement | null;
  getChatContainer: () => HTMLElement | null;
  getPendingVoiceText: () => string | null;
  clearPendingVoiceText: () => void;
  onVoiceTriggeredResponse: (response: string) => void;
  onVoiceThinkingReset: () => void;
  refreshConvList: () => void;
  updateTitles: () => void;
  updateSendButton: () => void;
  autoResizeTextarea: () => void;
  renderMessages: () => string;
  renderEmptyChat: () => string;
  showConnectionError: () => void;
  showWebPrivacyModal: (context?: 'pre-generate' | 'post-refusal') => void;
  getModalsManager: () => ModalsManager;
  refreshQuota: () => Promise<void>;
  newConversation: () => Promise<void>;
  getRagDocCount: () => number;
  syncWebToggleButtons: () => void;
}

export class ChatController {
  private streamRafScheduled = false;
  private sendLock = false;
  private webGate: WebPermissionGate;

  constructor(private deps: ChatControllerDeps) {
    this.webGate = new WebPermissionGate(deps.getModalsManager());
  }

  async sendMessage(): Promise<void> {
    const chat = this.deps.chatModule;
    if (chat.isGenerating || this.sendLock) return;
    this.sendLock = true;

    try {
      await this.sendMessageInternal();
    } finally {
      this.sendLock = false;
    }
  }

  private async sendMessageInternal(): Promise<void> {
    const chat = this.deps.chatModule;
    if (chat.isGenerating) return;

    const chatInput = this.deps.getChatInput();
    let text = chatInput?.value.trim() || this.deps.getPendingVoiceText()?.trim() || '';
    this.deps.clearPendingVoiceText();

    const attachedDoc = this.deps.documentManager.getAttachedDocument();
    if (!text && !attachedDoc) return;

    telemetryService.trackEvent('chat');

    if (this.deps.getCourseStudioEnabled?.() && this.deps.onTriggerCourseStudio && text) {
      this.deps.onTriggerCourseStudio(text);
      return;
    }

    if (!text && attachedDoc) text = t('doc.summarizePrompt');

    let conv = this.deps.sidebarModule.currentConversation;
    if (!conv) {
      await this.deps.newConversation();
      conv = this.deps.sidebarModule.currentConversation;
      if (!conv) return;
    }

    const settings = this.deps.getSettings();
    const models = this.deps.getModels();
    const model = conv.model || settings.default_model || models[0]?.name || '';

    let promptToSend = text;
    let displayedUserContent = text;
    let messageImages: string[] | undefined;

    if (attachedDoc) {
      const useVision = attachedDoc.type === 'image' && isVisionModel(model);

      if (useVision) {
        const b64 = await this.deps.documentManager.resolveImageBase64(attachedDoc);
        if (b64) messageImages = [b64];
        promptToSend = text;
        displayedUserContent = `🖼️ **[${attachedDoc.name}]**\n\n${text}`;
      } else if (attachedDoc.status === 'loading') {
        this.deps.toast.show(t('doc.ocrProcessing'), 'info');
        return;
      } else if (attachedDoc.extractedText !== undefined && attachedDoc.extractedText !== null) {
        if (attachedDoc.extractedText.length > 8000) {
          this.deps.toast.show(t('doc.truncatedWarning'), 'warning');
        }
        promptToSend = this.deps.documentManager.buildPromptWithContext(text);
        displayedUserContent = `📎 **[${attachedDoc.name}]**\n\n${text}`;
      } else if (attachedDoc.status === 'error') {
        this.deps.toast.show(attachedDoc.errorMessage || t('common.error'), 'error');
        return;
      }

      this.deps.documentManager.clearAttachedDocument();
    }

    const defaultTitles = [t('sidebar.newChat'), 'Nouvelle conversation', 'New Chat', 'محادثة جديدة', 'Discussion'];
    if (!conv.title || defaultTitles.includes(conv.title)) {
      const smartTitle = generateSmartTitle(text);
      conv.title = smartTitle;
      void api.updateConversationTitle(conv.id, smartTitle);
    }

    const hasLlmPayload = promptToSend !== displayedUserContent;
    const userMsg = await api.saveMessage({
      conversation_id: conv.id,
      role: 'user',
      content: displayedUserContent,
      ...(hasLlmPayload ? { llmContent: promptToSend } : {}),
    });
    chat.messages.push({
      ...userMsg,
      ...(messageImages ? { images: messageImages } : {}),
    });

    if (chatInput) chatInput.value = '';
    this.deps.autoResizeTextarea();
    this.renderMessagesView();
    this.deps.updateTitles();
    this.deps.streamModule.scrollSmooth();
    this.deps.refreshConvList();

    if (!this.deps.getWebSearchEnabled() && model) {
      const decision = await this.webGate.evaluateBeforeGenerate({
        query: text,
        model,
        baseUrl: settings.ollama_base_url,
        webEnabled: this.deps.getWebSearchEnabled(),
      });

      if (decision.type === 'generate_with_web') {
        this.deps.setWebSearchEnabled(true);
        this.deps.syncWebToggleButtons();
      } else if (decision.type === 'offline_honest') {
        await this.postOfflineHonestResponse(decision.intent.category);
        return;
      }
    }

    await this.generateResponse();
  }

  /** Honest offline card when user denies web for a live-data query (no LLM hallucination). */
  private async postOfflineHonestResponse(category: string): Promise<void> {
    const chat = this.deps.chatModule;
    const conv = this.deps.sidebarModule.currentConversation;
    if (!conv) return;

    const content = WebPermissionGate.offlineHonestContent(category);
    const savedMsg = await api.saveMessage({
      conversation_id: conv.id,
      role: 'assistant',
      content,
    });
    chat.messages.push(savedMsg);
    this.renderMessagesView();
    this.deps.refreshConvList();
    this.deps.streamModule.scrollSmooth();
  }

  /** Stop in-flight generation (backend cancel + UI). */
  requestStop(): void {
    const chat = this.deps.chatModule;
    if (!chat.isGenerating) return;
    chat.stopRequested = true;
    void api.cancelGeneration().catch(() => {});
  }

  /** Regenerate an assistant message (removes it and re-runs generation). */
  async regenerateResponse(assistantMsgId: string): Promise<void> {
    const chat = this.deps.chatModule;
    if (chat.isGenerating) return;

    const idx = chat.messages.findIndex((m) => m.id === assistantMsgId);
    if (idx < 0 || chat.messages[idx].role !== 'assistant') return;

    try {
      await api.deleteMessage(assistantMsgId);
    } catch {
      this.deps.toast.show(t('common.error'), 'error');
      return;
    }

    chat.messages.splice(idx, 1);
    this.renderMessagesView();
    await this.generateResponse();
  }

  /** Edit a user message: truncate thread from that point and pre-fill the input. */
  async editMessage(userMsgId: string): Promise<void> {
    const chat = this.deps.chatModule;
    if (chat.isGenerating) return;

    const idx = chat.messages.findIndex((m) => m.id === userMsgId);
    if (idx < 0 || chat.messages[idx].role !== 'user') return;

    const msg = chat.messages[idx];
    const conv = this.deps.sidebarModule.currentConversation;
    if (!conv) return;

    try {
      await api.deleteMessagesFrom(conv.id, msg.created_at);
    } catch {
      this.deps.toast.show(t('common.error'), 'error');
      return;
    }

    chat.messages.splice(idx);
    const displayText = resolveUserDisplayText(msg);
    const parsed = parseUserDisplayContent(displayText);
    const textToEdit = parsed.body || displayText.replace(/^📎|🖼️[\s\S]*?\n\n/, '').trim();

    const chatInput = this.deps.getChatInput();
    if (chatInput) {
      chatInput.value = textToEdit;
      this.deps.autoResizeTextarea();
      chatInput.focus();
    }

    this.renderMessagesView();
    this.deps.streamModule.scrollSmooth();
  }

  async generateResponse(): Promise<void> {
    const chat = this.deps.chatModule;
    const conv = this.deps.sidebarModule.currentConversation;
    if (!conv) return;

    if (!this.deps.isConnected()) {
      this.deps.showConnectionError();
      return;
    }

    const settings = this.deps.getSettings();
    const models = this.deps.getModels();
    const model = conv.model || settings.default_model || models[0]?.name;
    if (!model) {
      this.deps.toast.show(t('chat.noModelSelected'), 'error');
      return;
    }

    const lastUserMsg = [...chat.messages].reverse().find((m) => m.role === 'user');
    const userPromptText = lastUserMsg ? (lastUserMsg.llmContent ?? lastUserMsg.displayContent ?? lastUserMsg.content) : '';

    // Détection d'intention de génération d'image locale (Stable Diffusion)
    const { isImage, cleanPrompt } = sdManager.isImagePrompt(userPromptText);
    if (isImage && cleanPrompt) {
      await this.handleImageGeneration(cleanPrompt, conv.id);
      return;
    }

    const isDiagramRequest =
      lastUserMsg &&
      /\b(diagramme|diagram|schéma|schema|flowchart|graphe|graphique|mindmap|مخطط|رسم بياني)\b/i.test(
        userPromptText,
      );

    let systemPromptContent = `${t('systemPrompt.default')}\n\n${t('systemPrompt.context')}\n\n${t('systemPrompt.mermaid')}`;
    if (isDiagramRequest) {
      systemPromptContent += `\n\n[DIRECTIVE ABSOLUE : L'utilisateur demande expressément un diagramme ou schéma. Tu DOIS OBLIGATOIREMENT et DIRECTEMENT produire un bloc \`\`\`mermaid ... \`\`\` complet, fonctionnel et structuré (flowchart TD/LR ou sequenceDiagram) représentant exactement ce qui est demandé. Ne te présente JAMAIS et commence directement.]`;
    }

    const history = [
      {
        role: 'system' as const,
        content: systemPromptContent,
      },
      ...chat.messages
        .filter((m) => !(m.role === 'assistant' && !m.content.trim()))
        .map((m) => ({
          role: m.role,
          content:
            m.role === 'user'
              ? (m.llmContent ?? m.displayContent ?? m.content)
              : m.content,
          ...(m.images?.length ? { images: m.images } : {}),
        })),
    ];

    chat.isGenerating = true;
    chat.stopRequested = false;
    this.deps.updateSendButton();

    const pendingMsg: Message = {
      id: 'pending-' + Date.now(),
      conversation_id: conv.id,
      role: 'assistant',
      content: '',
      created_at: new Date().toISOString(),
    };
    chat.pendingAssistantId = pendingMsg.id;
    chat.pendingWebSources = [];
    chat.messages.push(pendingMsg);
    this.renderMessagesView();
    this.deps.thinkingAnimator.start(this.deps.getWebSearchEnabled(), this.deps.getRagDocCount() > 0);
    this.deps.streamModule.startStream();
    this.deps.streamModule.scrollSmooth();

    try {
      const fullResponse = await api.generateResponse(
        model,
        history,
        settings.temperature,
        settings.max_tokens,
        settings.ollama_base_url,
        this.deps.getWebSearchEnabled(),
      );

      const lastIdx = chat.messages.length - 1;
      if (lastIdx >= 0 && chat.messages[lastIdx].id === pendingMsg.id) {
        await this.finalizeAssistantMessage(pendingMsg.id, fullResponse);

        const savedMsg = chat.messages[chat.messages.length - 1];
        if (
          savedMsg?.role === 'assistant' &&
          !this.deps.getWebSearchEnabled() &&
          MessageRenderer.hasWebRefusal(savedMsg.content)
        ) {
          const choice = await this.webGate.evaluatePostRefusal({ context: 'post-refusal' });
          if (choice === 'allow') {
            this.deps.setWebSearchEnabled(true);
            this.deps.syncWebToggleButtons();
            chat.messages.pop();
            this.renderMessagesView();
            await this.generateResponse();
          }
        }
      }
    } catch (e) {
      const errStr = String(e);
      const lastIdx = chat.messages.length - 1;
      if (errStr.includes('ERR_GENERATION_CANCELLED')) {
        const partial = lastIdx >= 0 ? chat.messages[lastIdx].content.trim() : '';
        if (partial) {
          await this.finalizeAssistantMessage(pendingMsg.id, partial);
        } else if (lastIdx >= 0) {
          chat.messages.pop();
          this.renderMessagesView();
        }
        this.deps.toast.show(t('chat.stopped'), 'info');
      } else if (errStr.includes('ERR_QUOTA_EXCEEDED')) {
        const quotaMsg = t('quota.exceededDesc', { limit: this.deps.getCurrentQuota()?.daily_limit || 100 });
        if (lastIdx >= 0 && chat.messages[lastIdx].role === 'assistant') {
          chat.messages[lastIdx].content = `<div class="error-box" style="border-color:#f59e0b;background:rgba(245,158,11,0.08);color:#b45309;">⚡ <strong>${t('quota.exceededTitle')}</strong><br>${quotaMsg}</div>`;
        }
        this.renderMessagesView();
        this.deps.toast.show(quotaMsg, 'warning');
      } else {
        let errMsg = (e as Error).message || String(e);
        if (!errMsg || errMsg === 'undefined') errMsg = t('chat.modelError');
        if (lastIdx >= 0 && chat.messages[lastIdx].role === 'assistant') {
          chat.messages[lastIdx].content = `<div class="error-box">${icons.warn} ${escapeText(errMsg)}</div>`;
        }
        this.renderMessagesView();
        this.deps.toast.show(errMsg, 'error');
      }
    } finally {
      this.deps.streamModule.endStream();
      this.deps.thinkingAnimator.stop();
      chat.isGenerating = false;
      chat.stopRequested = false;
      chat.pendingAssistantId = null;
      chat.pendingWebSources = [];
      this.deps.updateSendButton();
      void this.deps.refreshQuota();
      this.deps.onVoiceThinkingReset();
    }
  }

  private async finalizeAssistantMessage(pendingId: string, fullResponse: string): Promise<void> {
    const chat = this.deps.chatModule;
    const conv = this.deps.sidebarModule.currentConversation;
    if (!conv) return;

    const lastIdx = chat.messages.length - 1;
    if (lastIdx < 0 || chat.messages[lastIdx].id !== pendingId) return;

    const streamed = chat.messages[lastIdx].content;
    const finalContent = fullResponse || streamed || t('chat.modelError');
    const savedMsg = await api.saveMessage({
      conversation_id: conv.id,
      role: 'assistant',
      content: finalContent,
      ...(chat.pendingWebSources.length > 0
        ? { webSources: [...chat.pendingWebSources] }
        : {}),
    });

    chat.messages[lastIdx] = savedMsg;
    chat.pendingAssistantId = null;
    chat.pendingWebSources = [];

    const msgEl = document.querySelector(`[data-msg-id="${pendingId}"]`) as HTMLElement;
    if (msgEl) {
      msgEl.setAttribute('data-msg-id', savedMsg.id);
      this.renderMessagesView();
    } else {
      this.renderMessagesView();
    }

    this.deps.refreshConvList();
    this.deps.onVoiceTriggeredResponse(finalContent);
  }

  appendStreamingToken(content: string, done = false): void {
    if (!content && !done) return;
    const chat = this.deps.chatModule;
    const lastIdx = chat.messages.length - 1;
    if (lastIdx < 0 || chat.messages[lastIdx].role !== 'assistant') return;

    if (content) {
      chat.messages[lastIdx].content += content;
    }
    const msgId = chat.messages[lastIdx].id;
    const createdAt = chat.messages[lastIdx].created_at;
    const settings = this.deps.getSettings();
    const conv = this.deps.sidebarModule.currentConversation;

    let msgEl = document.querySelector(`[data-msg-id="${msgId}"]`) as HTMLElement;
    if (!msgEl) {
      this.renderMessagesView();
      msgEl = document.querySelector(`[data-msg-id="${msgId}"]`) as HTMLElement;
      if (!msgEl) return;
    }

    let bubbleEl = msgEl.querySelector('.message-bubble') as HTMLElement;
    if (msgEl.querySelector('.thinking-premium-card') || !bubbleEl) {
      this.deps.thinkingAnimator.stop();
      msgEl.classList.remove('pending');
      const shortModel = (conv?.model || settings.default_model || 'IA').split(':')[0];
      const timestamp = formatSmartMessageTimestamp(createdAt, settings.language);
      msgEl.innerHTML = `
        <div class="message-body">
          <div class="msg-bot-header">
            <img src="/logo.png" class="msg-bot-logo" alt="Logo" />
            <span class="msg-bot-name">WidgetAI</span>
            <span class="msg-bot-model">${escapeText(shortModel)}</span>
            <span class="msg-timestamp">${timestamp}</span>
          </div>
          <div class="message-bubble markdown-body streaming-plain"></div>
          <div class="message-actions">
            <button class="message-action-btn" data-copy="${msgId}" title="${t('chat.copy')}">${icons.copy}</button>
          </div>
        </div>`;
      bubbleEl = msgEl.querySelector('.message-bubble') as HTMLElement;
    }

    const renderBubble = () => {
      if (!bubbleEl) return;
      const currentText = chat.messages[chat.messages.length - 1]?.content ?? '';
      if (done) {
        bubbleEl.classList.remove('streaming-plain');
        const prepared = prepareAssistantMarkdown(currentText);
        bubbleEl.innerHTML = renderMarkdown(autoCloseMarkdown(prepared));
        finalizeMermaidDiagrams(bubbleEl);
      } else {
        bubbleEl.innerHTML =
          escapeText(currentText).replace(/\n/g, '<br>') +
          '<span class="stream-cursor" aria-hidden="true"></span>';
      }
      this.deps.streamModule.onToken();
    };

    if (bubbleEl && (!this.streamRafScheduled || done)) {
      if (this.streamRafScheduled && done) {
        this.streamRafScheduled = false;
        renderBubble();
        return;
      }
      this.streamRafScheduled = true;
      requestAnimationFrame(() => {
        this.streamRafScheduled = false;
        renderBubble();
      });
    }
  }

  renderMessagesView(): void {
    const container = this.deps.getChatContainer();
    if (!container) return;
    const conv = this.deps.sidebarModule.currentConversation;
    container.innerHTML =
      conv && this.deps.chatModule.messages.length > 0
        ? this.deps.renderMessages()
        : this.deps.renderEmptyChat();
    finalizeMermaidDiagrams(container);
  }

  async copyMessage(id: string): Promise<void> {
    const msg = this.deps.chatModule.messages.find((m) => m.id === id);
    if (!msg) return;
    const text =
      msg.role === 'user' ? resolveUserDisplayText(msg) : msg.content;
    try {
      await navigator.clipboard.writeText(text);
      this.deps.toast.show(t('chat.copied'), 'success');
    } catch {
      this.deps.toast.show(t('common.error'), 'error');
    }
  }

  async handleImageGeneration(prompt: string, convId: string): Promise<void> {
    const chat = this.deps.chatModule;
    const isReady = await sdManager.isReady();

    if (!isReady) {
      const cardHtml = ImageCardRenderer.renderEngineNotReadyCard();
      const savedMsg = await api.saveMessage({
        conversation_id: convId,
        role: 'assistant',
        content: cardHtml,
      });
      chat.messages.push(savedMsg);
      chat.isGenerating = false;
      this.deps.updateSendButton();
      this.renderMessagesView();
      this.deps.streamModule.scrollSmooth();
      return;
    }

    const cardId = generateImageCardId();
    const generatingHtml = ImageCardRenderer.renderGeneratingCard(prompt, cardId);

    chat.isGenerating = true;
    this.deps.updateSendButton();

    const pendingMsg: Message = {
      id: 'pending-' + Date.now(),
      conversation_id: convId,
      role: 'assistant',
      content: generatingHtml,
      created_at: new Date().toISOString(),
    };
    chat.messages.push(pendingMsg);
    this.renderMessagesView();
    this.deps.streamModule.scrollSmooth();

    try {
      const preferredModel = this.deps.getSettings().sd_active_model;
      const isSD15 = Boolean(preferredModel && preferredModel.includes('1.5'));
      const dim = isSD15 ? 512 : 1024;
      const steps = 15;
      const result = await sdManager.generateImage(prompt, undefined, dim, dim, steps, cardId, 'cinematic', preferredModel);
      const readyHtml = ImageCardRenderer.renderImageCard(result, cardId);

      const savedMsg = await api.saveMessage({
        conversation_id: convId,
        role: 'assistant',
        content: readyHtml,
      });

      const lastIdx = chat.messages.findIndex((m) => m.id === pendingMsg.id);
      if (lastIdx !== -1) {
        chat.messages[lastIdx] = savedMsg;
      }
    } catch (err: any) {
      console.error('Image generation failed:', err);
      const errorMsg = String(err?.message || err || 'Erreur inconnue');
      const errHtml = `
        <div class="ai-image-card error" id="${cardId}">
          <div class="ai-image-setup-box">
            <div class="ai-image-setup-icon">⚠️</div>
            <div class="ai-image-setup-info">
              <h4>${t('imageStudio.generationError', { defaultValue: 'Erreur de génération' })}</h4>
              <p>${escapeText(errorMsg)}</p>
            </div>
          </div>
        </div>`;
      const savedMsg = await api.saveMessage({
        conversation_id: convId,
        role: 'assistant',
        content: errHtml,
      });
      const lastIdx = chat.messages.findIndex((m) => m.id === pendingMsg.id);
      if (lastIdx !== -1) {
        chat.messages[lastIdx] = savedMsg;
      }
      this.deps.toast.show(t('imageStudio.generationError', { defaultValue: 'Erreur de génération d\'image' }), 'error');
    } finally {
      chat.isGenerating = false;
      this.deps.updateSendButton();
      this.renderMessagesView();
      this.deps.streamModule.scrollSmooth();
    }
  }
}
