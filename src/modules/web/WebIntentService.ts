import { call } from '../../api/_core';
import type { WebIntentResult } from './types';

interface RawWebIntentResult {
  needs_web: boolean;
  confidence: number;
  category: string;
}

function normalize(raw: RawWebIntentResult): WebIntentResult {
  const category = (
    ['weather', 'news', 'finance', 'sports', 'live_facts', 'general', 'creative'] as const
  ).includes(raw.category as WebIntentResult['category'])
    ? (raw.category as WebIntentResult['category'])
    : 'live_facts';

  return {
    needsWeb: !!raw.needs_web,
    confidence: Math.max(0, Math.min(1, raw.confidence ?? 0)),
    category,
  };
}

export const WebIntentService = {
  async classify(query: string, model: string, baseUrl: string): Promise<WebIntentResult> {
    try {
      const raw = await call<RawWebIntentResult>('classify_web_intent', {
        query,
        model,
        baseUrl,
      });
      return normalize(raw);
    } catch (e) {
      console.warn('[WebIntentService] classification failed:', e);
      return { needsWeb: false, confidence: 0, category: 'general' };
    }
  },
};
