import { call } from './_core';
import type { TTSVoice, WhisperStatus } from '../types';

export const voiceApi = {
  listTTSVoices: (): Promise<TTSVoice[]> =>
    call<TTSVoice[]>('list_tts_voices'),

  synthesizeSpeech: (text: string, voiceId: string, rate: number, pitch: number): Promise<number[]> =>
    call<number[]>('synthesize_speech', { text, voiceId, rate, pitch }),

  transcribeAudio: (audioData: number[]): Promise<{ text: string; language: string }> =>
    call<{ text: string; language: string }>('transcribe_audio', { audioData }),

  getWhisperStatus: (): Promise<WhisperStatus> =>
    call<WhisperStatus>('get_whisper_status'),

  downloadWhisper: (): Promise<void> =>
    call<void>('download_whisper'),
};
