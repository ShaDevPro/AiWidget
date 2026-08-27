import { call, listen, type UnlistenFn } from './_core';
import type { CuratedGGUFModel, GGUFDownloadProgress, InstalledGGUFModel, LlamaEngineStatus, PartialGGUFDownload } from '../types';

export const modelsApi = {
  listCuratedGGUFModels: (): Promise<CuratedGGUFModel[]> =>
    call<CuratedGGUFModel[]>('list_curated_gguf_models'),

  listPartialGGUFDownloads: (): Promise<PartialGGUFDownload[]> =>
    call<PartialGGUFDownload[]>('list_partial_gguf_downloads'),

  listInstalledGGUFModels: (): Promise<InstalledGGUFModel[]> =>
    call<InstalledGGUFModel[]>('list_installed_gguf_models'),

  downloadGGUFModel: (modelId: string): Promise<string> =>
    call<string>('download_gguf_model', { modelId }),

  importLocalGGUF: (filePath: string): Promise<InstalledGGUFModel> =>
    call<InstalledGGUFModel>('import_local_gguf', { filePath }),

  deleteGGUFModel: (modelIdentifier: string): Promise<void> =>
    call<void>('delete_gguf_model', { modelIdentifier }),

  getLlamaEngineStatus: (): Promise<LlamaEngineStatus> =>
    call<LlamaEngineStatus>('get_llama_engine_status'),

  startLlamaEngine: (modelIdentifier: string): Promise<void> =>
    call<void>('start_llama_engine', { modelIdentifier }),

  stopLlamaEngine: (): Promise<void> =>
    call<void>('stop_llama_engine'),

  onGGUFDownloadProgress: (cb: (payload: GGUFDownloadProgress) => void): Promise<UnlistenFn> =>
    listen<GGUFDownloadProgress>('gguf-download-progress', (e) => {
      cb(e.payload);
    }),
};
