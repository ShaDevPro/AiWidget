import fs from 'fs';
import path from 'path';

const appPath = path.join(process.cwd(), 'src', 'App.ts');
let src = fs.readFileSync(appPath, 'utf8');

// ── 1. Replace imports header ───────────────────────────────────────────────
const newImports = `import { api } from './api';
import { setTransport, HttpSseTransport, TauriIpcTransport } from './api/_core';
import { open as openDialog } from '@tauri-apps/api/dialog';
import { listen } from '@tauri-apps/api/event';
import { t, changeLanguage, currentLanguage, initI18n, isRTL } from './i18n';
import type { AppSettings, Conversation, LLMModel, Message, UserMemory, RAGDocument, LicenseTier, MessageSearchResult, VectorDBStats, RAGSemanticSearchResult } from './types';
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
import { BUBBLE_SIZE, COMPACT_SIZE, DEFAULT_EXPANDED_SIZE } from './constants/widgetSizes';
import { escapeText, getSafeId } from './utils/dom';
import { detectSystemLanguage } from './utils/locale';
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

export type { RecommendedModel };
export { RECOMMENDED_MODELS };
export type WidgetMode = 'bubble' | 'compact' | 'expanded';
`;

src = src.replace(/^import[\s\S]*?^export type WidgetMode/m, newImports.trimEnd());

