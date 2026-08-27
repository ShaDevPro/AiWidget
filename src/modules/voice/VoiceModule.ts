/**
 * VoiceModule — Voice state machine, TTS, waveform animation.
 * Isolated: never directly touches chat or search state.
 */
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { VoiceManager, type VoiceState } from '../../ui/VoiceManager';
import type { AppSettings, TTSVoice, WhisperStatus } from '../../types';
import { api } from '../../api';

export type { VoiceState };

export class VoiceModule {
  voiceState: VoiceState = 'idle';
  pendingVoiceText: string | null = null;
  isVoiceTriggered = false;

  private voiceManager: VoiceManager | null = null;
  private ttsVoices: TTSVoice[] = [];
  private whisperStatus: WhisperStatus = { installed: false, model_installed: false, binary_path: '' };
  private voiceAnimFrame: number | null = null;

  // Callbacks wired by App orchestrator
  onTranscribed?: (text: string) => void;
  onStateChange?: (state: VoiceState) => void;
  onError?: (msg: string) => void;

  init(settings: AppSettings): void {
    if (!settings.voice_enabled) return;
    this.createVoiceManager(settings);
  }

  createVoiceManager(settings: AppSettings): void {
    this.voiceManager?.stop();
    this.voiceManager = new VoiceManager(
      (text: string) => {
        this.isVoiceTriggered = true;
        this.pendingVoiceText = text;
        this.onTranscribed?.(text);
      },
      (state: VoiceState) => {
        this.voiceState = state;
        this.onStateChange?.(state);
        if (state === 'idle' && this.voiceAnimFrame !== null) {
          cancelAnimationFrame(this.voiceAnimFrame);
          this.voiceAnimFrame = null;
        } else if (state !== 'idle') {
          this.startWaveformAnimation(state);
        }
      },
      settings,
    );
  }

  async startRecording(): Promise<void> {
    if (!this.voiceManager) return;
    await this.voiceManager.startRecording();
  }

  stopRecording(): void {
    this.voiceManager?.stopRecording();
  }

  stopSpeaking(): void {
    this.voiceManager?.stopSpeaking();
    this.voiceState = 'idle';
    this.onStateChange?.('idle');
  }

  stop(): void {
    this.voiceManager?.stop();
    this.voiceState = 'idle';
    this.onStateChange?.('idle');
  }

  async speakText(text: string, settings: AppSettings): Promise<void> {
    if (!settings.voice_enabled) return;
    const clean = this.cleanForTTS(text);
    if (!clean) return;

    this.voiceState = 'speaking';
    this.onStateChange?.('speaking');

    try {
      if (this.voiceManager) {
        await this.voiceManager.speak(clean, settings.voice_id || 'fr-FR-DeniseNeural');
      }
    } catch (e) {
      console.error('TTS error:', e);
    } finally {
      this.voiceState = 'idle';
      this.onStateChange?.('idle');
    }
  }

  private cleanForTTS(text: string): string {
    return text
      .replace(/```[\s\S]*?```/g, '')
      .replace(/`[^`]+`/g, '')
      .replace(/^#{1,6}\s+/gm, '')
      .replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1')
      .replace(/_{1,2}([^_]+)_{1,2}/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/^[\s]*[-*+]\s+/gm, '')
      .replace(/^\s*\d+\.\s+/gm, '')
      .replace(/\n{2,}/g, '. ')
      .replace(/\n/g, ' ')
      .trim()
      .split(/[.!?]+/)
      .slice(0, 3)
      .join('. ')
      .trim();
  }

  /** Render the inline voice indicator HTML snippet */
  renderIndicator(): string {
    if (this.voiceState === 'idle') return '';
    const label =
      this.voiceState === 'recording' ? t('voice.listening') :
      this.voiceState === 'transcribing' ? t('voice.transcribing') :
      this.voiceState === 'thinking' ? t('voice.thinking') :
      t('voice.speaking');

    const stopBtnId =
      this.voiceState === 'recording' ? 'voiceStopBtn' : 'voiceStopSpeakBtn';

    const bars = Array.from({ length: 8 }, (_, i) =>
      `<div class="voice-inline-bar" id="vbar${i}" style="height:4px"></div>`
    ).join('');

    const showStop = ['recording', 'thinking', 'speaking'].includes(this.voiceState);

    return `
      <div class="voice-inline-indicator" id="voiceInlineIndicator">
        <div class="voice-inline-bars" id="voiceInlineBars">${bars}</div>
        <span class="voice-inline-label">${label}</span>
        ${showStop ? `
          <button class="voice-stop-btn" id="${stopBtnId}" style="padding:5px 14px;font-size:11px;">
            ${icons.stop} ${t('voice.stopBtn')}
          </button>` : ''}
      </div>`;
  }

  attachEvents(
    settings: AppSettings,
    onMicClick: () => void,
  ): void {
    const micBtn = document.getElementById('voiceMicBtn');
    const compactMicBtn = document.getElementById('compactVoiceMicBtn');
    const stopBtn = document.getElementById('voiceStopBtn');
    const stopSpeakBtn = document.getElementById('voiceStopSpeakBtn');

    micBtn?.addEventListener('click', onMicClick);
    compactMicBtn?.addEventListener('click', onMicClick);

    stopBtn?.addEventListener('click', () => this.stopRecording());
    stopSpeakBtn?.addEventListener('click', () => this.stopSpeaking());
  }

  startWaveformAnimation(state: VoiceState): void {
    if (this.voiceAnimFrame !== null) cancelAnimationFrame(this.voiceAnimFrame);
    const colors = {
      recording: '#3b82f6',
      transcribing: '#8b5cf6',
      thinking: '#f97316',
      speaking: '#22c55e',
      idle: '#94a3b8',
    };
    const color = colors[state] || '#94a3b8';
    let t2 = 0;
    const animate = () => {
      t2 += 0.15;
      for (let i = 0; i < 8; i++) {
        const bar = document.getElementById(`vbar${i}`);
        if (bar) {
          const h = state === 'idle' ? 4 : 4 + Math.abs(Math.sin(t2 + i * 0.5)) * 20;
          bar.style.height = h + 'px';
          bar.style.backgroundColor = color;
        }
      }
      this.voiceAnimFrame = requestAnimationFrame(animate);
    };
    this.voiceAnimFrame = requestAnimationFrame(animate);
  }

  async loadVoices(): Promise<TTSVoice[]> {
    try {
      this.ttsVoices = await api.listTTSVoices();
    } catch { this.ttsVoices = []; }
    return this.ttsVoices;
  }

  async loadWhisperStatus(): Promise<WhisperStatus> {
    try {
      this.whisperStatus = await api.getWhisperStatus();
    } catch { /* keep default */ }
    return this.whisperStatus;
  }

  get voices(): TTSVoice[] { return this.ttsVoices; }
  get whisper(): WhisperStatus { return this.whisperStatus; }
}
