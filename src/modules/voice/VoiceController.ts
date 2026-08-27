/**
 * VoiceController — UI orchestration for voice input/output (wraps VoiceModule).
 */
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import type { AppSettings } from '../../types';
import type { VoiceModule } from './VoiceModule';
import type { ToastService } from '../../ui/ToastService';

export interface VoiceControllerDeps {
  voiceModule: VoiceModule;
  toast: ToastService;
  getSettings: () => AppSettings;
  checkFeatureAccess: (feature: 'voice') => boolean;
  promptLicense: (tier: 'lite' | 'pro') => void;
  toggleSettings: (open: boolean) => void;
  onSendMessage: () => void;
  onRender: () => void;
  onUpdateTitles: () => void;
  onUpdateSendButton: () => void;
  getIsGenerating: () => boolean;
  setIsGenerating: (v: boolean) => void;
}

export class VoiceController {
  private animFrame: number | null = null;

  constructor(private deps: VoiceControllerDeps) {}

  init(settings: AppSettings): void {
    void this.deps.voiceModule.loadWhisperStatus();
    void this.deps.voiceModule.loadVoices();
    if (settings.voice_enabled) {
      this.deps.voiceModule.init(settings);
    }
  }

  wireTranscription(): void {
    this.deps.voiceModule.onTranscribed = (text: string) => {
      const input = document.getElementById('chatInput') as HTMLTextAreaElement | null;
      if (input) {
        input.value = text;
        this.deps.onUpdateSendButton();
      }
      void this.deps.onSendMessage();
    };
    this.deps.voiceModule.onStateChange = () => this.updateUI();
  }

  updateUI(): void {
    const state = this.deps.voiceModule.voiceState;
    const micBtn = document.getElementById('voiceMicBtn');
    if (micBtn) {
      micBtn.className = `voice-btn ${state === 'recording' ? 'recording' : state === 'speaking' ? 'speaking' : ''}`;
      micBtn.innerHTML = state === 'speaking' ? icons.speaker : state !== 'idle' ? icons.waveform : icons.microphone;
    }

    const indicator = document.getElementById('voiceInlineIndicator');
    const needsRerender = (state !== 'idle' && !indicator) || (state === 'idle' && !!indicator);
    if (needsRerender) {
      this.deps.onRender();
      this.deps.onUpdateTitles();
      if (state !== 'idle') this.startWaveformAnimation();
      return;
    }

    const label = indicator?.querySelector('.voice-inline-label');
    if (label) {
      if (state === 'recording') label.textContent = t('voice.listening');
      else if (state === 'transcribing') label.textContent = t('voice.transcribing');
      else if (state === 'thinking') label.textContent = t('voice.thinking');
      else if (state === 'speaking') label.textContent = t('voice.speaking');
    }
  }

  startWaveformAnimation(): void {
    if (this.animFrame !== null) cancelAnimationFrame(this.animFrame);
    const animate = () => {
      const bars = document.querySelectorAll<HTMLElement>('.voice-inline-bar');
      if (bars.length === 0) return;
      const state = this.deps.voiceModule.voiceState;
      const manager = (this.deps.voiceModule as unknown as { voiceManager?: { getAnalyserData?: () => Uint8Array } }).voiceManager;

      if (state === 'recording' && manager?.getAnalyserData) {
        const data = manager.getAnalyserData();
        bars.forEach((bar, i) => {
          const val = data ? data[Math.floor((i * data.length) / bars.length)] || 0 : 0;
          bar.style.height = `${Math.max(3, Math.round(val / 4))}px`;
        });
      } else if (state === 'speaking') {
        bars.forEach((bar, i) => {
          bar.style.height = `${Math.round(4 + Math.abs(Math.sin(Date.now() / 200 + i * 0.7)) * 18)}px`;
          bar.style.background = 'var(--success)';
        });
      } else if (state === 'transcribing') {
        bars.forEach((bar, i) => {
          bar.style.height = `${Math.round(4 + Math.abs(Math.sin(Date.now() / 300 + i * 0.5)) * 24)}px`;
          bar.style.background = 'var(--accent)';
        });
      } else if (state === 'thinking') {
        bars.forEach((bar, i) => {
          bar.style.height = `${Math.round(6 + Math.abs(Math.sin(Date.now() / 400 + i * 0.8)) * 16)}px`;
          bar.style.background = 'var(--warning, #f59e0b)';
        });
      }
      this.animFrame = requestAnimationFrame(animate);
    };
    this.animFrame = requestAnimationFrame(animate);
  }

  attachEvents(): void {
    const handleMicClick = () => {
      if (!this.deps.checkFeatureAccess('voice')) {
        this.deps.promptLicense('lite');
        return;
      }
      const settings = this.deps.getSettings();
      if (!settings.voice_enabled) {
        this.deps.toggleSettings(true);
        setTimeout(() => {
          document.querySelector('.voice-settings-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 200);
        return;
      }

      const vm = this.deps.voiceModule;
      if (!vm.voiceState || vm.voiceState === 'idle') {
        vm.init(settings);
        void vm.startRecording().catch(() => this.deps.toast.show(t('voice.micPermission'), 'error'));
      } else if (vm.voiceState === 'speaking') {
        vm.stopSpeaking();
      } else {
        vm.stop();
      }
    };

    document.getElementById('voiceMicBtn')?.addEventListener('click', handleMicClick);
    document.getElementById('compactVoiceMicBtn')?.addEventListener('click', handleMicClick);
    document.getElementById('voiceStopBtn')?.addEventListener('click', () => this.deps.voiceModule.stopRecording());
    document.getElementById('voiceStopSpeakBtn')?.addEventListener('click', () => {
      this.deps.voiceModule.stopSpeaking();
      if (this.deps.getIsGenerating()) this.deps.setIsGenerating(false);
      this.updateUI();
    });
  }

  handleVoiceResponse(response: string): void {
    const settings = this.deps.getSettings();
    if (this.deps.voiceModule.isVoiceTriggered && settings.voice_enabled && settings.voice_auto_speak && response) {
      this.deps.voiceModule.isVoiceTriggered = false;
      void this.deps.voiceModule.speakText(response, settings);
    } else {
      this.deps.voiceModule.isVoiceTriggered = false;
      if (this.deps.voiceModule.voiceState === 'thinking') {
        this.deps.voiceModule.voiceState = 'idle';
        this.updateUI();
      }
    }
  }

  resetThinkingState(): void {
    if (this.deps.voiceModule.voiceState === 'thinking') {
      this.deps.voiceModule.voiceState = 'idle';
      this.updateUI();
    }
  }
}
