/**
 * SettingsHost — Contract for settings view/controller (implemented by App).
 */
import type { AppSettings, LLMModel, RAGDocument, UserMemory, VectorDBStats, RAGSemanticSearchResult } from '../../types';
import type { ProfilePublic } from '../profile/ProfileModule';
import type { LicenseModule } from '../license/LicenseModule';
import type { VoiceModule } from '../voice/VoiceModule';
import type { ModelsModule } from '../models/ModelsModule';
import type { SidebarModule } from '../sidebar/SidebarModule';

export interface SettingsHost {
  settings: AppSettings;
  settingsTab: string;
  activeProfile: ProfilePublic | null;
  models: LLMModel[];
  isConnected: boolean;
  isAutostartEnabled: boolean;
  ragDocuments: RAGDocument[];
  userMemories: UserMemory[];
  vectorDbStats: VectorDBStats | null;
  semanticTestResults: RAGSemanticSearchResult[];
  semanticSearchQuery: string;
  licenseModule: LicenseModule;
  voiceModule: VoiceModule;
  modelsModule: ModelsModule;
  sidebarModule: SidebarModule;
  escapeText(text: string): string;
  getWhatsAppLicenseUrl(tier: 'lite' | 'pro'): string;
  applyTheme(theme: string): void;
  render(): void;
  toggleSettings(open: boolean): void;
  toast(text: string, type?: 'success' | 'error' | 'info' | 'warning'): void;
  saveSettings(): Promise<void>;
  refreshConnection(): Promise<void>;
  refreshModels(): Promise<void>;
  refreshLicenseStatus(): Promise<void>;
  refreshRAGDocuments(): Promise<void>;
  refreshUserMemories(): Promise<void>;
  handlePickAndIndexFile(): Promise<void>;
  showConfirm(text: string, onOk: () => void): void;
  showOnboarding(): void;
  checkFeatureAccess(feature: 'pro'): boolean;
  promptLicense(tier: 'lite' | 'pro'): void;
  pullModel(model: string): Promise<void>;
  updateTitles(): void;
  renderSettings(): string;
  attachSettingsEvents(): void;
}
