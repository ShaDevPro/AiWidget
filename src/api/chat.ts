import { call, listen, type UnlistenFn } from './_core';
import type { ChatMessage, LLMModel } from '../types';

export const chatApi = {
  cancelGeneration: (): Promise<void> => call<void>('cancel_generation'),

  generateResponse: (
    model: string,
    messages: ChatMessage[],
    temperature?: number,
    maxTokens?: number,
    baseUrl?: string,
    enableWebSearch?: boolean,
  ): Promise<string> =>
    call<string>('generate_response', {
      model,
      messages,
      temperature,
      maxTokens,
      baseUrl,
      enableWebSearch,
    }),

  listModels: (baseUrl?: string): Promise<LLMModel[]> =>
    call<LLMModel[]>('list_models', { baseUrl }),

  pullModel: (model: string, baseUrl?: string): Promise<void> =>
    call<void>('pull_model', { model, baseUrl }),

  checkConnection: (baseUrl?: string): Promise<boolean> =>
    call<boolean>('check_ollama_connection', { baseUrl }),

  onChatToken: (cb: (content: string, done: boolean) => void): Promise<UnlistenFn> =>
    listen<any>('chat-token', (e) => {
      if (typeof e.payload === 'string') {
        try {
          const parsed = JSON.parse(e.payload);
          if (parsed && typeof parsed.content === 'string') {
            cb(parsed.content, !!parsed.done);
            return;
          }
        } catch { /* text string */ }
        cb(e.payload, false);
      } else if (e.payload && typeof e.payload.content === 'string') {
        cb(e.payload.content, !!e.payload.done);
      }
    }),

  onPullProgress: (cb: (payload: unknown) => void): Promise<UnlistenFn> =>
    listen<unknown>('model-pull-progress', (e) => {
      cb(e.payload);
    }),
};
