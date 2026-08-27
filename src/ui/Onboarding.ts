import { t, currentLanguage, changeLanguage, isRTL } from '../i18n';
import { icons } from './icons';
import { api } from '../api';
import { setTransport, HttpSseTransport, TauriIpcTransport } from '../api/_core';
import { getWhisperStatus, downloadWhisper, listTTSVoices } from './VoiceManager';
import { LicenseModal } from './LicenseModal';
import { getProgressLabel } from './ModelDownloadProgress';
import type { LicenseStatus, EnterprisePolicy, HardwareSpecs, CuratedGGUFModel } from '../types';

export interface OnboardingResult {
  username: string;
  language: string;
  initialPrompt?: string;
  executionMode?: 'lite' | 'pro';
  serverUrl?: string;
  serverToken?: string;
  displayMode?: 'bubble' | 'compact' | 'expanded';
}

// ─────────────────────────────────────────
// 5-step onboarding wizard
// Step 1: Welcome + Language + Edition (Lite / Pro)
// Step 2: Choose LLM (Lite) OR Server Setup (Pro)
// Step 3: Voice setup (optional)
// Step 4: Display mode
// Step 5: All done!
// ─────────────────────────────────────────

export class OnboardingModal {
  private currentStep = 1;
  private totalSteps = 5;
  private container: HTMLElement;
  private onCompleteCallback: (result: OnboardingResult) => void;
  private typewriterTimeouts: number[] = [];
  private selectedPrompt = '';
  private defaultUserName = 'Ami';

  // User Role & Permissions (Admin vs User)
  private activeRole: 'admin' | 'user' = 'user';

  // License Status & Enterprise Policy
  private licenseStatus: LicenseStatus | null = null;
  private enterprisePolicy: EnterprisePolicy | null = null;

  // Edition selection (Lite vs Pro)
  private executionMode: 'lite' | 'pro' = 'lite';
  private serverUrl = 'http://localhost:8080';
  private serverToken = '';
  private serverStatus: 'idle' | 'testing' | 'connected' | 'error' = 'idle';
  private serverModels: string[] = [];
  private serverError = '';

  // Display mode preference (Step 4)
  private selectedDisplayMode: 'bubble' | 'compact' | 'expanded' = 'compact';

  // Hardware Specs
  private hardwareSpecs: HardwareSpecs | null = null;

  // Step 2 — LLM
  private selectedModelId = 'qwen2.5:1.5b';
  private installedModelIds: string[] = [];
  private curatedModels: CuratedGGUFModel[] = [];
  private isPulling = false;
  private pullingPct = 0;
  private pullingStatus = '';

  // Step 3 — Voice
  private voiceEnabled = false;
  private whisperInstalled = false;
  private whisperModelInstalled = false;
  private isDownloadingWhisper = false;
  private whisperPct = 0;
  private whisperStatus = '';
  private selectedVoiceId = 'fr-FR-DeniseNeural';
  private voicePreviewPlaying = false;

  constructor(
    container: HTMLElement,
    _isConnected: boolean,
    onComplete: (result: OnboardingResult) => void,
    role: 'admin' | 'user' = 'user'
  ) {
    this.container = container;
    this.onCompleteCallback = onComplete;
    this.activeRole = role;
    this.defaultUserName = localStorage.getItem('aiwidget_username') || 'Ami';
  }

  public show(): void {
    void this.initData();
    this.render();
  }

  private async initData(): Promise<void> {
    try {
      const activeProf = await api.getActiveProfile();
      if (activeProf) {
        this.activeRole = activeProf.role as 'admin' | 'user';
        if (activeProf.username) this.defaultUserName = activeProf.username;
        if (this.currentStep === 1) this.render();
      }
    } catch { /* ignore */ }

    try {
      const currentSettings = await api.getSettings();
      if (currentSettings.execution_mode) {
        this.executionMode = currentSettings.execution_mode;
      }
      if (currentSettings.server_url) {
        this.serverUrl = currentSettings.server_url;
      }
      if (currentSettings.server_auth_token) {
        this.serverToken = currentSettings.server_auth_token;
      }
    } catch { /* ignore */ }

    try {
      this.licenseStatus = await api.getLicenseStatus();
    } catch { /* ignore */ }

    try {
      this.enterprisePolicy = await api.getEnterprisePolicy();
      if (this.enterprisePolicy?.is_managed) {
        if (this.enterprisePolicy.locked_mode) this.executionMode = (this.enterprisePolicy.locked_mode as 'lite' | 'pro');
        if (this.enterprisePolicy.enforced_server_url) this.serverUrl = this.enterprisePolicy.enforced_server_url;
      }
    } catch { /* ignore */ }

    try {
      this.hardwareSpecs = await api.getHardwareSpecs();
      if (this.hardwareSpecs?.recommended_model_id) {
        this.selectedModelId = this.hardwareSpecs.recommended_model_id;
      }
      if (this.currentStep === 2) this.render();
    } catch { /* ignore */ }

    try {
      this.curatedModels = await api.listCuratedGGUFModels();
      const installed = await api.listInstalledGGUFModels();
      this.installedModelIds = installed.map((m) => m.id);
      if (this.currentStep === 2) this.render();
    } catch { /* ignore */ }

    try {
      const ws = await getWhisperStatus();
      this.whisperInstalled = ws.installed;
      this.whisperModelInstalled = ws.model_installed;
      if (this.currentStep === 3) this.render();
    } catch { /* ignore */ }

    // Set default voice for current language
    const lang = currentLanguage();
    if (lang === 'ar') this.selectedVoiceId = 'ar-SA-ZariyahNeural';
    else if (lang === 'en') this.selectedVoiceId = 'en-US-JennyNeural';
    else this.selectedVoiceId = 'fr-FR-DeniseNeural';

    if (this.currentStep === 1) this.render();
  }

  private clearTypewriter(): void {
    this.typewriterTimeouts.forEach((id) => window.clearTimeout(id));
    this.typewriterTimeouts = [];
  }

