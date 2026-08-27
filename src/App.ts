import { api } from './api';
import { setTransport, HttpSseTransport, TauriIpcTransport } from './api/_core';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { t, changeLanguage, currentLanguage, initI18n, isRTL } from './i18n';
import type { AppSettings, Conversation, LLMModel, Message, UserMemory, RAGDocument, LicenseTier, MessageSearchResult, VectorDBStats, RAGSemanticSearchResult, UserQuota, WebSource } from './types';
import { icons } from './ui/icons';
import { getWhisperStatus, downloadWhisper, listTTSVoices, previewVoice } from './ui/VoiceManager';
import { OnboardingModal } from './ui/Onboarding';
import {
  formatDate,
  formatMessageTime,
  getConversationTitle,
  getDateGroupKey,
} from './utils';
import { RECOMMENDED_MODELS, type RecommendedModel } from './constants/recommendedModels';
import { BUBBLE_SIZE, COMPACT_SIZE, COMPACT_SIZE_TALL, DEFAULT_EXPANDED_SIZE } from './constants/widgetSizes';
import { escapeText, getSafeId } from './utils/dom';
import { detectSystemLanguage } from './utils/locale';
import { isVisionModel } from './utils/visionModels';
import { ToastService, type ToastType } from './ui/ToastService';
import { ThemeService } from './ui/ThemeService';
import { ThinkingAnimator } from './modules/chat/ThinkingAnimator';
import { ChatController } from './modules/chat/ChatController';
import { VoiceController } from './modules/voice/VoiceController';
import { LicenseModule } from './modules/license/LicenseModule';
import { ModelsModule } from './modules/models/ModelsModule';
import { VoiceModule, ChatModule, SearchModule, SidebarModule, SettingsModule, StreamModule, StatsModule, ProfileModule, ModalsManager, MessageRenderer } from './modules';
import { DocumentManager } from './modules/document/DocumentManager';
import { ExportManager } from './modules/chat/ExportManager';
import type { ProfilePublic } from './modules/profile/ProfileModule';
import { helpModule } from './modules/help/HelpModule';
import { aboutModule } from './modules/about/AboutModule';
import { contactModule } from './modules/contact/ContactModule';
import { legalModule } from './modules/legal/LegalModule';
import { footerMenuModule } from './modules/menu/FooterMenuModule';
import { SuggestionsService } from './modules/suggestions/SuggestionsService';
import { SettingsView } from './modules/settings/SettingsView';
import { SettingsController } from './modules/settings/SettingsController';
import type { SettingsHost } from './modules/settings/SettingsHost';
import { WidgetShell } from './modules/shell/WidgetShell';
import type { ShellHost } from './modules/shell/ShellHost';

export type { RecommendedModel };
export { RECOMMENDED_MODELS };
import type { WidgetMode } from './constants/widgetMode';
export type { WidgetMode };

class App implements SettingsHost, ShellHost {
  settings: AppSettings = {
    language: 'fr',
    ollama_base_url: 'http://localhost:11434',
    temperature: 0.7,
    max_tokens: 2048,
    default_model: 'qwen2.5:1.5b',
    theme: 'light',
    voice_enabled: false,
    voice_auto_speak: true,
    voice_continuous_mode: false,
    voice_id: 'fr-FR-DeniseNeural',
    voice_speed: 1.0,
    whisper_model: 'base',
    execution_mode: 'lite',
    server_url: 'http://localhost:8080',
    server_auth_token: '',
  };

  models: LLMModel[] = [];
  isConnected = false;
  settingsOpen = false;
  searchQuery = '';
  pinned = false;        // désactivé par défaut — les néophytes ne savent pas désépingler
  sidebarOpen = false;   // sidebar fermée par défaut en format intermédiaire (ouverte en plein écran)
  settingsTab = 'general'; // onglet settings actif
  mode: WidgetMode = 'compact';
  lastExpandedSize = { ...DEFAULT_EXPANDED_SIZE };
  ragDocuments: RAGDocument[] = [];
  userMemories: UserMemory[] = [];
  isDraggingFile = false;
  webSearchEnabled = false;
  webSearchPrivacyAccepted = localStorage.getItem('aiwidget_web_privacy_accepted') === 'true';

  private el: HTMLElement;
  private chatContainer: HTMLElement | null = null;
  private chatInput: HTMLTextAreaElement | null = null;
  private pendingDeleteId: string | null = null;
  private isResizing = false;

  // ── Module instances (modular architecture) ───────────────────
  readonly voiceModule = new VoiceModule();
  readonly chatModule = new ChatModule();
  readonly searchModule = new SearchModule();
  readonly sidebarModule = new SidebarModule();
  readonly settingsModule = new SettingsModule();
  readonly streamModule = new StreamModule();
  readonly statsModule = new StatsModule();
  readonly profileModule = new ProfileModule();
  readonly toastService = new ToastService();
  readonly themeService = new ThemeService();
  readonly thinkingAnimator = new ThinkingAnimator();
  readonly licenseModule = new LicenseModule(this.toastService);
  chatController!: ChatController;
  voiceController!: VoiceController;
  modelsModule!: ModelsModule;
  readonly settingsView = new SettingsView();
  readonly settingsController = new SettingsController();
  readonly widgetShell = new WidgetShell();
  readonly modalsManager = new ModalsManager();
  readonly documentManager: DocumentManager;
  activeProfile: ProfilePublic | null = null;
  isAutostartEnabled = false;
  messageSearchResults: MessageSearchResult[] = [];
  vectorDbStats: VectorDBStats | null = null;
  semanticTestResults: RAGSemanticSearchResult[] = [];
  semanticSearchQuery = '';

