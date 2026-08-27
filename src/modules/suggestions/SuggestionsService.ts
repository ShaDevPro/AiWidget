/**
 * SuggestionsService — Dynamic, contextual chat suggestions connected to RAG and Conversational Memory.
 * Light theme only. Full i18n support.
 */

import { t } from '../../i18n';
import type { RAGDocument, UserMemory } from '../../types';

export interface DynamicSuggestion {
  id: string;
  badge: string;
  badgeClass: string;
  icon: string;
  label: string;
  prompt: string;
}

export class SuggestionsService {
  /**
   * Generates dynamic suggestions based on loaded RAG documents and user memories.
   */
  static getSuggestions(ragDocs: RAGDocument[], memories: UserMemory[]): DynamicSuggestion[] {
    const list: DynamicSuggestion[] = [];

    // 1. ── RAG Document suggestions (if files are indexed) ─────────────────
    if (ragDocs && ragDocs.length > 0) {
      const topDoc = ragDocs[0];
      const filename = topDoc.filename;
      list.push({
        id: 'rag-doc',
        badge: t('suggestions.badgeRag'),
        badgeClass: 'sug-rag',
        icon: '📄',
        label: t('suggestions.ragDocPrompt').replace('{file}', filename),
        prompt: t('suggestions.ragDocPrompt').replace('{file}', filename),
      });

      if (ragDocs.length > 1) {
        list.push({
          id: 'rag-summary',
          badge: t('suggestions.badgeRag'),
          badgeClass: 'sug-rag',
          icon: '📚',
          label: t('suggestions.ragSummary'),
          prompt: t('suggestions.ragSummary'),
        });
      }
    }

    // 2. ── Conversational Memory suggestions (if memories exist) ───────────
    if (memories && memories.length > 0) {
      list.push({
        id: 'mem-recall',
        badge: t('suggestions.badgeMemory'),
        badgeClass: 'sug-memory',
        icon: '🧠',
        label: t('suggestions.memoryRecall'),
        prompt: t('suggestions.memoryRecall'),
      });
    }

    // 3. ── General Productivity / Creative suggestions ─────────────────────
    const standardSuggestions: Array<{
      id: string;
      badgeKey: string;
      badgeClass: string;
      icon: string;
      promptKey: string;
    }> = [
      {
        id: 'gen-writing',
        badgeKey: 'suggestions.badgeWriting',
        badgeClass: 'sug-writing',
        icon: '✉️',
        promptKey: 'onboarding.suggestion2', // Rédige un email professionnel
      },
      {
        id: 'gen-explain',
        badgeKey: 'suggestions.badgeIdea',
        badgeClass: 'sug-idea',
        icon: '💡',
        promptKey: 'onboarding.suggestion1', // Explique-moi l'intelligence artificielle simplement
      },
      {
        id: 'gen-analysis',
        badgeKey: 'suggestions.badgeAnalysis',
        badgeClass: 'sug-analysis',
        icon: '📊',
        promptKey: 'onboarding.suggestion3', // Meilleurs conseils pour organiser sa journée
      },
      {
        id: 'gen-correct',
        badgeKey: 'suggestions.badgeCode',
        badgeClass: 'sug-code',
        icon: '✨',
        promptKey: 'onboarding.suggestion4', // Aide-moi à corriger et améliorer ce texte
      },
    ];

    for (const item of standardSuggestions) {
      if (list.length >= 4) break;
      list.push({
        id: item.id,
        badge: t(item.badgeKey),
        badgeClass: item.badgeClass,
        icon: item.icon,
        label: t(item.promptKey),
        prompt: t(item.promptKey),
      });
    }

    return list;
  }
}
