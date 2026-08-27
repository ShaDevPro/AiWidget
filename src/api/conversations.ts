import { call } from './_core';
import type { Conversation, Message, MessageInput, MessageSearchResult } from '../types';

export const conversationsApi = {
  getConversations: (): Promise<Conversation[]> =>
    call<Conversation[]>('get_conversations'),

  createConversation: (title: string, model: string): Promise<Conversation> =>
    call<Conversation>('create_conversation', { title, model }),

  deleteConversation: (id: string): Promise<void> =>
    call<void>('delete_conversation', { id }),

  toggleConversationPin: (id: string): Promise<boolean> =>
    call<boolean>('toggle_conversation_pin', { id }),

  updateConversationTitle: (id: string, title: string): Promise<void> =>
    call<void>('update_conversation_title', { id, title }),

  getMessages: (conversationId: string): Promise<Message[]> =>
    call<Message[]>('get_messages', { conversationId }),

  saveMessage: (message: MessageInput): Promise<Message> =>
    call<Message>('save_message', { message }),

  deleteMessage: (id: string): Promise<void> =>
    call<void>('delete_message', { id }),

  deleteMessagesFrom: (conversationId: string, fromCreatedAt: string): Promise<void> =>
    call<void>('delete_messages_from', { conversationId, fromCreatedAt }),

  searchMessages: (query: string): Promise<MessageSearchResult[]> =>
    call<MessageSearchResult[]>('search_messages', { query }),
};