  constructor() {
    this.el = document.getElementById('app')!;
    this.documentManager = new DocumentManager(() => this.renderAttachmentBar());

    this.chatController = new ChatController({
      chatModule: this.chatModule,
      streamModule: this.streamModule,
      sidebarModule: this.sidebarModule,
      documentManager: this.documentManager,
      thinkingAnimator: this.thinkingAnimator,
      toast: this.toastService,
      getSettings: () => this.settings,
      getModels: () => this.models,
      isConnected: () => this.isConnected,
      getWebSearchEnabled: () => this.webSearchEnabled,
      setWebSearchEnabled: (v) => { this.webSearchEnabled = v; },
      getWebSearchPrivacyAccepted: () => this.webSearchPrivacyAccepted,
      getCurrentQuota: () => this.licenseModule.currentQuota,
      getChatInput: () => this.chatInput,
      getChatContainer: () => this.chatContainer,
      getPendingVoiceText: () => this.voiceModule.pendingVoiceText,
      clearPendingVoiceText: () => { this.voiceModule.pendingVoiceText = null; },
      onVoiceTriggeredResponse: (response) => this.voiceController.handleVoiceResponse(response),
      onVoiceThinkingReset: () => this.voiceController.resetThinkingState(),
      refreshConvList: () => this.refreshConvList(),
      updateTitles: () => this.updateTitles(),
      updateSendButton: () => this.updateSendButton(),
      autoResizeTextarea: () => this.autoResizeTextarea(),
      renderMessages: () => this.renderMessages(),
      renderEmptyChat: () => this.renderEmptyChat(),
      showConnectionError: () => this.showConnectionError(),
      showWebPrivacyModal: (ctx) => this.showWebPrivacyModal(ctx),
      getModalsManager: () => this.modalsManager,
      refreshQuota: () => this.refreshQuota(),
      newConversation: () => this.newConversation(),
      getRagDocCount: () => this.ragDocuments.length,
      syncWebToggleButtons: () => this.syncWebToggleButtons(),
    });

    this.voiceController = new VoiceController({
      voiceModule: this.voiceModule,
      toast: this.toastService,
      getSettings: () => this.settings,
      checkFeatureAccess: (feature) => this.checkFeatureAccess(feature),
      promptLicense: (tier) => this.promptLicense(tier),
      toggleSettings: (open) => this.toggleSettings(open),
      onSendMessage: () => { void this.sendMessage(); },
      onRender: () => this.render(),
      onUpdateTitles: () => this.updateTitles(),
      onUpdateSendButton: () => this.updateSendButton(),
      getIsGenerating: () => this.chatModule.isGenerating,
      setIsGenerating: (v) => { this.chatModule.isGenerating = v; },
    });

    this.modelsModule = new ModelsModule({
      toast: this.toastService,
      getSettings: () => this.settings,
      setSettings: (s) => { this.settings = s; },
      getModels: () => this.models,
      setModels: (m) => { this.models = m; },
      isConnected: () => this.isConnected,
      setConnected: (v) => { this.isConnected = v; },
      getCurrentConversationModel: () => this.sidebarModule.currentConversation?.model,
      setConversationModel: (name) => {
        if (this.sidebarModule.currentConversation) {
          this.sidebarModule.currentConversation.model = name;
        }
      },
      refreshConnection: () => this.refreshConnection(),
      refreshModels: () => this.refreshModels(),
      updateTitles: () => this.updateTitles(),
      getMode: () => this.mode,
      setMode: (mode) => this.setMode(mode),
      toggleSettings: (open) => this.toggleSettings(open),
      renderSettings: () => this.renderSettings(),
      attachSettingsEvents: () => this.attachSettingsEvents(),
      settingsOpen: () => this.settingsOpen,
      getSettingsTab: () => this.settingsTab,
    });

    api.getAutostartStatus().then((status) => {
      this.isAutostartEnabled = status;
    }).catch(() => {});
    api.getVectorDBStats().then((stats) => {
      this.vectorDbStats = stats;
    }).catch(() => {});
  }

  async refreshQuota(): Promise<void> {
    await this.licenseModule.refreshQuota(() => this.licenseModule.updateQuotaUI());
  }

  getQuotaBadgeClass(): string {
    return this.licenseModule.getQuotaBadgeClass();
  }

  getQuotaLabel(): string {
    return this.licenseModule.getQuotaLabel();
  }

  getQuotaTooltip(): string {
    return this.licenseModule.getQuotaTooltip();
  }

  updateQuotaUI(): void {
    this.licenseModule.updateQuotaUI();
  }

  // ── Module wiring — connects all module callbacks ─────────────
  private wireModules(): void {
    this.voiceController.wireTranscription();

    this.sidebarModule.onConversationChange = async (conv) => {
      this.sidebarModule.currentConversation = conv;
      if (conv) {
        await this.chatModule.loadMessages(conv.id);
      } else {
        this.chatModule.clearMessages();
      }
      this.render();
      this.scrollToBottom();
    };

    // Search module state sync
    this.searchModule.toggleWebSearch(this.webSearchEnabled);

    // Settings changes → propagate to voice module
    this.settingsModule.onSettingsChange = (s) => {
      this.settings = s;
      if (s.voice_enabled) this.voiceController.init(s);
      this.themeService.apply(s.theme);
    };
    this.settingsModule.onLanguageChange = () => this.render();
    this.settingsModule.onRender = () => this.render();

    // Profile module onboarding launch hook
    this.profileModule.onLaunchOnboarding = () => this.showOnboarding();
  }


  private isListenersSetup = false;

  private setupGlobalListeners(): void {
    if (this.isListenersSetup) return;
    this.isListenersSetup = true;

    void api.onChatToken((content, done) => {
      if (done) {
        this.chatModule.isGenerating = false;
        this.chatModule.stopRequested = false;
      }
      this.appendStreamingToken(content, done);
      this.updateSendButton();
    });

    void listen<{ sources: WebSource[] }>('chat-web-sources', (e) => {
      const sources = e.payload?.sources;
      if (Array.isArray(sources) && sources.length > 0) {
        this.chatModule.pendingWebSources = sources;
      }
    });

    void api.onPullProgress((payload) => {
      this.renderPullProgress(payload);
    });

    void api.onGGUFDownloadProgress((p) => {
      this.renderPullProgress(p);
      if (p.percentage === 100) {
        void this.refreshModels();
        void this.modelsModule.refreshPartialDownloads();
      }
    });

    void listen<UserQuota>('quota-updated', (event) => {
      this.licenseModule.currentQuota = event.payload;
      this.licenseModule.updateQuotaUI();
    });
  }