// ── 2. Remove RECOMMENDED_MODELS block if still present ─────────────────────
src = src.replace(
  /export interface RecommendedModel \{[\s\S]*?^const BUBBLE_SIZE/m,
  '',
);
src = src.replace(
  /const BUBBLE_SIZE = \{ w: 68, h: 68 \};\nconst COMPACT_SIZE = \{ w: 600, h: 120 \};\nconst DEFAULT_EXPANDED_SIZE = \{ w: 920, h: 680 \};\n\n/m,
  '',
);

// ── 3. Remove duplicate state fields ────────────────────────────────────────
src = src.replace(/\n  conversations: Conversation\[\] = \[\];\n/, '\n');
src = src.replace(/\n  currentConversation: Conversation \| null = null;\n/, '\n');
src = src.replace(/\n  messages: Message\[\] = \[\];\n/, '\n');
src = src.replace(/\n  isGenerating = false;\n/, '\n');
src = src.replace(/\n  stopRequested = false;\n/, '\n');
src = src.replace(/\n  showCustomPull = false;\n/, '\n');
src = src.replace(/\n  voiceState: VoiceState = 'idle';\n/, '\n');
src = src.replace(/\n  pendingVoiceText: string \| null = null;\n/, '\n');
src = src.replace(/\n  private isVoiceTriggered = false;\n/, '\n');
src = src.replace(/\n  private voiceManager: VoiceManager \| null = null;\n/, '\n');
src = src.replace(/\n  private ttsVoices: TTSVoice\[\] = \[\];\n/, '\n');
src = src.replace(/\n  private whisperStatus: WhisperStatus = \{ installed: false, model_installed: false, binary_path: '' \};\n/, '\n');
src = src.replace(/\n  private voiceAnimFrame: number \| null = null;\n/, '\n');
src = src.replace(/\n  enterprisePolicy: EnterprisePolicy \| null = null;\n/, '\n');
src = src.replace(/\n  licenseStatus: LicenseStatus \| null = null;\n/, '\n');
src = src.replace(/\n  private pendingAssistantId: string \| null = null;\n/, '\n');
src = src.replace(/\n  private toastTimer: ReturnType<typeof setTimeout> \| null = null;\n/, '\n');
src = src.replace(/\n  private animStepIndex = 0;\n/, '\n');
src = src.replace(/\n  private animInterval: ReturnType<typeof setInterval> \| null = null;\n/, '\n');
src = src.replace(/\n  currentQuota: UserQuota \| null = null;\n/, '\n');
src = src.replace(/\n  currentlyPullingModel: string \| null = null;\n/, '\n');

// ── 4. Add new module instances after modalsManager ─────────────────────────
if (!src.includes('readonly toastService')) {
  src = src.replace(
    '  readonly modalsManager = new ModalsManager();',
    `  readonly toastService = new ToastService();
  readonly themeService = new ThemeService();
  readonly thinkingAnimator = new ThinkingAnimator();
  readonly licenseModule = new LicenseModule(this.toastService);
  chatController!: ChatController;
  voiceController!: VoiceController;
  modelsModule!: ModelsModule;
  readonly modalsManager = new ModalsManager();`,
  );
}

// ── 5. Bulk reference migrations (order matters for overlapping patterns) ─────
const replacements = [
  ['this.sidebarModule.currentConversation', '__SIDEBAR_CONV__'], // temp protect
  ['this.chatModule.messages', '__CHAT_MSG__'],
  ['this.licenseModule.licenseStatus', '__LICENSE_STATUS__'],
  ['this.licenseModule.enterprisePolicy', '__ENTERPRISE__'],
  ['this.licenseModule.currentQuota', '__QUOTA__'],
  ['this.voiceModule.pendingVoiceText', '__PENDING_VOICE__'],
  ['this.voiceModule.isVoiceTriggered', '__VOICE_TRIGGERED__'],
  ['this.modelsModule.showCustomPull', '__SHOW_PULL__'],
  ['this.modelsModule.currentlyPullingModel', '__PULLING__'],
  ['this.chatModule.isGenerating', '__IS_GEN__'],
  ['this.chatModule.stopRequested', '__STOP_REQ__'],
  ['this.chatModule.pendingAssistantId', '__PENDING_ASST__'],
  ['this.sidebarModule.conversations', '__CONVS__'],
];

for (const [from, to] of replacements) {
  src = src.split(from).join(to);
}

const migrate = [
  ['this.messages', 'this.chatModule.messages'],
  ['this.isGenerating', 'this.chatModule.isGenerating'],
  ['this.stopRequested', 'this.chatModule.stopRequested'],
  ['this.pendingAssistantId', 'this.chatModule.pendingAssistantId'],
  ['this.conversations', 'this.sidebarModule.conversations'],
  ['this.currentConversation', 'this.sidebarModule.currentConversation'],
  ['this.licenseStatus', 'this.licenseModule.licenseStatus'],
  ['this.enterprisePolicy', 'this.licenseModule.enterprisePolicy'],
  ['this.currentQuota', 'this.licenseModule.currentQuota'],
  ['this.whisperStatus', 'this.voiceModule.whisper'],
  ['this.ttsVoices', 'this.voiceModule.voices'],
  ['this.voiceState', 'this.voiceModule.voiceState'],
  ['this.pendingVoiceText', 'this.voiceModule.pendingVoiceText'],
  ['this.isVoiceTriggered', 'this.voiceModule.isVoiceTriggered'],
  ['this.showCustomPull', 'this.modelsModule.showCustomPull'],
  ['this.currentlyPullingModel', 'this.modelsModule.currentlyPullingModel'],
];

for (const [from, to] of migrate) {
  src = src.split(from).join(to);
}

const restore = [
  ['__SIDEBAR_CONV__', 'this.sidebarModule.currentConversation'],
  ['__CHAT_MSG__', 'this.chatModule.messages'],
  ['__LICENSE_STATUS__', 'this.licenseModule.licenseStatus'],
  ['__ENTERPRISE__', 'this.licenseModule.enterprisePolicy'],
  ['__QUOTA__', 'this.licenseModule.currentQuota'],
  ['__PENDING_VOICE__', 'this.voiceModule.pendingVoiceText'],
  ['__VOICE_TRIGGERED__', 'this.voiceModule.isVoiceTriggered'],
  ['__SHOW_PULL__', 'this.modelsModule.showCustomPull'],
  ['__PULLING__', 'this.modelsModule.currentlyPullingModel'],
  ['__IS_GEN__', 'this.chatModule.isGenerating'],
  ['__STOP_REQ__', 'this.chatModule.stopRequested'],
  ['__PENDING_ASST__', 'this.chatModule.pendingAssistantId'],
  ['__CONVS__', 'this.sidebarModule.conversations'],
];

for (const [from, to] of restore) {
  src = src.split(from).join(to);
}

fs.writeFileSync(appPath, src);
console.log('Refactor script pass 1 done. Lines:', src.split('\n').length);