  private animateTypewriter(elementId: string, text: string, speed = 18): void {
    const el = document.getElementById(elementId);
    if (!el) return;
    this.clearTypewriter();
    el.textContent = '';
    const cursor = document.createElement('span');
    cursor.className = 'typewriter-cursor';
    cursor.textContent = '|';
    el.appendChild(cursor);
    let idx = 0;
    const typeNext = () => {
      if (idx < text.length) {
        cursor.before(text.charAt(idx++));
        this.typewriterTimeouts.push(window.setTimeout(typeNext, speed));
      } else {
        this.typewriterTimeouts.push(window.setTimeout(() => cursor.remove(), 1200));
      }
    };
    typeNext();
  }

  // ─────────── MAIN RENDER ───────────
  private render(): void {
    const isRtl = isRTL(currentLanguage());
    this.container.innerHTML = `
      <div class="onboarding-overlay ${isRtl ? 'rtl' : ''}">
        <div class="onboarding-modal ob-new">
          <!-- HEADER -->
          <div class="ob-new-header" id="obHeader" data-tauri-drag-region>
            <div class="ob-new-brand" data-tauri-drag-region>
              <img src="/logo.png" class="onboarding-logo-img" alt="Logo" data-tauri-drag-region />
              <span class="onboarding-app-name" data-tauri-drag-region>AI Widget</span>
            </div>
            <div class="ob-new-steps" data-tauri-drag-region>
              ${[1,2,3,4,5].map(s => `
                <div class="ob-step-pip ${s === this.currentStep ? 'active' : ''} ${s < this.currentStep ? 'done' : ''}" data-tauri-drag-region>
                  ${s < this.currentStep ? icons.check : s === this.currentStep ? `<span>${s}</span>` : `<span>${s}</span>`}
                </div>
              `).join('<div class="ob-step-line" data-tauri-drag-region></div>')}
            </div>
            <button class="ob-new-skip" id="obSkipBtn">${t('onboarding.skip')}</button>
          </div>

          <!-- BODY -->
          <div class="ob-new-body" id="obBody">
            ${this.renderStep()}
          </div>

          <!-- FOOTER -->
          <div class="ob-new-footer">
            ${this.currentStep > 1
              ? `<button class="ob-btn-secondary" id="obBackBtn">${icons.chevronLeft} ${t('onboarding.back')}</button>`
              : '<div></div>'
            }
            <div class="ob-footer-right">
              ${this.renderFooterAction()}
            </div>
          </div>
        </div>
      </div>
    `;
    this.attachEvents();
    this.triggerTypewriter();
  }

  private renderFooterAction(): string {
    if (this.currentStep === 2 && this.isPulling) {
      return `<button class="ob-btn-primary" disabled><span class="spin">${icons.refresh}</span> ${this.pullingPct}%</button>`;
    }
    if (this.currentStep === 3 && this.isDownloadingWhisper) {
      return `<button class="ob-btn-primary" disabled><span class="spin">${icons.refresh}</span> ${this.whisperPct}%</button>`;
    }
    if (this.currentStep === 5) {
      return `<button class="ob-btn-finish" id="obFinishBtn">${icons.sparkles} ${t('onboarding.finish')}</button>`;
    }
    const label = this.currentStep === 2 && !this.installedModelIds.includes(this.selectedModelId)
      ? `${icons.download} Installer et continuer`
      : this.currentStep === 3 && this.voiceEnabled && !this.whisperInstalled
      ? `${icons.download} Activer la voix et continuer`
      : `${t('onboarding.next')} ${icons.chevronRight}`;
    return `<button class="ob-btn-primary" id="obNextBtn">${label}</button>`;
  }

  private renderStep(): string {
    switch (this.currentStep) {
      case 1: return this.renderStep1();
      case 2: return this.renderStep2();
      case 3: return this.renderStep3();
      case 4: return this.renderStep4();
      case 5: return this.renderStep5();
      default: return '';
    }
  }

  private triggerTypewriter(): void {
    const titles: Record<number, string> = {
      1: t('onboarding.step1Title'),
      2: this.executionMode === 'pro' ? t('onboarding.proServerTitle') : 'Choisissez votre IA',
      3: 'Activer la voix ?',
      4: 'Comment afficher l\'app ?',
      5: `Tout est prêt, ${this.defaultUserName || 'ami'} !`,
    };
    const id = `obStepTitle${this.currentStep}`;
    const text = titles[this.currentStep] || '';
    setTimeout(() => this.animateTypewriter(id, text), 80);
  }

