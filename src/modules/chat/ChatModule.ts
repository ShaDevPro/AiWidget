/**
 * ChatModule — Chat state (messages, generation flags, web sources).
 */
import { api } from '../../api';
import type { Message, WebSource } from '../../types';

export class ChatModule {
  messages: Message[] = [];
  isGenerating = false;
  stopRequested = false;
  pendingAssistantId: string | null = null;
  /** Sources received during current generation (attached to assistant message). */
  pendingWebSources: WebSource[] = [];

  isExplicitWebSearchCommand(text: string): boolean {
    const l = text.toLowerCase();
    return (
      l.includes('cherche sur internet') ||
      l.includes('cherche sur le web') ||
      l.includes('recherche sur internet') ||
      l.includes('recherche sur le web') ||
      l.includes('cherche sur google') ||
      l.includes('sur internet') ||
      l.includes('sur google') ||
      l.includes('search the web') ||
      l.includes('search web') ||
      l.includes('search online')
    );
  }

  async loadMessages(conversationId: string): Promise<void> {
    try {
      this.messages = await api.getMessages(conversationId);
    } catch {
      this.messages = [];
    }
  }

  clearMessages(): void {
    this.messages = [];
    this.pendingWebSources = [];
  }
}
