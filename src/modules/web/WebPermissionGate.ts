import { t } from '../../i18n';
import type { ModalsManager } from '../modals/ModalsManager';
import { WebIntentService } from './WebIntentService';
import type { WebGateDecision, WebPrivacyPromptOptions, WebIntentResult } from './types';

/** Minimum classifier confidence before prompting for web access (ChatGPT-like gate). */
const CONFIDENCE_THRESHOLD = 0.55;

/** Skip LLM router for trivial offline queries (greetings, very short). */
function isTrivialOfflineQuery(query: string): boolean {
  const q = query.trim().toLowerCase();
  if (q.length <= 0) return true;
  if (q.length <= 16) return true;
  return /^(bonjour|salut|hello|hi|hey|coucou|merci|thanks|thank you|ok|d'accord|dac|yo|cc|bonsoir|good morning|good evening|مرحبا|السلام|شكرا)[\s!.?]*$/iu.test(q);
}

/** Deterministic pattern matching for queries that unequivocally require internet access / live data. */
function matchesDeterministicWebIntent(query: string): { needsWeb: boolean; category: string } | null {
  const l = query.toLowerCase();

  // 1. Direct URLs & Domains
  if (
    l.includes('http://') ||
    l.includes('https://') ||
    l.includes('www.') ||
    /\b[a-z0-9-]+\.(com|io|org|net|fr|dz|ai|app|dev|co|edu|gov)\b/i.test(l)
  ) {
    return { needsWeb: true, category: 'live_facts' };
  }

  // 2. Action triggers to visit, check or search external websites
  const webActionPhrases = [
    'visite le site',
    'visiter le site',
    'consulte le site',
    'consulter le site',
    'regarde ce lien',
    'analyse ce site',
    'cherche sur internet',
    'cherche sur le web',
    'cherche sur google',
    'recherche sur internet',
    'recherche sur le web',
    'search the web',
    'search online',
    'visit website',
    'check this site',
    'browse url',
    'ابحث في الويب',
    'ابحث في الانترنت',
    'تصفح الموقع',
    'زر الموقع',
  ];
  if (webActionPhrases.some((phrase) => l.includes(phrase))) {
    return { needsWeb: true, category: 'live_facts' };
  }

  // 3. Real-time live data keywords (weather, exchange rates, etc.)
  const isWeather = l.includes('météo') || l.includes('meteo') || l.includes('température') || l.includes('temperature') || l.includes('weather') || l.includes('طقس');
  const isFinance = l.includes('cours du dinar') || l.includes('cours de l\'euro') || l.includes('cours du dollar') || l.includes('taux de change') || l.includes('prix du dinar') || l.includes('exchange rate') || l.includes('سعر الصرف');

  if (isWeather) {
    return { needsWeb: true, category: 'weather' };
  }
  if (isFinance) {
    return { needsWeb: true, category: 'finance' };
  }

  return null;
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

    // 1. Fast-Path: Deterministic Check (Instantly catches URLs, site visits, currency, weather)
    const fastIntent = matchesDeterministicWebIntent(params.query);
    let intent: WebIntentResult;

    if (fastIntent) {
      intent = {
        needsWeb: true,
        confidence: 1.0,
        category: fastIntent.category as WebIntentResult['category'],
      };
    } else {
      intent = await WebIntentService.classify(
        params.query,
        params.model,
        params.baseUrl,
      );
    }

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
