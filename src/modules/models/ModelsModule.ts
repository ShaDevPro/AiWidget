/**
 * ModelsModule — Model listing, pull/download, and model switcher popover.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { escapeText } from '../../utils/dom';
import { isRTL } from '../../i18n';
import { RECOMMENDED_MODELS } from '../../constants/recommendedModels';
import {
  hideGlobalDownloadBanner,
  initCardDownloadProgress,
  showGlobalDownloadBanner,
  updateModelDownloadProgress,
  type ModelDownloadProgressPayload,
} from '../../ui/ModelDownloadProgress';
import type { AppSettings, LLMModel, PartialGGUFDownload } from '../../types';
import type { ToastService } from '../../ui/ToastService';

export interface ModelsModuleDeps {
  toast: ToastService;
  getSettings: () => AppSettings;
  setSettings: (s: AppSettings) => void;
  getModels: () => LLMModel[];
  setModels: (m: LLMModel[]) => void;
  isConnected: () => boolean;
  setConnected: (v: boolean) => void;
  getCurrentConversationModel: () => string | undefined;
  setConversationModel: (name: string) => void;
  refreshConnection: () => Promise<void>;
  refreshModels: () => Promise<void>;
  updateTitles: () => void;
  getMode: () => string;
  setMode: (mode: 'expanded') => Promise<void>;
  toggleSettings: (open: boolean) => void;
  renderSettings: () => string;
  attachSettingsEvents: () => void;
  settingsOpen: () => boolean;
  getSettingsTab: () => string;
}

export class ModelsModule {
  currentlyPullingModel: string | null = null;
  showCustomPull = false;
  partialDownloads: PartialGGUFDownload[] = [];

  constructor(private deps: ModelsModuleDeps) {}

  async refreshPartialDownloads(): Promise<void> {
    try {
      this.partialDownloads = await api.listPartialGGUFDownloads();
    } catch {
      this.partialDownloads = [];
    }
  }

  async pullModel(model: string): Promise<void> {
    const isCuratedGGUF = RECOMMENDED_MODELS.some(
      (m) => m.name.toLowerCase() === model.toLowerCase(),
    );

    if (!isCuratedGGUF) {
      if (!this.deps.isConnected()) await this.deps.refreshConnection();
      if (!this.deps.isConnected()) {
        this.deps.toast.show(t('settings.ollamaOfflineDesc'), 'error');
        this.refreshSettingsPanel();
        return;
      }
    }

    const partial = this.partialDownloads.find((p) => p.model_id.toLowerCase() === model.toLowerCase());
    this.currentlyPullingModel = model;
    showGlobalDownloadBanner(model, !!partial);
    initCardDownloadProgress(model);

    const settings = this.deps.getSettings();

    try {
      await api.pullModel(model, settings.ollama_base_url);
      this.deps.toast.show(`${t('gguf.progressComplete')}: ${model}`, 'success');
      await this.deps.refreshModels();
      await this.refreshPartialDownloads();
      if (!settings.default_model) {
        settings.default_model = model;
        this.deps.setSettings(settings);
      }
    } catch (e) {
      const errMsg = (e as Error).message || String(e);
      this.deps.toast.show(`${t('common.error')}: ${errMsg}`, 'error');
      await this.refreshPartialDownloads();
      this.refreshSettingsPanel();
    } finally {
      this.currentlyPullingModel = null;
      hideGlobalDownloadBanner();
      await this.deps.refreshModels();
      await this.refreshPartialDownloads();
      this.refreshSettingsPanel();
    }
  }

  renderPullProgress(payload: unknown): void {
    const model = this.currentlyPullingModel
      ?? (payload as ModelDownloadProgressPayload).model_id
      ?? null;
    if (!model) return;

    if (!this.currentlyPullingModel) {
      this.currentlyPullingModel = model;
      showGlobalDownloadBanner(model, !!(payload as ModelDownloadProgressPayload).resuming);
      initCardDownloadProgress(model);
    }

    updateModelDownloadProgress(model, payload as ModelDownloadProgressPayload);
  }

  openModelSwitcher(anchorEl: HTMLElement): void {
    const existing = document.getElementById('modelSwitcherPopover');
    if (existing) {
      existing.remove();
      return;
    }

    const settings = this.deps.getSettings();
    const models = this.deps.getModels();
    const rect = anchorEl.getBoundingClientRect();
    const rtl = isRTL(settings.language);
    const currentModelName = this.deps.getCurrentConversationModel() || settings.default_model || models[0]?.name || '';

    const popover = document.createElement('div');
    popover.id = 'modelSwitcherPopover';
    popover.className = `model-switcher-popover ${rtl ? 'rtl' : ''}`;
    popover.style.cssText = `position:fixed;top:${rect.bottom + 6}px;z-index:9999;${rtl ? `right:${window.innerWidth - rect.right}px` : `left:${rect.left}px`}`;

    popover.innerHTML = `
      <div class="msp-header">
        <span class="msp-title">🧠 ${t('settings.models')}</span>
        <span class="msp-count">${models.length}</span>
      </div>
      <div class="msp-list">
        ${models.length === 0 ? `<div class="msp-empty">${t('settings.noModels')}</div>` : models.map((m) => {
          const selected = m.name.toLowerCase() === currentModelName.toLowerCase();
          return `<button class="msp-item ${selected ? 'active' : ''}" data-select-model="${escapeText(m.name)}">
            <div class="msp-item-main">
              <span class="msp-item-name">${escapeText(m.name)}</span>
              ${m.size ? `<span class="msp-item-size">${escapeText(m.size)}</span>` : ''}
            </div>
            ${selected ? '<span class="msp-item-check">✓</span>' : ''}
          </button>`;
        }).join('')}
      </div>
      <div class="msp-footer">
        <button class="msp-footer-btn" id="mspCatalogBtn">${icons.download} ${t('settings.pullModel')}</button>
      </div>`;

    document.body.appendChild(popover);

    popover.querySelectorAll('[data-select-model]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const modelName = btn.getAttribute('data-select-model')!;
        settings.default_model = modelName;
        this.deps.setConversationModel(modelName);
        this.deps.setSettings(settings);
        await api.saveSettings(settings);
        this.deps.updateTitles();
        this.deps.toast.show(`${t('settings.activeModel')}: ${modelName}`, 'success');
        popover.remove();
      });
    });

    popover.querySelector('#mspCatalogBtn')?.addEventListener('click', () => {
      popover.remove();
      if (this.deps.getMode() !== 'expanded') void this.deps.setMode('expanded');
      this.deps.toggleSettings(true);
    });

    const handleOutside = (e: MouseEvent) => {
      if (!popover.contains(e.target as Node) && !anchorEl.contains(e.target as Node)) {
        popover.remove();
        document.removeEventListener('mousedown', handleOutside);
      }
    };
    setTimeout(() => document.addEventListener('mousedown', handleOutside), 50);
  }

  private refreshSettingsPanel(): void {
    if (!this.deps.settingsOpen()) return;
    const panel = document.getElementById('settingsPanel');
    if (panel) {
      panel.innerHTML = this.deps.renderSettings();
      this.deps.attachSettingsEvents();
    }
  }
}
