import { call, listen, type UnlistenFn } from './_core';
import type { SDStatus, ImageGenerationResult, SDDownloadProgress, SDGenerationProgress } from '../types';

export const imageApi = {
  getSDStatus: (): Promise<SDStatus> => call<SDStatus>('get_sd_status'),
  openSDFolder: (): Promise<void> => call<void>('open_sd_folder'),

  downloadSD: (): Promise<void> => call<void>('download_sd'),

  generateImage: (
    prompt: string,
    negativePrompt?: string,
    width?: number,
    height?: number,
    steps?: number,
    seed?: number,
  ): Promise<ImageGenerationResult> =>
    call<ImageGenerationResult>('generate_image_sd', {
      prompt,
      negativePrompt,
      width,
      height,
      steps,
      seed,
    }),

  onDownloadProgress: (cb: (progress: SDDownloadProgress) => void): Promise<UnlistenFn> =>
    listen<SDDownloadProgress>('sd-download-progress', (e) => {
      if (e.payload) cb(e.payload);
    }),

  onGenerationProgress: (cb: (data: SDGenerationProgress) => void): Promise<UnlistenFn> =>
    listen<SDGenerationProgress>('sd-generation-progress', (e) => {
      if (e.payload) cb(e.payload);
    }),
};
