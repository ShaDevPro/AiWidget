import { invoke } from '@tauri-apps/api/tauri';
import { listen } from '@tauri-apps/api/event';
import type { TTSVoice, WhisperStatus } from '../types';

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'thinking' | 'speaking';

const VAD_THRESHOLD = 0.012;   // RMS level to consider as voice
const VAD_SILENCE_MS = 3000;   // 3s silence → auto-stop
const CHUNK_SIZE = 2048;

export class VoiceManager {
  private stream: MediaStream | null = null;
  private _state: VoiceState = 'idle';
  private currentAudio: HTMLAudioElement | null = null;
  private analyser: AnalyserNode | null = null;
  private audioCtx: AudioContext | null = null;
  private scriptProcessor: ScriptProcessorNode | null = null;
  private pcmChunks: Float32Array[] = [];
  private sampleRate = 44100;
  private hasVoice = false;
  private lastVoiceTime = 0;
  private autoStopTimer: ReturnType<typeof setTimeout> | null = null;
  private onTranscribed: ((text: string) => void) | null = null;
  private onStateChange: ((state: VoiceState) => void) | null = null;
  voiceId = 'fr-BE-GerardNeural';
  autoSpeak = true;
  continuousMode = false;
  speed = 1.0;

  constructor(
    onTranscribed: (text: string) => void,
    onStateChange: (state: VoiceState) => void,
    settings: { voice_id: string; voice_auto_speak: boolean; voice_continuous_mode: boolean; voice_speed: number }
  ) {
    this.onTranscribed = onTranscribed;
    this.onStateChange = onStateChange;
    this.voiceId = settings.voice_id || 'fr-BE-GerardNeural';
    this.autoSpeak = settings.voice_auto_speak ?? true;
    this.continuousMode = settings.voice_continuous_mode ?? false;
    this.speed = settings.voice_speed || 1.0;
  }

  get currentState(): VoiceState { return this._state; }
  private setState(s: VoiceState): void { this._state = s; this.onStateChange?.(s); }

