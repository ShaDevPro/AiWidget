/**
 * VoiceTab — Settings panel "voice" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderVoiceTab(host: SettingsHost): string {
  return `
            <!-- ── VOIX ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('voice.voiceSettings')}</h2>

              <!-- Engine status -->
              <div class="sp-status-row ${host.voiceModule.whisper.installed && host.voiceModule.whisper.model_installed ? 'connected' : 'disconnected'}">
                <span class="sp-status-dot"></span>
                <span>${host.voiceModule.whisper.installed && host.voiceModule.whisper.model_installed ? t('voice.engineReady') : t('voice.engineNotReady')}</span>
                ${!host.voiceModule.whisper.installed || !host.voiceModule.whisper.model_installed ? `
                  <button class="sp-btn-primary" id="downloadWhisperBtn">${icons.download} Installer</button>
                ` : ''}
              </div>

              ${!host.voiceModule.whisper.installed || !host.voiceModule.whisper.model_installed ? `
                <div id="whisperDownloadProgress" class="sp-progress-wrap" style="display:none">
                  <div class="sp-progress-bar-track"><div class="sp-progress-bar-fill" id="whisperProgressFill" style="width:0%"></div></div>
                  <div class="sp-progress-label" id="whisperProgressLabel"></div>
                </div>
              ` : ''}

              <div class="sp-card">
                <div class="sp-toggle-row">
                  <div>
                    <label class="sp-label">${t('voice.enabled')}</label>
                    <p class="sp-desc">Activer microphone et lecture vocale</p>
                  </div>
                  <label class="voice-toggle">
                    <input type="checkbox" id="voiceEnabledToggle" ${host.settings.voice_enabled ? 'checked' : ''}>
                    <div class="voice-toggle-track"></div><div class="voice-toggle-thumb"></div>
                  </label>
                </div>
                <div class="sp-toggle-row">
                  <div>
                    <label class="sp-label">${t('voice.autoSpeak')}</label>
                    <p class="sp-desc">Lire automatiquement les réponses de l'IA</p>
                  </div>
                  <label class="voice-toggle">
                    <input type="checkbox" id="voiceAutoSpeakToggle" ${host.settings.voice_auto_speak ? 'checked' : ''}>
                    <div class="voice-toggle-track"></div><div class="voice-toggle-thumb"></div>
                  </label>
                </div>
                <div class="sp-toggle-row">
                  <div>
                    <label class="sp-label">${t('voice.continuousMode')}</label>
                    <p class="sp-desc">Relancer le micro automatiquement après chaque réponse</p>
                  </div>
                  <label class="voice-toggle">
                    <input type="checkbox" id="voiceContinuousToggle" ${host.settings.voice_continuous_mode ? 'checked' : ''}>
                    <div class="voice-toggle-track"></div><div class="voice-toggle-thumb"></div>
                  </label>
                </div>
              </div>

              <div class="sp-card">
                <label class="sp-label">${t('voice.voiceSpeed')}</label>
                <div class="sp-slider-row">
                  <span>🐢</span>
                  <input type="range" id="voiceSpeedSlider" min="0.5" max="2.0" step="0.1" value="${host.settings.voice_speed}" style="flex:1">
                  <span>🐇</span>
                  <span class="sp-slider-val" id="voiceSpeedVal">${host.settings.voice_speed}x</span>
                </div>
              </div>

              <div class="sp-card">
                <label class="sp-label">${t('voice.selectVoice')}</label>
                <p class="sp-desc">Voix filtrées selon votre langue (${host.settings.language})</p>
                <div class="sp-voice-grid" id="voiceGrid">
                  ${host.voiceModule.voices.filter(v => v.language === (host.settings.language || 'fr')).map(v => `
                    <div class="sp-voice-card ${host.settings.voice_id === v.id ? 'selected' : ''}" data-voice-id="${v.id}">
                      <div class="sp-voice-avatar">${v.gender === 'female' ? '👩' : '👨'}</div>
                      <div class="sp-voice-info">
                        <div class="sp-voice-name">${v.name}</div>
                        <div class="sp-voice-meta">${v.gender === 'female' ? t('voice.femaleVoice') : t('voice.maleVoice')}</div>
                      </div>
                      <button class="sp-btn-ghost" data-preview-voice="${v.id}">${icons.speaker}</button>
                    </div>
                  `).join('')}
                </div>
              </div>
            </div>
  `;
}
