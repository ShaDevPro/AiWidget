import { call } from './_core';
import type { WebIntentResult } from '../modules/web/types';

interface RawWebIntentResult {
  needs_web: boolean;
  confidence: number;
  category: string;
}

export const webIntentApi = {
  classifyWebIntent: (
    query: string,
    model?: string,
    baseUrl?: string,
  ): Promise<WebIntentResult> =>
    call<RawWebIntentResult>('classify_web_intent', { query, model, baseUrl }).then((raw) => ({
      needsWeb: !!raw.needs_web,
      confidence: raw.confidence ?? 0,
      category: (raw.category || 'general') as WebIntentResult['category'],
    })),
};
