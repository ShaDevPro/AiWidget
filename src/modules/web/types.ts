/** Web intent classification result (mirrors Rust WebIntentResult). */
export type WebIntentCategory =
  | 'weather'
  | 'news'
  | 'finance'
  | 'sports'
  | 'live_facts'
  | 'general'
  | 'creative';

export interface WebIntentResult {
  needsWeb: boolean;
  confidence: number;
  category: WebIntentCategory;
}

export type WebGateDecision =
  | { type: 'generate_with_web'; intent?: WebIntentResult }
  | { type: 'generate_offline'; intent?: WebIntentResult }
  | { type: 'offline_honest'; intent: WebIntentResult };

export interface WebPrivacyPromptOptions {
  reasonKey?: WebIntentCategory | string;
  confidence?: number;
  context?: 'pre-generate' | 'post-refusal';
}