  async startRecording(): Promise<void> {
    if (this._state !== 'idle') return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const btMic = devices.find(d =>
        d.kind === 'audioinput' &&
        (d.label.includes('AirPods') || d.label.includes('Bluetooth') ||
         d.label.includes('Headset') || d.label.includes('casque') || d.label.includes('kit'))
      );
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: btMic
          ? { deviceId: { exact: btMic.deviceId }, echoCancellation: true, noiseSuppression: true }
          : { echoCancellation: true, noiseSuppression: true }
      });

      this.audioCtx = new AudioContext();
      this.sampleRate = this.audioCtx.sampleRate;
      const source = this.audioCtx.createMediaStreamSource(this.stream);

      // Analyser for waveform visualization
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      source.connect(this.analyser);

      // ScriptProcessor: capture raw PCM + VAD (no webm encoding problems)
      this.pcmChunks = [];
      this.hasVoice = false;
      this.lastVoiceTime = Date.now();

      // eslint-disable-next-line deprecation/deprecation
      this.scriptProcessor = this.audioCtx.createScriptProcessor(CHUNK_SIZE, 1, 1);
      this.scriptProcessor.onaudioprocess = (e) => {
        const input = e.inputBuffer.getChannelData(0);
        this.pcmChunks.push(new Float32Array(input));

        // VAD: RMS level detection
        let sum = 0;
        for (let i = 0; i < input.length; i++) sum += input[i] * input[i];
        const rms = Math.sqrt(sum / input.length);

        if (rms > VAD_THRESHOLD) {
          this.lastVoiceTime = Date.now();
          this.hasVoice = true;
        }

        // Auto-stop: 3s of silence AFTER some voice detected
        if (this.hasVoice && Date.now() - this.lastVoiceTime > VAD_SILENCE_MS) {
          this.stopRecording();
        }
      };

      source.connect(this.scriptProcessor);
      this.scriptProcessor.connect(this.audioCtx.destination);

      this.setState('recording');

      // Hard limit: 60s max recording
      this.autoStopTimer = setTimeout(() => {
        if (this._state === 'recording') this.stopRecording();
      }, 60000);
    } catch (e) {
      console.error('[Voice] Mic error:', e);
      this.setState('idle');
      throw e;
    }
  }

  stopRecording(): void {
    if (this.autoStopTimer) { clearTimeout(this.autoStopTimer); this.autoStopTimer = null; }
    if (this._state !== 'recording') return;

    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;

    if (this.scriptProcessor) {
      this.scriptProcessor.disconnect();
      this.scriptProcessor = null;
    }

    this.setState('transcribing');
    void this.processRecording();
  }

  /** Build 16kHz mono WAV from raw PCM chunks captured by ScriptProcessor */
  private buildWav(chunks: Float32Array[], srcSampleRate: number): Uint8Array {
    const targetRate = 16000;
    const totalIn = chunks.reduce((s, c) => s + c.length, 0);
    const allSamples = new Float32Array(totalIn);
    let off = 0;
    for (const c of chunks) { allSamples.set(c, off); off += c.length; }

    // Linear interpolation resample to 16kHz
    const ratio = targetRate / srcSampleRate;
    const outLen = Math.floor(allSamples.length * ratio);
    const out = new Float32Array(outLen);
    for (let i = 0; i < outLen; i++) {
      const src = i / ratio;
      const lo = Math.floor(src);
      const hi = Math.min(lo + 1, allSamples.length - 1);
      out[i] = allSamples[lo] + (allSamples[hi] - allSamples[lo]) * (src - lo);
    }

    // Write WAV header
    const buf = new ArrayBuffer(44 + out.length * 2);
    const v = new DataView(buf);
    const s = (o: number, str: string) => { for (let i = 0; i < str.length; i++) v.setUint8(o + i, str.charCodeAt(i)); };
    s(0, 'RIFF'); v.setUint32(4, 36 + out.length * 2, true); s(8, 'WAVE');
    s(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true);
    v.setUint16(22, 1, true); v.setUint32(24, targetRate, true);
    v.setUint32(28, targetRate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    s(36, 'data'); v.setUint32(40, out.length * 2, true);
    let o2 = 44;
    for (let i = 0; i < out.length; i++) {
      const x = Math.max(-1, Math.min(1, out[i]));
      v.setInt16(o2, x < 0 ? x * 0x8000 : x * 0x7FFF, true);
      o2 += 2;
    }
    return new Uint8Array(buf);
  }

  private async processRecording(): Promise<void> {
    const chunks = this.pcmChunks;
    this.pcmChunks = [];

    if (chunks.length === 0 || !this.hasVoice) {
      this.audioCtx?.close().catch(() => {});
      this.audioCtx = null;
      this.analyser = null;
      this.setState('idle');
      return;
    }

    try {
      const wavBytes = this.buildWav(chunks, this.sampleRate);
      console.log('[Voice] WAV built:', wavBytes.length, 'bytes at 16kHz');
      const audioData = Array.from(wavBytes);
      const result = await invoke<{ text: string; language: string }>('transcribe_audio', { audioData });
      console.log('[Voice] Transcribed:', result.text);
      if (result.text.trim()) {
        this.setState('thinking');
        this.onTranscribed?.(result.text.trim());
      } else {
        this.setState('idle');
      }
    } catch (e) {
      console.error('[Voice] Transcription error:', e);
      this.setState('idle');
    } finally {
      this.audioCtx?.close().catch(() => {});
      this.audioCtx = null;
      this.analyser = null;
    }
  }

  async speak(text: string, voiceId?: string): Promise<void> {
    this.stopSpeaking();
    const voice = voiceId || this.voiceId;
    try {
      this.setState('speaking');
      const audioBytes = await invoke<number[]>('synthesize_speech', { text, voiceId: voice, rate: this.speed, pitch: 0 });
      if (!audioBytes || audioBytes.length === 0) { this.setState('idle'); return; }
      // Detect format: WAV starts with RIFF, MP3 starts with 0xFF or ID3
      const isWav = audioBytes[0] === 0x52 && audioBytes[1] === 0x49; // 'RI'
      const mimeType = isWav ? 'audio/wav' : 'audio/mpeg';
      const blob = new Blob([new Uint8Array(audioBytes)], { type: mimeType });
      const url = URL.createObjectURL(blob);
      this.currentAudio = new Audio(url);
      this.currentAudio.onended = () => {
        URL.revokeObjectURL(url);
        this.currentAudio = null;
        this.setState('idle');
        if (this.continuousMode) setTimeout(() => void this.startRecording(), 600);
      };
      this.currentAudio.onerror = (err) => {
        console.error('[Voice] Playback error:', err);
        this.currentAudio = null;
        this.setState('idle');
      };
      await this.currentAudio.play();
    } catch (e) {
      console.error('[Voice] TTS error:', e);
      this.currentAudio = null;
      this.setState('idle');
    }
  }

  stopSpeaking(): void {
    if (this.currentAudio) { this.currentAudio.pause(); this.currentAudio = null; }
    if (this._state === 'speaking') this.setState('idle');
  }

  stop(): void {
    if (this.autoStopTimer) { clearTimeout(this.autoStopTimer); this.autoStopTimer = null; }
    if (this._state === 'recording') this.stopRecording();
    this.stopSpeaking();
    this.audioCtx?.close().catch(() => {});
    this.audioCtx = null;
    this.analyser = null;
    this.pcmChunks = [];
  }

  getAnalyserData(): Uint8Array | null {
    if (!this.analyser) return null;
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data;
  }

  setVoice(id: string): void { this.voiceId = id; }
  setAutoSpeak(v: boolean): void { this.autoSpeak = v; }
  setContinuousMode(v: boolean): void { this.continuousMode = v; }
  setSpeed(v: number): void { this.speed = v; }
}

