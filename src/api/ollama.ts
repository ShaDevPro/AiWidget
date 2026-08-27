import { call, listen, type UnlistenFn } from './_core';

export const ollamaApi = {
  checkOllamaStatus: (baseUrl?: string): Promise<{ installed: boolean; running: boolean; path?: string }> =>
    call<{ installed: boolean; running: boolean; path?: string }>('check_ollama_status', { baseUrl }),

  startOllama: (): Promise<void> =>
    call<void>('start_ollama'),

  installOllama: (): Promise<void> =>
    call<void>('install_ollama'),

  onOllamaInstallProgress: (cb: (payload: { status: string; completed: number; total: number }) => void): Promise<UnlistenFn> =>
    listen<{ status: string; completed: number; total: number }>('ollama-install-progress', (e) => {
      cb(e.payload);
    }),
};
