/**
 * attachVoiceTab — Event handlers for the voice settings tab.
 */
import { t } from '../../../i18n';
import { downloadWhisper, previewVoice } from '../../../ui/VoiceManager';
import type { SettingsHost } from '../SettingsHost';

export function attachVoiceTab(host: SettingsHost, panel: HTMLElement): void {
  const voiceEnabledToggle = panel.querySelector('#voiceEnabledToggle') as HTMLInputElement;
  voiceEnabledToggle?.addEventListener('change', () => {
    host.settings.voice_enabled = voiceEnabledToggle.checked;
    const micBtn = document.getElementById('voiceMicBtn');
    if (micBtn) micBtn.style.display = host.settings.voice_enabled ? '' : 'none';
    if (host.settings.voice_enabled) {
      host.voiceModule.init(host.settings);
    } else {
      host.voiceModule.stop();
    }
  });

  const voiceAutoSpeakToggle = panel.querySelector('#voiceAutoSpeakToggle') as HTMLInputElement;
  voiceAutoSpeakToggle?.addEventListener('change', () => {
    host.settings.voice_auto_speak = voiceAutoSpeakToggle.checked;
    if (host.settings.voice_enabled) host.voiceModule.init(host.settings);
  });

  const voiceContinuousToggle = panel.querySelector('#voiceContinuousToggle') as HTMLInputElement;
  voiceContinuousToggle?.addEventListener('change', () => {
    host.settings.voice_continuous_mode = voiceContinuousToggle.checked;
    if (host.settings.voice_enabled) host.voiceModule.init(host.settings);
  });

  const voiceSpeedSlider = panel.querySelector('#voiceSpeedSlider') as HTMLInputElement;
  const voiceSpeedVal = panel.querySelector('#voiceSpeedVal') as HTMLElement;
  voiceSpeedSlider?.addEventListener('input', () => {
    const val = parseFloat(voiceSpeedSlider.value);
    host.settings.voice_speed = val;
    if (host.settings.voice_enabled) host.voiceModule.init(host.settings);
    if (voiceSpeedVal) voiceSpeedVal.textContent = val.toFixed(1) + 'x';
  });

  panel.querySelectorAll('[data-voice-id]').forEach(card => {
    card.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      if (target.closest('[data-preview-voice]')) return;
      const voiceId = (card as HTMLElement).getAttribute('data-voice-id')!;
      host.settings.voice_id = voiceId;
      if (host.settings.voice_enabled) host.voiceModule.init(host.settings);
      panel.querySelectorAll('[data-voice-id]').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
    });
  });

  panel.querySelectorAll('[data-preview-voice]').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const voiceId = (btn as HTMLElement).getAttribute('data-preview-voice')!;
      const btn2 = btn as HTMLButtonElement;
      btn2.disabled = true;
      try {
        await previewVoice(voiceId, host.settings.language || 'fr');
      } catch (err) {
        console.error('[Preview] TTS error:', err);
        host.toast('Erreur lecture vocale', 'error');
      } finally {
        btn2.disabled = false;
      }
    });
  });

  panel.querySelector('#downloadWhisperBtn')?.addEventListener('click', async () => {
    const progressDiv = panel.querySelector('#whisperDownloadProgress') as HTMLElement;
    const progressFill = panel.querySelector('#whisperProgressFill') as HTMLElement;
    const progressLabel = panel.querySelector('#whisperProgressLabel') as HTMLElement;
    if (progressDiv) progressDiv.style.display = 'block';
    try {
      await downloadWhisper((p) => {
        if (progressFill) progressFill.style.width = `${p.percentage}%`;
        if (progressLabel) progressLabel.textContent = p.status;
      });
      await host.voiceModule.loadWhisperStatus();
      host.render();
      host.toggleSettings(true);
      host.toast(t('voice.engineReady'), 'success');
    } catch (err) {
      host.toast((err as Error).message || 'Download failed', 'error');
    }
  });
}
