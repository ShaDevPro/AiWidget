import { t } from '../../i18n';
import type { ModalsManager } from '../modals/ModalsManager';
import { WebIntentService } from './WebIntentService';
import type { WebGateDecision, WebPrivacyPromptOptions } from './types';

/** Minimum classifier confidence before prompting for web access (ChatGPT-like gate). */
const CONFIDENCE_THRESHOLD = 0.55;

/** Skip LLM router for trivial offline queries (greetings, very short). */
function isTrivialOfflineQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length <= 0) return true;
  if (q.length <= 16) return true;
  return /^(bonjour|salut|hello|hi|hey|coucou|merci|thanks|thank you|ok|d'accord|dac|yo|cc|bonsoir|good morning|good evening|مرحبا|السلام|شكرا)[\s!.?]*$/iu.test(q);
}

export class WebPermissionGate {
  constructor(private modals: ModalsManager) {}

  async evaluateBeforeGenerate(params: {
    query: string;
    model: string;
    baseUrl: string;
    webEnabled: boolean;
  }): Promise<WebGateDecision> {
    if (params.webEnabled) {
      return { type: 'generate_with_web' };
    }

    if (isTrivialOfflineQuery(params.query)) {
      return { type: 'generate_offline' };
    }

    const intent = await WebIntentService.classify(
      params.query,
      params.model,
      params.baseUrl,
    );

    if (!intent.needsWeb || intent.confidence < CONFIDENCE_THRESHOLD) {
      return { type: 'generate_offline', intent };
    }

    const choice = await this.modals.showWebPrivacyAsync({
      reasonKey: intent.category,
      confidence: intent.confidence,
      context: 'pre-generate',
    });

    if (choice === 'allow') {
      return { type: 'generate_with_web', intent };
    }

    return { type: 'offline_honest', intent };
  }

  /** Secondary safety net after the model refuses due to missing live data. */
  async evaluatePostRefusal(options?: WebPrivacyPromptOptions): Promise<'allow' | 'deny'> {
    return this.modals.showWebPrivacyAsync({
      ...options,
      context: 'post-refusal',
    });
  }

  static offlineHonestContent(category: string): string {
    const reasonKey = `web.denied.reason.${category}`;
    const reason = t(reasonKey, { defaultValue: t('web.denied.reason.general') });
    return `
      <div class="web-offline-honest-card">
        <div class="web-offline-honest-icon">${t('web.denied.icon')}</div>
        <div class="web-offline-honest-body">
          <strong class="web-offline-honest-title">${t('web.denied.title')}</strong>
          <p class="web-offline-honest-reason">${reason}</p>
          <p class="web-offline-honest-hint">${t('web.denied.hint')}</p>
        </div>
      </div>`;
  }
}