export async function getWhisperStatus(): Promise<WhisperStatus> {
  return invoke<WhisperStatus>('get_whisper_status');
}

export async function downloadWhisper(
  onProgress: (p: { step: string; percentage: number; status: string }) => void
): Promise<void> {
  const unlisten = await listen<{ step: string; percentage: number; status: string }>(
    'whisper-download-progress', (e) => onProgress(e.payload)
  );
  try {
    await invoke('download_whisper');
  } finally {
    unlisten();
  }
}

/** Standalone voice preview — does NOT change VoiceManager state */
export async function previewVoice(voiceId: string, language: string): Promise<void> {
  const text = language === 'ar'
    ? '\u0645\u0631\u062d\u0628\u0627\u060c \u0623\u0646\u0627 \u0645\u0633\u0627\u0639\u062f\u0643 \u0627\u0644\u0630\u0643\u064a'
    : language === 'fr'
    ? 'Bonjour, je suis votre assistant IA.'
    : 'Hello, I am your AI assistant.';

  const audioBytes = await invoke<number[]>('synthesize_speech', { text, voiceId, rate: 1.0, pitch: 0 });
  if (!audioBytes || audioBytes.length === 0) throw new Error('TTS returned empty audio');
  const isWav = audioBytes[0] === 0x52 && audioBytes[1] === 0x49;
  const blob = new Blob([new Uint8Array(audioBytes)], { type: isWav ? 'audio/wav' : 'audio/mpeg' });
  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.onended = () => URL.revokeObjectURL(url);
  audio.onerror = () => URL.revokeObjectURL(url);
  await audio.play();
}

export async function listTTSVoices(): Promise<TTSVoice[]> {
  return invoke<TTSVoice[]>('list_tts_voices');
}