  async init(): Promise<void> {
    this.wireModules();
    this.setupGlobalListeners();

    // ── Language: auto-detect Windows language, localStorage override ─
    const detectedLang = detectSystemLanguage();
    await initI18n(detectedLang);
    this.modalsManager.init();
    await this.profileModule.init(
      async (profile) => {
        this.activeProfile = profile;
        await this.loadAppAfterLogin();
      },
      () => {
        // On logout: clear all state
        this.activeProfile = null;
        this.sidebarModule.conversations = [];
        this.chatModule.messages = [];
        this.sidebarModule.currentConversation = null;
      },
    );
  }

  // Called after successful profile login
  private async loadAppAfterLogin(): Promise<void> {
    this.setupGlobalListeners();
    try {
      this.settings = await api.getSettings();
    } catch {
      // keep defaults
    }

    try {
      this.licenseModule.enterprisePolicy = await api.getEnterprisePolicy();
      if (this.licenseModule.enterprisePolicy?.is_managed) {
        if (this.licenseModule.enterprisePolicy.locked_mode) this.settings.execution_mode = (this.licenseModule.enterprisePolicy.locked_mode as 'lite' | 'pro');
        if (this.licenseModule.enterprisePolicy.enforced_server_url) this.settings.server_url = this.licenseModule.enterprisePolicy.enforced_server_url;
      }
    } catch { /* ignore */ }

    if (this.settings.execution_mode === 'pro' && this.settings.server_url) {
      setTransport(new HttpSseTransport(this.settings.server_url, this.settings.server_auth_token));
    } else {
      setTransport(new TauriIpcTransport());
    }

    if (!this.settings.theme) this.settings.theme = 'light';

    await initI18n(this.settings.language || 'fr');
    this.applyTheme(this.settings.theme);

    try {
      this.sidebarModule.conversations = await api.getConversations();
    } catch {
      this.sidebarModule.conversations = [];
    }

    if (this.sidebarModule.conversations.length > 0 && !this.sidebarModule.currentConversation) {
      this.sidebarModule.currentConversation = this.sidebarModule.conversations[0];
      try {
        this.chatModule.messages = await api.getMessages(this.sidebarModule.currentConversation.id);
      } catch {
        this.chatModule.messages = [];
      }
    }

    await this.refreshModels();
    await this.refreshConnection();
    await this.refreshRAGDocuments();
    await this.refreshUserMemories();
    await this.refreshQuota();
    await this.refreshLicenseStatus();
    this.render();
    this.updateTitles();
    this.updateStatus();
    this.setupDragAndDrop();

    // ── Always snap back to expanded widget mode after login ──
    // The profile overlay may have left the window at a different size.
    // Force resize to the correct widget dimensions and center it.
    await this.setMode('expanded');
    try { await api.widgetCenter(); } catch { /* ignore */ }

    this.updateTitles();
    this.updateStatus();
    this.setupDragAndDrop();

    this.initGlobalShortcuts();
    this.initVoice();

    // Check first launch onboarding or if models need installation
    const hasOnboarded = localStorage.getItem('aiwidget_onboarded') === 'true';
    const needsSetup = !hasOnboarded || (this.models.length === 0 && this.settings.execution_mode !== 'pro');
    if (needsSetup) {
      await this.setMode('expanded');
      try {
        await api.widgetCenter();
      } catch {
        // ignore
      }
      this.showOnboarding();
    } else {
      try {
        await api.widgetCenter();
      } catch {
        // ignore
      }
    }
  }

  showOnboarding(): void {
    const slot = document.getElementById('onboardingSlot') || document.body;
    const modal = new OnboardingModal(
      slot,
      this.isConnected,
      async (result) => {
        localStorage.setItem('aiwidget_onboarded', 'true');
        await this.refreshModels();
        await this.refreshConnection();
        this.updateTitles();
        this.updateStatus();

        if (result.language && result.language !== this.settings.language) {
          await this.setLanguage(result.language);
        }
        if (result.executionMode) {
          this.settings.execution_mode = result.executionMode;
          if (result.serverUrl) this.settings.server_url = result.serverUrl;
          if (result.serverToken) this.settings.server_auth_token = result.serverToken;
        }
        if (result.displayMode) {
          await this.setMode(result.displayMode);
        }
        if (result.initialPrompt) {
          if (!this.sidebarModule.currentConversation) {
            await this.newConversation();
          } else {
            this.sidebarModule.currentConversation.model = this.settings.default_model;
          }
          if (this.chatInput) {
            this.chatInput.value = result.initialPrompt;
            await this.sendMessage();
          }
        }
        this.updateTitles();
        this.updateStatus();
      },
      (this.activeProfile?.role as 'admin' | 'user') || 'user'
    );
    modal.show();
  }

  async refreshLicenseStatus(): Promise<void> {
    await this.licenseModule.refreshLicenseStatus();
  }

  public checkFeatureAccess(feature: 'voice' | 'rag' | 'memory' | 'search' | 'pro'): boolean {
    return this.licenseModule.checkFeatureAccess(feature);
  }

