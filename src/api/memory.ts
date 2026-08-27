import { call } from './_core';
import type { UserMemory } from '../types';

export const memoryApi = {
  getUserMemories: (): Promise<UserMemory[]> =>
    call<UserMemory[]>('get_user_memories'),

  saveUserMemory: (category: string, key: string, content: string): Promise<UserMemory> =>
    call<UserMemory>('save_user_memory', { category, key, content }),

  deleteUserMemory: (id: string): Promise<void> =>
    call<void>('delete_user_memory', { id }),

  clearUserMemories: (): Promise<void> =>
    call<void>('clear_user_memories'),
};