  // ── STEP 1 : Welcome + Language + Edition ──
  private renderStep1(): string {
    const lang = currentLanguage();
    const langs = [
      { code: 'fr', label: 'Français', flag: '🇫🇷', desc: 'Interface complète en français' },
      { code: 'en', label: 'English', flag: '🇬🇧', desc: 'Full English interface' },
      { code: 'ar', label: 'العربية', flag: '🌐', desc: 'واجهة عربية كاملة' },
    ];
    return `
      <div class="ob-step-content">
        <div class="ob-step-icon-big">👋</div>
        <h2 class="ob-title handwriting" id="obStepTitle1"></h2>
        <p class="ob-subtitle">${t('onboarding.step1Subtitle')}</p>

        <div class="ob-card-group">
          <!-- Pseudo -->
          <div class="ob-input-card">
            <label class="ob-label" for="obUserNameInput">${t('onboarding.pseudoLabel')}</label>
            <div class="ob-input-wrapper">
              <span class="ob-input-icon">${icons.user}</span>
              <input type="text" id="obUserNameInput" class="ob-text-input"
                placeholder="${t('onboarding.pseudoPlaceholder')}"
                value="${this.defaultUserName === 'Ami' || this.defaultUserName === 'Friend' ? '' : this.escapeHtml(this.defaultUserName)}"
                maxlength="25" />
            </div>
          </div>

          <!-- Choix d'Édition (LITE vs PRO) ou Bannière Entreprise GPO -->
          <div class="ob-input-card">
            ${this.enterprisePolicy?.is_managed && !this.enterprisePolicy.allow_mode_switch ? `
              <div class="ob-enterprise-banner">
                <div class="ob-ent-top">
                  <span class="ob-ent-icon">🏢</span>
                  <div class="ob-ent-meta">
                    <div class="ob-ent-company">${this.escapeHtml(this.enterprisePolicy.company_name || 'Entreprise')}</div>
                    <div class="ob-ent-sub">${t('enterprise.managedByOrg')}</div>
                  </div>
                  <span class="ob-badge-gpo">${t('enterprise.lockBadge')}</span>
                </div>
                <p class="ob-ent-desc">${t('enterprise.corporateOnly')}</p>
              </div>
            ` : this.activeRole === 'user' ? `
              <div class="ob-enterprise-banner">
                <div class="ob-ent-top">
                  <span class="ob-ent-icon">🔒</span>
                  <div class="ob-ent-meta">
                    <div class="ob-ent-company">${this.executionMode === 'pro' ? 'WidgetAI PRO (Réseau Entreprise)' : 'WidgetAI LITE (Poste Local)'}</div>
                    <div class="ob-ent-sub">${t('enterprise.policyLocked')}</div>
                  </div>
                  <span class="ob-badge-gpo">${t('enterprise.lockBadge')}</span>
                </div>
                <p class="ob-ent-desc">L'architecture et les accès réseau sont configurés par l'administrateur de ce poste.</p>
              </div>
            ` : `
              <label class="ob-label">${t('onboarding.editionLabel')}</label>
              <div class="ob-edition-grid">
                <button class="ob-edition-card ${this.executionMode === 'lite' ? 'active' : ''}" data-ob-mode="lite" type="button">
                  <span class="ob-edition-icon">💻</span>
                  <div class="ob-edition-info">
                    <div class="ob-edition-title">WidgetAI LITE <span class="ob-edition-pill">${t('onboarding.editionLiteTag')}</span></div>
                    <div class="ob-edition-desc">${t('onboarding.editionLiteDesc')}</div>
                  </div>
                  ${this.executionMode === 'lite' ? `<span class="ob-lang-check">${icons.check}</span>` : ''}
                </button>

                <button class="ob-edition-card ${this.executionMode === 'pro' ? 'active' : ''}" data-ob-mode="pro" type="button">
                  <span class="ob-edition-icon">🏢</span>
                  <div class="ob-edition-info">
                    <div class="ob-edition-title">WidgetAI PRO <span class="ob-edition-pill pro">${this.licenseStatus?.is_pro_unlocked ? t('onboarding.editionProTag') : t('onboarding.editionProLockedTag')}</span></div>
                    <div class="ob-edition-desc">${t('onboarding.editionProDesc')}</div>
                  </div>
                  ${this.executionMode === 'pro' ? `<span class="ob-lang-check">${icons.check}</span>` : ''}
                </button>
              </div>

              <!-- Information sur la version LITE par défaut & Déblocage Licence -->
              <div class="ob-license-info-card">
                <div class="ob-lic-info-head">
                  <span class="ob-lic-info-icon">💎</span>
                  <div class="ob-lic-info-meta">
                    <div class="ob-lic-info-title">${t('onboarding.freeLiteNoticeTitle')}</div>
                    <div class="ob-lic-info-desc">${t('onboarding.freeLiteNoticeDesc')}</div>
                  </div>
                </div>
              </div>
            `}
          </div>

          <!-- Langue -->
          <div class="ob-input-card">
            <label class="ob-label">${t('onboarding.preferredLanguage')}</label>
            <div class="ob-lang-grid-new">
              ${langs.map(l => `
                <button class="ob-lang-card ${lang === l.code ? 'active' : ''}" data-ob-lang="${l.code}">
                  <span class="ob-lang-flag">${l.flag}</span>
                  <div>
                    <div class="ob-lang-name">${l.label}</div>
                    <div class="ob-lang-desc">${l.desc}</div>
                  </div>
                  ${lang === l.code ? `<span class="ob-lang-check">${icons.check}</span>` : ''}
                </button>
              `).join('')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  private formatCpuShort(raw?: string): string {
    if (!raw) return 'CPU Standard';
    return raw
      .replace(/\(R\)/gi, '')
      .replace(/\(TM\)/gi, '')
      .replace(/CPU/gi, '')
      .replace(/@.*$/gi, '')
      .trim();
  }

  private formatGpuShort(raw?: string, isDiscrete?: boolean): string {
    if (!raw || !isDiscrete) return t('hardware.integratedGpu');
    return raw.replace(/NVIDIA\s+/i, '').replace(/Corporation\s+/i, '').trim();
  }

  private getTierLabel(): string {
    if (!this.hardwareSpecs) return t('hardware.tierCpuEntry');
    return t(this.hardwareSpecs.profile_label_key || 'hardware.tierCpuEntry');
  }

  // ── STEP 2 : Router Lite / Pro ──
  private renderStep2(): string {
    if (this.executionMode === 'pro') {
      return this.renderStep2Pro();
    }
    return this.renderStep2Lite();
  }

  // ── STEP 2 (PRO) : Server Configuration & Discovery ──
  private renderStep2Pro(): string {
    return `
      <div class="ob-step-content">
        <h2 class="ob-title handwriting" id="obStepTitle2">${t('onboarding.proServerTitle')}</h2>
        <p class="ob-subtitle">${t('onboarding.proServerSubtitle')}</p>

        <div class="ob-pro-server-card">
          <div class="ob-server-header">
            <span class="ob-server-icon">📡</span>
            <div>
              <div class="ob-server-title">${t('onboarding.serverConfigTitle')}</div>
              <div class="ob-server-subtitle">${t('onboarding.serverConfigDesc')}</div>
            </div>
          </div>

          <div class="ob-server-form">
            <div class="ob-form-field">
              <label class="ob-label" for="obServerUrlInput">${t('onboarding.serverUrlLabel')}</label>
              <div class="ob-input-wrapper">
                <span class="ob-input-icon">🔗</span>
                <input type="text" id="obServerUrlInput" class="ob-text-input"
                  placeholder="http://192.168.1.50:8080 ou http://serveur-ia.local:8080"
                  value="${this.escapeHtml(this.serverUrl)}" />
              </div>
            </div>

            <div class="ob-form-field">
              <label class="ob-label" for="obServerTokenInput">${t('onboarding.serverTokenLabel')}</label>
              <div class="ob-input-wrapper">
                <span class="ob-input-icon">🔑</span>
                <input type="password" id="obServerTokenInput" class="ob-text-input"
                  placeholder="${t('onboarding.serverTokenPlaceholder')}"
                  value="${this.escapeHtml(this.serverToken)}" />
              </div>
            </div>

            <div class="ob-server-actions">
              <button class="ob-btn-test-server ${this.serverStatus === 'testing' ? 'loading' : ''}" id="obTestServerBtn" type="button">
                ${this.serverStatus === 'testing' ? `<span class="spin">${icons.refresh}</span> ${t('onboarding.testingConnection')}` : `📡 ${t('onboarding.testConnection')}`}
              </button>
            </div>

            ${this.serverStatus === 'connected' ? `
              <div class="ob-server-status connected">
                <div class="ob-status-head">
                  <span class="ob-status-badge success">✓ ${t('onboarding.serverConnected')}</span>
                  <span class="ob-models-count">${this.serverModels.length} ${t('onboarding.modelsAvailable')}</span>
                </div>
                ${this.serverModels.length > 0 ? `
                  <div class="ob-discovered-models">
                    ${this.serverModels.map(m => `<span class="ob-model-tag">✨ ${this.escapeHtml(m)}</span>`).join('')}
                  </div>
                ` : ''}
              </div>
            ` : this.serverStatus === 'error' ? `
              <div class="ob-server-status error">
                <div class="ob-status-head">
                  <span class="ob-status-badge danger">✕ ${t('onboarding.serverError')}</span>
                </div>
                <div class="ob-error-details">${this.escapeHtml(this.serverError)}</div>
                <div class="ob-error-hint">${t('onboarding.serverErrorHint')}</div>
              </div>
            ` : `
              <div class="ob-server-status idle">
                <div class="ob-idle-hint">💡 ${t('onboarding.serverIdleHint')}</div>
              </div>
            `}
          </div>
        </div>
      </div>
    `;
  }

  // ── STEP 2 (LITE) : Choose & Download Local LLM ──
  private renderStep2Lite(): string {
    const recId = this.hardwareSpecs?.recommended_model_id || 'qwen2.5:1.5b';
    const recName = this.hardwareSpecs?.recommended_model_name || 'Qwen 2.5 1.5B';
    const recSpeed = this.hardwareSpecs?.estimated_speed_tokens_sec || '30-50 tokens/s';
    const tier = this.hardwareSpecs?.tier || 'cpu_entry';
    const isEntryCpu = tier === 'cpu_entry';
    const hasGpu = !!this.hardwareSpecs?.has_discrete_gpu;

    // 4 cartes dynamiques calibrées selon le hardware
    const featured = [
      {
        id: 'qwen2.5:1.5b',
        emoji: '⚡',
        label: 'Qwen 2.5 (1.5B)',
        tag: '1.5B',
        size: '1.0 Go',
        ram: '2 Go',
        speed: '30-50 tok/s',
        desc: isEntryCpu
          ? '⚡ Idéal pour votre processeur. Réponse instantanée et très fluide.'
          : 'Modèle ultra-léger et ultra-rapide. Idéal pour débuter et consommer peu de RAM.',
        badge: recId === 'qwen2.5:1.5b' ? 'rec' : '',
        warn: '',
        gpuTag: '',
      },
      {
        id: 'llama3.2:3b',
        emoji: '⭐',
        label: 'Llama 3.2 (3B)',
        tag: '3B',
        size: '2.0 Go',
        ram: '4 Go',
        speed: '20-35 tok/s',
        desc: 'Parfait équilibre entre intelligence et rapidité sur PC bureautique.',
        badge: recId === 'llama3.2:3b' ? 'rec' : '',
        warn: '',
        gpuTag: '',
      },
      {
        id: 'qwen2.5:3b',
        emoji: '💡',
        label: 'Qwen 2.5 (3B)',
        tag: '3B',
        size: '2.2 Go',
        ram: '4 Go',
        speed: '18-30 tok/s',
        desc: 'Excellente maîtrise du français, de l\'anglais, de l\'arabe et du code.',
        badge: recId === 'qwen2.5:3b' ? 'rec' : '',
        warn: '',
        gpuTag: '',
      },
      {
        id: 'mistral:7b',
        emoji: '🧠',
        label: 'Mistral (7B)',
        tag: '7B',
        size: '4.1 Go',
        ram: '8 Go',
        speed: hasGpu ? '40-70 tok/s (GPU)' : '5-10 tok/s (CPU)',
        desc: hasGpu
          ? '🔥 Pleine puissance activée grâce à votre carte graphique dédiée.'
          : 'Haute précision de raisonnement (recommandé avec un GPU ou processeur puissant).',
        badge: recId === 'mistral:7b' ? 'rec' : 'pro',
        warn: isEntryCpu ? t('hardware.cpuWarning') : '',
        gpuTag: hasGpu ? t('hardware.gpuFast') : '',
      },
    ];

    return `
      <div class="ob-step-content">
        <h2 class="ob-title handwriting" id="obStepTitle2"></h2>
        <p class="ob-subtitle">Sélectionnez le modèle d'IA local calibré pour la configuration de votre ordinateur.</p>

        <!-- CARTE DIAGNOSTIC MATÉRIEL EN DIRECT -->
        <div class="ob-hardware-card">
          <div class="ob-hw-header">
            <div class="ob-hw-icon-wrap">${icons.sparkles}</div>
            <div class="ob-hw-meta">
              <div class="ob-hw-title">${t('hardware.diagnosticTitle')}</div>
              <div class="ob-hw-desc">${t('hardware.diagnosticDesc')}</div>
            </div>
            <div class="ob-hw-tier-badge ob-tier-${tier}">
              ${this.getTierLabel()}
            </div>
          </div>
          <div class="ob-hw-specs-row">
            <div class="ob-hw-spec-chip" title="${this.hardwareSpecs?.cpu_name || ''}">
              <span class="ob-hw-chip-icon">🔲</span>
              <span class="ob-hw-chip-label">${t('hardware.cpu')} :</span>
              <strong class="ob-hw-chip-val">${this.formatCpuShort(this.hardwareSpecs?.cpu_name)} (${this.hardwareSpecs?.cpu_cores || 4}c)</strong>
            </div>
            <div class="ob-hw-spec-chip">
              <span class="ob-hw-chip-icon">⚡</span>
              <span class="ob-hw-chip-label">${t('hardware.ram')} :</span>
              <strong class="ob-hw-chip-val">${this.hardwareSpecs?.total_ram_gb || 8} Go</strong>
            </div>
            <div class="ob-hw-spec-chip" title="${this.hardwareSpecs?.gpu_name || ''}">
              <span class="ob-hw-chip-icon">🎮</span>
              <span class="ob-hw-chip-label">${t('hardware.gpu')} :</span>
              <strong class="ob-hw-chip-val">${this.formatGpuShort(this.hardwareSpecs?.gpu_name, this.hardwareSpecs?.has_discrete_gpu)}</strong>
            </div>
          </div>
          <div class="ob-hw-rec-banner">
            <span class="ob-hw-sparkle">✨</span>
            <span>${t('hardware.recommendedBanner', { model: recName, speed: recSpeed })}</span>
          </div>
        </div>

        <div class="ob-model-grid-new">
          ${featured.map(m => {
            const isSelected = this.selectedModelId === m.id;
            const isInstalled = this.installedModelIds.includes(m.id);
            const isRecommended = recId === m.id;
            return `
              <div class="ob-model-card-new ${isSelected ? 'selected' : ''} ${isInstalled ? 'installed' : ''} ${isRecommended ? 'recommended-hw' : ''}" data-ob-model="${m.id}">
                <div class="ob-model-card-top">
                  <span class="ob-model-emoji">${m.emoji}</span>
                  <div class="ob-model-info">
                    <div class="ob-model-label">
                      ${m.label}
                      ${isRecommended ? `<span class="ob-badge-rec">✨ ${t('hardware.recommendedBadge')}</span>` : m.badge === 'pro' ? `<span class="ob-badge-pro">PRO</span>` : ''}
                    </div>
                    <div class="ob-model-tag">${m.tag} · ${m.size} · RAM ${m.ram} · ⚡ ${m.speed}</div>
                  </div>
                  <div class="ob-model-radio ${isSelected ? 'checked' : ''}"></div>
                </div>
                <p class="ob-model-desc">${m.desc}</p>
                ${m.warn ? `<div class="ob-model-warn-tag">${m.warn}</div>` : ''}
                ${m.gpuTag ? `<div class="ob-model-gpu-tag">🔥 ${m.gpuTag}</div>` : ''}
                ${isInstalled ? '<div class="ob-model-installed-tag">✅ Déjà installé</div>' : ''}
              </div>
            `;
          }).join('')}
        </div>

        ${this.isPulling ? `
          <div class="ob-download-block">
            <div class="ob-dl-label">
              <span class="spin">${icons.refresh}</span>
              <span id="obDlStatus">${this.escapeHtml(this.pullingStatus || t('gguf.downloading'))}</span>
              <strong>${this.pullingPct}%</strong>
            </div>
            <div class="ob-dl-bar"><div class="ob-dl-bar-fill" id="obDlBarFill" style="width:${this.pullingPct}%"></div></div>
          </div>
        ` : this.installedModelIds.includes(this.selectedModelId) ? `
          <div class="ob-model-ready">✅ ${t('onboarding.modelReady')}</div>
        ` : `
          <div class="ob-dl-hint">${icons.download} ${t('onboarding.downloadHint')}</div>
        `}
      </div>
    `;
  }

  // ── STEP 3 : Voice ──
  private renderStep3(): string {
    const lang = currentLanguage();
    const voices = lang === 'fr'
      ? [{id:'fr-FR-DeniseNeural', name:'Denise', desc:'Voix féminine naturelle'}, {id:'fr-FR-HenriNeural', name:'Henri', desc:'Voix masculine'}, {id:'fr-FR-EloiseNeural', name:'Eloïse', desc:'Voix féminine douce'}]
      : lang === 'ar'
      ? [{id:'ar-SA-ZariyahNeural', name:'Zariyah', desc:'صوت أنثوي'}, {id:'ar-SA-HamedNeural', name:'Hamed', desc:'صوت ذكوري'}]
      : [{id:'en-US-JennyNeural', name:'Jenny', desc:'Natural female'}, {id:'en-US-GuyNeural', name:'Guy', desc:'Natural male'}];

    const engineReady = this.whisperInstalled && this.whisperModelInstalled;

    return `
      <div class="ob-step-content">
        <div class="ob-step-icon-big">🎙️</div>
        <h2 class="ob-title handwriting" id="obStepTitle3"></h2>
        <p class="ob-subtitle">Parlez à l'IA et elle vous répond à voix haute. Idéal en mode mains-libres.</p>

        <!-- Enable/Disable choice -->
        <div class="ob-voice-choice">
          <div class="ob-voice-option ${this.voiceEnabled ? 'selected' : ''}" id="obVoiceYes">
            <span class="ob-voice-opt-icon">🎤</span>
            <div>
              <div class="ob-voice-opt-title">Oui, activer la voix</div>
              <div class="ob-voice-opt-desc">Micro + lecture vocale des réponses</div>
            </div>
            <div class="ob-model-radio ${this.voiceEnabled ? 'checked' : ''}"></div>
          </div>
          <div class="ob-voice-option ${!this.voiceEnabled ? 'selected' : ''}" id="obVoiceNo">
            <span class="ob-voice-opt-icon">⌨️</span>
            <div>
              <div class="ob-voice-opt-title">Non merci, juste le texte</div>
              <div class="ob-voice-opt-desc">Mode texte uniquement (activable plus tard)</div>
            </div>
            <div class="ob-model-radio ${!this.voiceEnabled ? 'checked' : ''}"></div>
          </div>
        </div>

        ${this.voiceEnabled ? `
          <!-- Voice engine download -->
          ${!engineReady ? `
            <div class="ob-voice-engine-block">
              <div class="ob-voice-engine-info">
                ${icons.warn} Moteur vocal requis (142 Mo, téléchargement unique)
              </div>
              ${this.isDownloadingWhisper ? `
                <div class="ob-download-block">
                  <div class="ob-dl-label">
                    <span class="spin">${icons.refresh}</span>
                    <span>${this.whisperStatus}</span>
                    <strong>${this.whisperPct}%</strong>
                  </div>
                  <div class="ob-dl-bar"><div class="ob-dl-bar-fill" id="obWhisperBarFill" style="width:${this.whisperPct}%"></div></div>
                </div>
              ` : ''}
            </div>
          ` : `
            <div class="ob-model-ready">✅ Moteur vocal installé et prêt</div>
          `}

          <!-- Voice selector -->
          <div class="ob-voice-select-label">Choisissez une voix :</div>
          <div class="ob-voice-grid-new">
            ${voices.map(v => `
              <div class="ob-voice-card-new ${this.selectedVoiceId === v.id ? 'selected' : ''}" data-ob-voice="${v.id}">
                <div class="ob-voice-card-name">${v.name}</div>
                <div class="ob-voice-card-desc">${v.desc}</div>
                <button class="ob-voice-preview" data-preview="${v.id}">${icons.speaker} Écouter</button>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  // ── STEP 4 : Display Mode ──
  private renderStep4(): string {
    return `
      <div class="ob-step-content">
        <h2 class="ob-title handwriting" id="obStepTitle4"></h2>
        <p class="ob-subtitle">${t('onboarding.step2Subtitle')}</p>

        <div class="ob-modes-grid-new">
          <div class="ob-mode-card-new ${this.selectedDisplayMode === 'bubble' ? 'highlight' : ''}" data-ob-display-mode="bubble" style="cursor:pointer;">
            <div class="ob-mode-preview bubble-preview">
              <div class="prev-bubble"></div>
            </div>
            <h3>${t('onboarding.bubbleTitle')}</h3>
            <p>${t('onboarding.bubbleDesc')}</p>
          </div>
          <div class="ob-mode-card-new ${this.selectedDisplayMode === 'compact' ? 'highlight' : ''}" data-ob-display-mode="compact" style="cursor:pointer;">
            <div class="ob-mode-preview compact-preview">
              <div class="prev-bar"></div>
              <div class="prev-input"></div>
            </div>
            <h3>${t('onboarding.compactTitle')} ⭐</h3>
            <p>${t('onboarding.compactDesc')}</p>
          </div>
          <div class="ob-mode-card-new ${this.selectedDisplayMode === 'expanded' ? 'highlight' : ''}" data-ob-display-mode="expanded" style="cursor:pointer;">
            <div class="ob-mode-preview expanded-preview">
              <div class="prev-sidebar"></div>
              <div class="prev-chat"></div>
            </div>
            <h3>${t('onboarding.expandedTitle')}</h3>
            <p>${t('onboarding.expandedDesc')}</p>
          </div>
        </div>
        <div class="ob-tip-banner">
          <span>${icons.info}</span>
          <span>Vous pouvez changer de mode à tout moment depuis la barre de titre.</span>
        </div>
      </div>
    `;
  }

  // ── STEP 5 : All done ──
  private renderStep5(): string {
    const modelLabel = (() => {
      const m = this.curatedModels.find(m => m.id === this.selectedModelId);
      return m ? m.name : this.selectedModelId;
    })();
    const suggestions = [
      t('onboarding.suggestion1'),
      t('onboarding.suggestion2'),
      t('onboarding.suggestion3'),
      t('onboarding.suggestion4'),
    ];
    return `
      <div class="ob-step-content ob-done-step">
        <div class="ob-done-anim">🎉</div>
        <h2 class="ob-title handwriting" id="obStepTitle5"></h2>
        <p class="ob-subtitle">Voici ce qui est configuré pour vous :</p>

        <div class="ob-recap-cards">
          <div class="ob-recap-card">
            <span class="ob-recap-icon">🤖</span>
            <div>
              <div class="ob-recap-label">Modèle IA</div>
              <div class="ob-recap-value">${this.escapeHtml(modelLabel)}</div>
            </div>
            <span class="ob-recap-check">✅</span>
          </div>
          <div class="ob-recap-card">
            <span class="ob-recap-icon">🎙️</span>
            <div>
              <div class="ob-recap-label">Voix</div>
              <div class="ob-recap-value">${this.voiceEnabled ? 'Activée' : 'Désactivée (texte seul)'}</div>
            </div>
            <span class="ob-recap-check">${this.voiceEnabled ? '✅' : '—'}</span>
          </div>
          <div class="ob-recap-card">
            <span class="ob-recap-icon">🌐</span>
            <div>
              <div class="ob-recap-label">Langue</div>
              <div class="ob-recap-value">${currentLanguage() === 'fr' ? 'Français 🇫🇷' : currentLanguage() === 'ar' ? 'العربية 🌐' : 'English 🇬🇧'}</div>
            </div>
            <span class="ob-recap-check">✅</span>
          </div>
        </div>

        <div class="ob-suggestions-title">Commencez avec une question :</div>
        <div class="ob-suggestions-list">
          ${suggestions.map(s => `
            <button class="ob-suggestion-pill ${this.selectedPrompt === s ? 'selected' : ''}" data-ob-prompt="${this.escapeHtml(s)}">
              ${this.escapeHtml(s)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // ─────────── EVENTS ───────────
  private attachEvents(): void {
    document.getElementById('obHeader')?.addEventListener('mousedown', (e) => {
      if ((e.target as HTMLElement).closest('button')) return;
      void api.widgetStartDrag().catch(() => {});
    });

    document.getElementById('obSkipBtn')?.addEventListener('click', () => this.complete());
    document.getElementById('obBackBtn')?.addEventListener('click', () => {
      if (this.currentStep > 1) { this.saveStep(); this.currentStep--; this.render(); }
    });
    document.getElementById('obFinishBtn')?.addEventListener('click', () => {
      this.saveStep(); this.complete();
    });
    document.getElementById('obNextBtn')?.addEventListener('click', () => void this.handleNext());

    // Step 1: lang + name + edition mode
    document.querySelectorAll('[data-ob-mode]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (this.activeRole !== 'admin') {
          return;
        }
        const targetMode = (btn.getAttribute('data-ob-mode') as 'lite' | 'pro') || 'lite';
        if (targetMode === 'pro') {
          const isGpo = this.enterprisePolicy?.is_managed && this.enterprisePolicy.locked_mode === 'pro';
          const isLicensedPro = this.licenseStatus?.is_pro_unlocked;
          if (!isGpo && !isLicensedPro) {
            // Prompt PRO license modal immediately
            const modal = new LicenseModal(
              'pro',
              (newStatus) => {
                this.licenseStatus = newStatus;
                if (newStatus.is_pro_unlocked) {
                  this.executionMode = 'pro';
                  this.render();
                }
              },
              this.licenseStatus?.hwid
            );
            modal.show();
            return;
          }
        }
        this.saveStep();
        this.executionMode = targetMode;
        this.render();
      });
    });

    document.querySelectorAll('[data-ob-lang]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.saveStep();
        changeLanguage(btn.getAttribute('data-ob-lang')!);
        this.render();
      });
    });

    // Step 2 (Lite): model cards
    document.querySelectorAll('[data-ob-model]').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedModelId = card.getAttribute('data-ob-model')!;
        this.render();
      });
    });

    // Step 2 (Pro): server test
    document.getElementById('obTestServerBtn')?.addEventListener('click', () => {
      void this.testServerConnection();
    });

    // Step 3: voice yes/no
    document.getElementById('obVoiceYes')?.addEventListener('click', () => {
      this.voiceEnabled = true; this.render();
    });
    document.getElementById('obVoiceNo')?.addEventListener('click', () => {
      this.voiceEnabled = false; this.render();
    });

    // Step 3: voice card selection
    document.querySelectorAll('[data-ob-voice]').forEach(card => {
      card.addEventListener('click', (e) => {
        if ((e.target as HTMLElement).closest('[data-preview]')) return;
        this.selectedVoiceId = card.getAttribute('data-ob-voice')!;
        document.querySelectorAll('[data-ob-voice]').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
      });
    });

    // Step 3: voice preview
    document.querySelectorAll('[data-preview]').forEach(btn => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const voiceId = (btn as HTMLElement).getAttribute('data-preview')!;
        const text = currentLanguage() === 'fr' ? 'Bonjour, je suis votre assistante IA.'
          : currentLanguage() === 'ar' ? 'مرحباً، أنا مساعدتك الذكية'
          : 'Hello, I am your AI assistant.';
        try {
          const bytes = await api.synthesizeSpeech(text, voiceId, 1.0, 0);
          const blob = new Blob([new Uint8Array(bytes)], { type: 'audio/mp3' });
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          audio.onended = () => URL.revokeObjectURL(url);
          await audio.play();
        } catch { /* ignore */ }
      });
    });

    // Step 4: display mode selection
    document.querySelectorAll('[data-ob-display-mode]').forEach(card => {
      card.addEventListener('click', () => {
        this.selectedDisplayMode = (card.getAttribute('data-ob-display-mode') as 'bubble' | 'compact' | 'expanded') || 'compact';
        document.querySelectorAll('[data-ob-display-mode]').forEach(c => c.classList.remove('highlight'));
        card.classList.add('highlight');
      });
    });

    // Step 5: suggestion selection
    document.querySelectorAll('[data-ob-prompt]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.selectedPrompt = btn.getAttribute('data-ob-prompt')!;
        document.querySelectorAll('.ob-suggestion-pill').forEach(p => p.classList.remove('selected'));
        btn.classList.add('selected');
      });
    });
  }

  private saveStep(): void {
    if (this.currentStep === 1) {
      const input = document.getElementById('obUserNameInput') as HTMLInputElement;
      if (input?.value.trim()) {
        this.defaultUserName = input.value.trim();
        localStorage.setItem('aiwidget_username', this.defaultUserName);
      }
    } else if (this.currentStep === 2 && this.executionMode === 'pro') {
      const urlEl = document.getElementById('obServerUrlInput') as HTMLInputElement;
      const tokenEl = document.getElementById('obServerTokenInput') as HTMLInputElement;
      if (urlEl) this.serverUrl = urlEl.value.trim() || 'http://localhost:8080';
      if (tokenEl) this.serverToken = tokenEl.value.trim();
    }
  }

  private async testServerConnection(): Promise<void> {
    const urlEl = document.getElementById('obServerUrlInput') as HTMLInputElement;
    const tokenEl = document.getElementById('obServerTokenInput') as HTMLInputElement;
    if (urlEl) this.serverUrl = urlEl.value.trim() || 'http://localhost:8080';
    if (tokenEl) this.serverToken = tokenEl.value.trim();

    this.serverStatus = 'testing';
    this.render();

    try {
      const cleanUrl = this.serverUrl.replace(/\/+$/, '');
      const headers: Record<string, string> = {};
      if (this.serverToken) headers['Authorization'] = `Bearer ${this.serverToken}`;

      let res = await fetch(`${cleanUrl}/api/v1/models`, { method: 'GET', headers }).catch(() => null);
      if (!res || !res.ok) {
        res = await fetch(`${cleanUrl}/api/tags`, { method: 'GET', headers }).catch(() => null);
      }

      if (res && res.ok) {
        const data = await res.json();
        const models: string[] = [];
        if (Array.isArray(data)) {
          models.push(...data.map((m: any) => m.name || m.id || String(m)));
        } else if (data.models && Array.isArray(data.models)) {
          models.push(...data.models.map((m: any) => m.name || m.id || String(m)));
        }
        this.serverModels = models.length > 0 ? models : ['Default Remote LLM'];
        this.serverStatus = 'connected';
      } else {
        this.serverStatus = 'error';
        this.serverError = res ? `Erreur HTTP ${res.status}` : 'Serveur injoignable sur cette adresse.';
      }
    } catch (e) {
      this.serverStatus = 'error';
      this.serverError = (e as Error).message || 'Échec de connexion au serveur.';
    }
    this.render();
  }

  private async handleNext(): Promise<void> {
    this.saveStep();

    // Step 2 (Lite): trigger LLM download if not installed
    if (this.currentStep === 2 && this.executionMode === 'lite' && !this.installedModelIds.includes(this.selectedModelId) && !this.isPulling) {
      await this.downloadLLM();
      return; // downloadLLM will advance step on completion
    }

    // Step 2 (Pro): save server url
    if (this.currentStep === 2 && this.executionMode === 'pro') {
      const settings = await api.getSettings().catch(() => null);
      if (settings) {
        settings.execution_mode = 'pro';
        settings.server_url = this.serverUrl;
        settings.server_auth_token = this.serverToken;
        await api.saveSettings(settings).catch(() => {});
      }
    }

    // Step 3: trigger whisper download if voice enabled and not installed
    if (this.currentStep === 3 && this.voiceEnabled && !this.whisperInstalled && !this.isDownloadingWhisper) {
      await this.downloadWhisperEngine();
      return;
    }

    if (this.currentStep < this.totalSteps) {
      this.currentStep++;
      this.render();
    }
  }

  private async downloadLLM(): Promise<void> {
    this.isPulling = true;
    this.pullingPct = 2;
    this.pullingStatus = t('gguf.progressStarting');
    this.render();

    const unlisten = await api.onGGUFDownloadProgress((p) => {
      if (p.model_id === this.selectedModelId) {
        this.pullingPct = p.percentage;
        this.pullingStatus = getProgressLabel(p);
        const fill = document.getElementById('obDlBarFill') as HTMLElement;
        if (fill) fill.style.width = `${this.pullingPct}%`;
        const statusEl = document.getElementById('obDlStatus');
        if (statusEl) statusEl.textContent = this.pullingStatus;
        const btn = document.getElementById('obNextBtn') as HTMLButtonElement;
        if (btn) btn.innerHTML = `<span class="spin">${icons.refresh}</span> ${this.pullingPct}%`;
      }
    });

    try {
      await api.downloadGGUFModel(this.selectedModelId);
      await api.listInstalledGGUFModels().then(list => {
        this.installedModelIds = list.map(m => m.id);
      });
      const settings = await api.getSettings();
      settings.default_model = this.selectedModelId;
      settings.execution_mode = 'lite';
      await api.saveSettings(settings);
      this.isPulling = false;
      this.currentStep++;
      this.render();
    } catch (e) {
      this.pullingStatus = `${t('common.error')}: ${(e as Error).message || String(e)}`;
      this.isPulling = false;
      this.render();
    } finally {
      unlisten();
    }
  }

  private async downloadWhisperEngine(): Promise<void> {
    this.isDownloadingWhisper = true;
    this.whisperPct = 0;
    this.whisperStatus = 'Démarrage...';
    this.render();

    try {
      await downloadWhisper((p) => {
        this.whisperPct = Math.round(p.percentage);
        this.whisperStatus = p.status;
        const fill = document.getElementById('obWhisperBarFill') as HTMLElement;
        if (fill) fill.style.width = `${this.whisperPct}%`;
      });
      const ws = await getWhisperStatus();
      this.whisperInstalled = ws.installed;
      this.whisperModelInstalled = ws.model_installed;
      // Save voice settings
      const settings = await api.getSettings();
      settings.voice_enabled = true;
      settings.voice_auto_speak = true;
      settings.voice_id = this.selectedVoiceId;
      await api.saveSettings(settings);
      this.isDownloadingWhisper = false;
      this.currentStep++;
      this.render();
    } catch (e) {
      this.whisperStatus = 'Erreur: ' + ((e as Error).message || String(e));
      this.isDownloadingWhisper = false;
      this.render();
    }
  }

  private escapeHtml(text: string): string {
    const d = document.createElement('div');
    d.textContent = text;
    return d.innerHTML;
  }

  private complete(): void {
    this.clearTypewriter();
    // Save settings (edition, server, voice, etc.)
    api.getSettings().then(s => {
      s.execution_mode = this.executionMode;
      s.server_url = this.serverUrl;
      s.server_auth_token = this.serverToken;
      if (this.voiceEnabled) {
        s.voice_enabled = true;
        s.voice_id = this.selectedVoiceId;
      }
      return api.saveSettings(s);
    }).catch(() => {});

    if (this.executionMode === 'pro') {
      setTransport(new HttpSseTransport(this.serverUrl, this.serverToken));
    } else {
      setTransport(new TauriIpcTransport());
    }

    localStorage.setItem('aiwidget_onboarded', 'true');
    localStorage.setItem('aiwidget_username', this.defaultUserName);
    this.container.innerHTML = '';
    this.onCompleteCallback({
      username: this.defaultUserName,
      language: currentLanguage(),
      initialPrompt: this.selectedPrompt,
      executionMode: this.executionMode,
      serverUrl: this.serverUrl,
      serverToken: this.serverToken,
      displayMode: this.selectedDisplayMode,
    });
  }
}