  public promptLicense(tier: LicenseTier = 'pro'): void {
    this.licenseModule.promptLicense(
      tier,
      this.activeProfile?.role === 'admin',
      this.mode,
      this.lastExpandedSize,
      () => {
        this.render();
        this.updateTitles();
        this.updateStatus();
      },
      () => this.render(),
    );
  }

  
  initGlobalLinkHandler(): void {
    document.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement;

      // 1. Mail Card Copy Action
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
          this.toast(t('mail.copied'), 'success');
        } catch {
          this.toast(t('common.error'), 'error');
        }
        return;
      }

      // 2. Mail Card Open Client Action (mailto:)
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
          this.toast(t('mail.openingClient'), 'info');
        } catch (err) {
          console.error('Failed to open mailto URL:', err);
          this.toast(t('common.error'), 'error');
        }
        return;
      }

      // 3. Global external link opener via Tauri Shell
      const link = target.closest('a') as HTMLAnchorElement | null;
      if (link) {
        const href = link.getAttribute('href') || link.href;
        if (href && (href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:'))) {
          e.preventDefault();
          e.stopPropagation();
          try {
            const { open: openBrowser } = await import('@tauri-apps/api/shell');
            await openBrowser(href);
          } catch (err) {
            console.error('Failed to open external link in browser:', href, err);
          }
        }
      }
    });
  }

  initGlobalShortcuts(): void {
    this.initGlobalLinkHandler();
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (this.settingsOpen) {
          this.toggleSettings(false);
        }
      }
    });
  }

  initVoice(): void {
    this.voiceController.init(this.settings);
  }

  applyTheme(theme: string): void {
    this.themeService.apply(theme);
  }

  async setMode(newMode: WidgetMode): Promise<void> {
    if (this.mode === newMode) return;
    this.mode = newMode;

    try {
      if (newMode === 'bubble') {
        this.sidebarOpen = false;
        await api.widgetResize(BUBBLE_SIZE.w, BUBBLE_SIZE.h);
      } else if (newMode === 'compact') {
        this.sidebarOpen = false;
        const compactSize = this.getCompactSize();
        await api.widgetResize(compactSize.w, compactSize.h);
      } else {
        this.sidebarOpen = false;
        await api.widgetResize(this.lastExpandedSize.w, this.lastExpandedSize.h);
      }
      await api.widgetCenter();
    } catch {
      // ignore in browser preview
    }

    this.render();
    this.updateTitles();
    this.updateStatus();
  }

  async refreshConnection(): Promise<void> {
    try {
      if (this.settings.execution_mode === 'pro' && this.settings.server_url) {
        const cleanUrl = this.settings.server_url.replace(/\/+$/, '');
        const headers: Record<string, string> = {};
        if (this.settings.server_auth_token) headers['Authorization'] = `Bearer ${this.settings.server_auth_token}`;
        const res = await fetch(`${cleanUrl}/api/tags`, { method: 'GET', headers }).catch(() => null);
        this.isConnected = !!res && res.ok;
      } else {
        this.isConnected = await api.checkConnection(this.settings.ollama_base_url);
      }
    } catch {
      this.isConnected = false;
    }
    this.updateStatus();
  }

  async refreshModels(): Promise<void> {
    try {
      this.models = await api.listModels(this.settings.ollama_base_url);
      if (this.models.length > 0) {
        this.isConnected = true;
        // If current default model is not in installed models, pick the first installed model
        if (!this.settings.default_model || !this.models.some((m) => m.name === this.settings.default_model)) {
          this.settings.default_model = this.models[0].name;
        }
        // If current conversation has no model or uninstalled model, update it
        if (
          this.sidebarModule.currentConversation &&
          (!this.sidebarModule.currentConversation.model || !this.models.some((m) => m.name === this.sidebarModule.currentConversation!.model))
        ) {
          this.sidebarModule.currentConversation.model = this.settings.default_model;
        }
      }
    } catch {
      this.models = [];
    }
    this.updateModelsDropdown();
    this.updateTitles();
    this.updateStatus();
  }

  updateStatus(): void {
    const isPro = this.settings.execution_mode === 'pro';
    const statusLabel = this.isConnected
      ? (isPro ? '✓ Serveur Connecté' : t('settings.connected'))
      : (isPro ? '✕ Serveur IA Déconnecté' : t('settings.notConnected'));

    const dots = document.querySelectorAll('#statusDot');
    dots.forEach((dot) => {
      dot.className = `status-dot ${this.isConnected ? 'connected' : 'disconnected'}`;
      dot.setAttribute('title', statusLabel);
    });
    const statusBadges = document.querySelectorAll('#statusIndicator, .tb-status-badge');
    statusBadges.forEach((badge) => {
      badge.className = `tb-status-badge ${this.isConnected ? 'connected' : 'disconnected'}`;
      badge.setAttribute('title', statusLabel);
    });
    const statusTexts = document.querySelectorAll('#statusText, .tb-status-text');
    statusTexts.forEach((text) => {
      text.textContent = statusLabel;
    });
    const bubbleStatus = document.querySelector('.bubble-status');
    if (bubbleStatus) {
      bubbleStatus.className = `bubble-status ${this.isConnected ? 'connected' : 'disconnected'}`;
      bubbleStatus.setAttribute('title', statusLabel);
    }
  }

  async refreshRAGDocuments(): Promise<void> {
    try {
      this.ragDocuments = await api.listRAGDocuments();
    } catch {
      this.ragDocuments = [];
    }
  }

  async refreshUserMemories(): Promise<void> {
    try {
      this.userMemories = await api.getUserMemories();
    } catch {
      this.userMemories = [];
    }
  }

  async handlePickAndIndexFile(): Promise<void> {
    if (!this.checkFeatureAccess('rag')) {
      this.promptLicense('lite');
      return;
    }

    try {
      const selected = await openDialog({
        multiple: false,
        filters: [
          {
            name: 'Documents',
            extensions: ['pdf', 'txt', 'md', 'docx', 'csv', 'json', 'py', 'js', 'ts', 'rs', 'html', 'css'],
          },
        ],
      });

      if (!selected || typeof selected !== 'string') return;

      this.toast(`Indexation de ${selected.split(/[\\/]/).pop()}...`, 'info');
      const doc = await api.indexRAGDocument(selected);
      this.toast(`${t('rag.docIndexed')} : ${doc.filename} (${doc.chunk_count} ${t('rag.chunks')})`, 'success');
      await this.refreshRAGDocuments();
      if (this.settingsOpen) {
        this.updateModelsDropdown();
      }
    } catch (e) {
      this.toast((e as Error).message || String(e), 'error');
    }
  }

  renderAttachmentBar(): void {
    const zone = document.getElementById('docAttachmentZone');
    if (!zone) return;

    const doc = this.documentManager.getAttachedDocument();
    if (!doc) {
      zone.innerHTML = '';
      return;
    }

    const typeBadge = this.documentManager.getTypeBadgeIcon(doc.type, doc.isVision);
    const sizeStr = this.documentManager.formatFileSize(doc.size);

    const statusHtml = doc.status === 'loading'
      ? `<span class="doc-status-tag loading">⏳ ${t('doc.ocrProcessing')}</span>`
      : doc.status === 'ready'
      ? doc.isVision
        ? `<span class="doc-status-tag ready">✓ ${t('doc.visionReady')}</span>`
        : `<span class="doc-status-tag ready">✓ ${t('doc.ocrSuccess')}</span>`
      : `<span class="doc-status-tag error">⚠️ ${doc.errorMessage || 'Erreur'}</span>`;

    const thumbHtml = doc.base64Preview
      ? `<img src="${doc.base64Preview}" class="doc-preview-thumb" alt="Preview" />`
      : `<span class="doc-type-badge">${typeBadge}</span>`;

    const actionButtonsHtml = doc.status === 'ready'
      ? `
        <div class="doc-action-bar">
          <button class="doc-action-btn" data-doc-action="summarize">📄 ${t('doc.summarize')}</button>
          <button class="doc-action-btn" data-doc-action="extract">🔍 ${t('doc.extract')}</button>
          <button class="doc-action-btn" data-doc-action="table">📊 ${t('doc.table')}</button>
          <button class="doc-action-btn" data-doc-action="translate">🌐 ${t('doc.translate')}</button>
        </div>
      `
      : '';

    zone.innerHTML = `
      <div class="doc-attached-pill">
        ${thumbHtml}
        <span class="doc-name" title="${this.escapeText(doc.name)}">${this.escapeText(doc.name)}</span>
        ${sizeStr ? `<span class="doc-size">(${sizeStr})</span>` : ''}
        ${statusHtml}
        <button class="doc-remove-btn" id="docRemoveBtn" title="${t('doc.removeAttachment')}">×</button>
      </div>
      ${actionButtonsHtml}
    `;

    zone.querySelector('#docRemoveBtn')?.addEventListener('click', () => {
      this.documentManager.clearAttachedDocument();
      this.renderAttachmentBar();
    });

    zone.querySelectorAll<HTMLButtonElement>('[data-doc-action]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const action = btn.dataset.docAction as 'summarize' | 'extract' | 'table' | 'translate';
        this.applyDocAction(action);
      });
    });
  }

  applyDocAction(action: 'summarize' | 'extract' | 'table' | 'translate'): void {
    const prompt = this.documentManager.getActionPrompt(action);
    if (this.chatInput) {
      this.chatInput.value = prompt;
    }
    void this.sendMessage();
  }

  setupDragAndDrop(): void {
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
      e.preventDefault();
      dragCounter++;
      if (dragCounter === 1) {
        document.getElementById('dragDropOverlay')?.classList.add('active');
      }
    });

    window.addEventListener('dragover', (e) => {
      e.preventDefault();
    });

    window.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dragCounter--;
      if (dragCounter <= 0) {
        dragCounter = 0;
        document.getElementById('dragDropOverlay')?.classList.remove('active');
      }
    });

    window.addEventListener('drop', async (e) => {
      e.preventDefault();
      dragCounter = 0;
      document.getElementById('dragDropOverlay')?.classList.remove('active');

      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        const file = e.dataTransfer.files[0];
        const path = (file as unknown as { path?: string }).path;
        if (path) {
          await this.documentManager.attachFilePath(path, file.name, file.size, this.getVisionAttachOptions());
          this.renderAttachmentBar();
          this.toast(t('chat.documentAttached', { name: file.name }), 'info');
        } else if (file.type.startsWith('image/')) {
          await this.documentManager.attachBlobImage(file, file.name, this.getVisionAttachOptions());
          this.renderAttachmentBar();
          const opts = this.getVisionAttachOptions();
          this.toast(opts.visionMode ? t('doc.visionReady') : t('chat.imageAttached', { name: file.name }), 'info');
        }
      }
    });
  }

  getVisionAttachOptions(): { visionMode?: boolean } {
    const conv = this.sidebarModule.currentConversation;
    const model = conv?.model || this.settings.default_model || this.models[0]?.name || '';
    return { visionMode: isVisionModel(model) };
  }

  render(): void {
    this.widgetShell.render(this);
    if (this.mode === 'compact') {
      const size = this.getCompactSize();
      void api.widgetResize(size.w, size.h).catch(() => {});
    }
  }

  private getCompactSize(): { w: number; h: number } {
    return this.chatModule.messages.length === 0 ? COMPACT_SIZE_TALL : COMPACT_SIZE;
  }

  syncWebToggleButtons(): void {
    document.querySelectorAll('.web-toggle-btn').forEach((btn) => {
      btn.classList.toggle('active', this.webSearchEnabled);
    });
  }

  toggleWebSearch(): void {
    this.webSearchEnabled = !this.webSearchEnabled;
    this.syncWebToggleButtons();
    this.toast(this.webSearchEnabled ? t('web.active') : t('web.inactive'), 'info');
  }

  getRootElement(): HTMLElement {
    return this.el;
  }

  getChatContainer(): HTMLElement | null {
    return this.chatContainer;
  }

  getChatInput(): HTMLTextAreaElement | null {
    return this.chatInput;
  }

  setChatContainer(el: HTMLElement | null): void {
    this.chatContainer = el;
  }

  setChatInput(el: HTMLTextAreaElement | null): void {
    this.chatInput = el;
  }

  openExportMenu(anchor?: HTMLElement): void {
    if (!this.sidebarModule.currentConversation || this.chatModule.messages.length === 0) {
      this.toast(t('chat.exportEmpty'), 'warning');
      return;
    }

    const pseudo = this.getUserPseudo();
    const existing = document.getElementById('exportMenuModal');
    if (existing) existing.remove();

    const menu = document.createElement('div');
    menu.id = 'exportMenuModal';

    let top = '90px';
    let right = '20px';
    if (anchor) {
      const rect = anchor.getBoundingClientRect();
      top = `${rect.bottom + 6}px`;
      right = `${Math.max(8, window.innerWidth - rect.right)}px`;
    }

    menu.style.cssText = `
      position: fixed;
      top: ${top};
      right: ${right};
      background: var(--surface-elevated, #ffffff);
      border: 1px solid var(--border);
      border-radius: var(--radius-md, 10px);
      box-shadow: 0 8px 24px rgba(0,0,0,0.18);
      padding: 8px;
      z-index: 1000;
      display: flex;
      flex-direction: column;
      gap: 4px;
      min-width: 220px;
      animation: docSlideDown 0.15s ease-out;
    `;

    menu.innerHTML = `
      <div style="font-size:11px;font-weight:bold;color:var(--text-tertiary);padding:4px 8px;text-transform:uppercase;">${t('chat.export')}</div>
      <button class="sp-btn-secondary" id="exportMdBtn" style="justify-content:flex-start;padding:8px 10px;font-size:12px;border:none;background:transparent;cursor:pointer;width:100%;text-align:left;">📄 ${t('chat.exportMd')}</button>
      <button class="sp-btn-secondary" id="exportTxtBtn" style="justify-content:flex-start;padding:8px 10px;font-size:12px;border:none;background:transparent;cursor:pointer;width:100%;text-align:left;">📋 ${t('chat.exportTxt')}</button>
      <button class="sp-btn-secondary" id="exportPdfBtn" style="justify-content:flex-start;padding:8px 10px;font-size:12px;border:none;background:transparent;cursor:pointer;width:100%;text-align:left;">📕 ${t('chat.exportPdf')}</button>
    `;

    document.body.appendChild(menu);

    const closeHandler = (evt: MouseEvent) => {
      if (!menu.contains(evt.target as Node)) {
        menu.remove();
        document.removeEventListener('click', closeHandler);
      }
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);

    menu.querySelector('#exportMdBtn')?.addEventListener('click', () => {
      ExportManager.exportToMarkdown(this.sidebarModule.currentConversation!, this.chatModule.messages, pseudo);
      menu.remove();
      this.toast(t('chat.exportSuccess'), 'success');
    });

    menu.querySelector('#exportTxtBtn')?.addEventListener('click', () => {
      ExportManager.exportToText(this.sidebarModule.currentConversation!, this.chatModule.messages, pseudo);
      menu.remove();
      this.toast(t('chat.exportSuccess'), 'success');
    });

    menu.querySelector('#exportPdfBtn')?.addEventListener('click', () => {
      void (async () => {
        const ok = await ExportManager.exportToNativePdf(
          this.sidebarModule.currentConversation!,
          this.chatModule.messages,
          pseudo,
        );
        menu.remove();
        if (ok) this.toast(t('chat.exportSuccess'), 'success');
      })();
    });
  }

  setupResizeHandle(): void {
    const handle = document.getElementById('resizeHandle');
    if (!handle) return;

    let startX = 0;
    let startY = 0;
    let startW = window.innerWidth;
    let startH = window.innerHeight;

    const onMouseMove = async (e: MouseEvent) => {
      if (!this.isResizing) return;
      const isRtl = isRTL(this.settings.language);
      const deltaX = isRtl ? startX - e.screenX : e.screenX - startX;
      const deltaY = e.screenY - startY;

      const newW = Math.max(340, Math.min(1200, Math.round(startW + deltaX)));
      const newH = Math.max(380, Math.min(1000, Math.round(startH + deltaY)));

      this.lastExpandedSize = { w: newW, h: newH };
      try {
        await api.widgetResize(newW, newH);
      } catch {
        // ignore
      }
    };

    const onMouseUp = () => {
      this.isResizing = false;
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    handle.addEventListener('mousedown', (e) => {
      e.preventDefault();
      this.isResizing = true;
      startX = e.screenX;
      startY = e.screenY;
      startW = window.innerWidth;
      startH = window.innerHeight;
      document.addEventListener('mousemove', onMouseMove);
      document.addEventListener('mouseup', onMouseUp);
    });
  }

  async togglePin(): Promise<void> {
    try {
      this.pinned = await api.widgetTogglePin();
      const pinBtn = document.getElementById('pinBtn');
      if (pinBtn) {
        pinBtn.classList.toggle('active', this.pinned);
        pinBtn.title = this.pinned ? t('widget.unpin') : t('widget.pin');
      }
      this.toast(this.pinned ? t('widget.pin') : t('widget.unpin'), 'info');
    } catch (e) {
      this.toast((e as Error).message, 'error');
    }
  }

  escapeText(text: string): string {
    return escapeText(text);
  }

  getSafeId(name: string): string {
    return getSafeId(name);
  }

  getWhatsAppLicenseUrl(tier: 'lite' | 'pro' = 'lite'): string {
    return this.licenseModule.getWhatsAppLicenseUrl(tier);
  }

  renderSettings(): string {
    return this.settingsView.render(this);
  }

  renderConversationList(): string {
    this.sidebarModule.conversations = this.sidebarModule.conversations;
    this.sidebarModule.searchQuery = this.searchQuery;
    return this.sidebarModule.renderList((txt) => this.escapeText(txt));
  }

  renderCompactSuggestions(): string {
    const suggestions = SuggestionsService.getSuggestions(this.ragDocuments, this.userMemories).slice(0, 3);
    if (suggestions.length === 0) return '';
    return `
      <div class="compact-suggestions" id="compactSuggestions">
        <span class="compact-suggestions-label">${t('suggestions.emptyTitle')}</span>
        <div class="compact-suggestion-chips">
          ${suggestions
            .map((s) => {
              const label = s.label.length > 42 ? `${s.label.slice(0, 39)}…` : s.label;
              return `<button class="compact-suggestion-chip ${s.badgeClass}" data-fill-prompt="${this.escapeText(s.prompt)}" title="${this.escapeText(s.label)}">${s.icon} ${this.escapeText(label)}</button>`;
            })
            .join('')}
        </div>
      </div>`;
  }

  renderEmptyChat(): string {
    const dynamicSuggestions = SuggestionsService.getSuggestions(this.ragDocuments, this.userMemories);
    const hasContextual = dynamicSuggestions.some((s) => s.badgeClass === 'sug-rag' || s.badgeClass === 'sug-memory');
    return `
      <div class="chat-empty ${hasContextual ? 'chat-empty-contextual' : ''}">
        <div class="chat-empty-logo-wrap">
          <img src="/logo.png" class="chat-empty-logo-img" alt="WidgetAI Logo" />
        </div>
        <h2 class="chat-empty-title">${t('chat.emptyState')}</h2>
        <p class="chat-empty-hint">${t('chat.emptyHint')}</p>
        <h3 class="empty-suggestions-title">${t('suggestions.emptyTitle')}</h3>
        <div class="empty-suggestions">
          ${dynamicSuggestions
            .map(
              (s) => `
            <button class="empty-suggestion-btn ${s.badgeClass}" data-fill-prompt="${this.escapeText(s.prompt)}">
              <div class="sug-badge-wrap">
                <span class="sug-badge">${s.icon} ${this.escapeText(s.badge)}</span>
              </div>
              <span class="sug-text">${this.escapeText(s.label)}</span>
              <span class="sug-arrow">→</span>
            </button>
          `,
            )
            .join('')}
        </div>
      </div>`;
  }

  getUserPseudo(): string {
    const saved = localStorage.getItem('aiwidget_user_pseudo');
    if (saved?.trim()) return saved.trim();
    const idMem = this.userMemories.find((m) => m.category === 'identity');
    if (idMem?.content.trim()) return idMem.content.trim();
    return 'Vous';
  }

  renderMessages(): string {
    const shortModel = this.sidebarModule.currentConversation?.model || this.settings.default_model || 'qwen2.5:1.5b';
    return MessageRenderer.renderMessages(
      this.chatModule.messages,
      this.chatModule.isGenerating,
      this.chatModule.pendingAssistantId,
      shortModel,
      (txt) => this.escapeText(txt),
      this.getUserPseudo(),
      this.settings.language,
      this.webSearchEnabled,
    );
  }

  attachVoiceEvents(): void {
    this.voiceController.attachEvents();
  }

  attachSettingsEvents(): void {
    this.settingsController.attach(this);
  }


  async saveSettings(): Promise<void> {
    try {
      await api.saveSettings(this.settings);
      this.toggleSettings(false);
      this.toast(t('common.success'), 'success');
      this.updateTitles();
    } catch (e) {
      this.toast(t('common.error') + ': ' + (e as Error).message, 'error');
    }
  }

  async setLanguage(lang: string): Promise<void> {
    this.settings.language = lang;
    changeLanguage(lang);
    try {
      await api.saveSettings(this.settings);
    } catch {
      // ignore
    }
    this.render();
  }

  toggleSettings(open: boolean): void {
    this.settingsOpen = open;
    document.getElementById('settingsPanel')?.classList.toggle('open', open);
    document.getElementById('backdrop')?.classList.toggle('show', open);
    if (open) {
      void this.modelsModule.refreshPartialDownloads().then(() => {
        const panel = document.getElementById('settingsPanel');
        if (panel && this.settingsOpen) {
          panel.innerHTML = this.renderSettings();
          this.attachSettingsEvents();
        }
      });
      void this.refreshLicenseStatus().then(() => {
        const panel = document.getElementById('settingsPanel');
        if (panel && this.settingsOpen) {
          panel.innerHTML = this.renderSettings();
          this.attachSettingsEvents();
        }
      });
      const panel = document.getElementById('settingsPanel');
      if (panel) panel.innerHTML = this.renderSettings();
      this.attachSettingsEvents();
      // In compact/bubble mode: resize to show settings panel properly
      if (this.mode !== 'expanded') {
        void api.widgetResize(560, 600).catch(() => {});
      }
    } else {
      // Restore compact/bubble size on close
      if (this.mode !== 'expanded') {
        void api.widgetResize(
          this.lastExpandedSize.w,
          this.lastExpandedSize.h
        ).catch(() => {});
      }
    }
  }

  refreshConvList(): void {
    const list = document.getElementById('convList');
    if (list) list.innerHTML = this.renderConversationList();
  }

  updateModelsDropdown(): void {
    const panel = document.getElementById('settingsPanel');
    if (!panel || !this.settingsOpen) return;
    panel.innerHTML = this.renderSettings();
    this.attachSettingsEvents();
  }

  autoResizeTextarea(): void {
    if (!this.chatInput) return;
    this.chatInput.style.height = 'auto';
    this.chatInput.style.height = Math.min(this.chatInput.scrollHeight, 120) + 'px';
    this.updateSendButton();
  }

  updateSendButton(): void {
    const sendBtn = document.getElementById('sendBtn') as HTMLButtonElement;
    if (!sendBtn) return;
    const hasText = (this.chatInput?.value.trim().length ?? 0) > 0;
    if (this.chatModule.isGenerating) {
      sendBtn.innerHTML = icons.stop;
      sendBtn.disabled = false;
      sendBtn.title = t('chat.stop');
      sendBtn.onclick = () => { void this.chatController.requestStop(); };
    } else {
      sendBtn.innerHTML = icons.send;
      sendBtn.disabled = !hasText;
      sendBtn.title = t('chat.send');
      sendBtn.onclick = () => void this.sendMessage();
    }
  }

  async newConversation(): Promise<void> {
    const model = this.settings.default_model || (this.models[0]?.name ?? 'qwen2.5:1.5b');
    const conv = await api.createConversation(t('sidebar.newChat'), model);
    this.sidebarModule.conversations.unshift(conv);
    this.sidebarModule.currentConversation = conv;
    this.chatModule.messages = [];
    this.render();
    this.chatInput?.focus();
  }

  async openConversation(id: string): Promise<void> {
    const conv = this.sidebarModule.conversations.find((c) => c.id === id);
    if (!conv) return;
    this.sidebarModule.currentConversation = conv;
    try {
      this.chatModule.messages = await api.getMessages(id);
    } catch {
      this.chatModule.messages = [];
    }
    this.render();
    this.scrollToBottom();
    this.refreshConvList();
  }

  async deleteConversation(id: string): Promise<void> {
    await this.sidebarModule.deleteConversation(id);
    this.sidebarModule.conversations = this.sidebarModule.conversations;
    this.sidebarModule.currentConversation = this.sidebarModule.currentConversation;
    if (this.sidebarModule.currentConversation) {
      try {
        this.chatModule.messages = await api.getMessages(this.sidebarModule.currentConversation.id);
      } catch {
        this.chatModule.messages = [];
      }
    } else {
      this.chatModule.messages = [];
    }
    this.render();
  }

  showConfirm(text: string, onOk: () => void): void {
    this.modalsManager.showConfirm(text, onOk);
  }

  hideConfirm(): void {
    this.modalsManager.hideConfirm();
  }

  showWebPrivacyModal(context: 'pre-generate' | 'post-refusal' = 'post-refusal'): void {
    this.modalsManager.showWebPrivacy(
      () => {
        this.webSearchPrivacyAccepted = localStorage.getItem('aiwidget_web_privacy_accepted') === 'true';
        this.webSearchEnabled = true;
        this.syncWebToggleButtons();
        if (context === 'post-refusal') {
          this.popLastAssistantMessage();
        }
        void this.generateResponse();
      },
      () => {
        this.webSearchEnabled = false;
        this.syncWebToggleButtons();
      },
      { context },
    );
  }

  private popLastAssistantMessage(): void {
    const msgs = this.chatModule.messages;
    if (msgs.length > 0 && msgs[msgs.length - 1].role === 'assistant') {
      msgs.pop();
      this.renderMessagesView();
    }
  }

  hideWebPrivacyModal(): void {
    this.modalsManager.hideWebPrivacy();
  }

  async sendMessage(): Promise<void> {
    return this.chatController.sendMessage();
  }

  async generateResponse(): Promise<void> {
    return this.chatController.generateResponse();
  }

  appendStreamingToken(content: string, done = false): void {
    this.chatController.appendStreamingToken(content, done);
  }

  renderMessagesView(): void {
    this.chatController.renderMessagesView();
  }

  updateTitles(): void {
    const titleEl = document.getElementById('mainTitle');
    const tbName = document.getElementById('tbName');
    const tbBadge = document.getElementById('tbModelBadge');
    const compactBadge = document.getElementById('compactModelBadge');

    const activeModel =
      this.sidebarModule.currentConversation?.model ||
      this.settings.default_model ||
      (this.models.length > 0 ? this.models[0].name : 'qwen2.5:1.5b');

    const shortModel = activeModel.split(':')[0];
    const title = this.sidebarModule.currentConversation?.title ?? t('app.subtitle');

    if (titleEl) titleEl.textContent = title;
    if (tbName) tbName.textContent = this.sidebarModule.currentConversation?.title ?? t('app.title');
    if (tbBadge) {
      tbBadge.innerHTML = `${this.escapeText(shortModel)} <span class="badge-chevron">▾</span>`;
      tbBadge.setAttribute('title', `${t('settings.defaultModel')} : ${activeModel}`);
    }
    if (compactBadge) {
      compactBadge.innerHTML = `${this.escapeText(shortModel)} <span class="badge-chevron">▾</span>`;
      compactBadge.setAttribute('title', `${t('settings.defaultModel')} : ${activeModel}`);
    }
    this.updateStatus();
  }

  openModelSwitcher(anchorEl: HTMLElement): void {
    this.modelsModule.openModelSwitcher(anchorEl);
  }

  scrollToBottom(): void {
    requestAnimationFrame(() => {
      this.chatContainer?.scrollTo({ top: this.chatContainer.scrollHeight, behavior: 'smooth' });
    });
  }

  showConnectionError(): void {
    const err = t('chat.connectionError', { url: this.settings.ollama_base_url });
    if (!this.chatContainer) return;
    this.chatContainer.insertAdjacentHTML(
      'beforeend',
      `<div class="error-box">${icons.warn} ${this.escapeText(err)}</div>`,
    );
    this.scrollToBottom();
    this.toast(t('settings.notConnected'), 'error');
  }

  async copyMessage(id: string): Promise<void> {
    return this.chatController.copyMessage(id);
  }

  async regenerateMessage(id: string): Promise<void> {
    return this.chatController.regenerateResponse(id);
  }

  async editMessage(id: string): Promise<void> {
    return this.chatController.editMessage(id);
  }

  async pullModel(model: string): Promise<void> {
    return this.modelsModule.pullModel(model);
  }

  renderPullProgress(payload: unknown): void {
    this.modelsModule.renderPullProgress(payload);
  }

  toast(text: string, type: ToastType = 'info'): void {
    this.toastService.show(text, type);
  }
}

export default App;

