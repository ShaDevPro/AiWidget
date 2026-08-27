import fs from 'fs';

function transform(code) {
  return code
    .replace(/this\./g, 'host.')
    .replace(/host\.enterprisePolicy/g, 'host.licenseModule.enterprisePolicy')
    .replace(/host\.licenseStatus/g, 'host.licenseModule.licenseStatus')
    .replace(/host\.whisperStatus/g, 'host.voiceModule.whisper')
    .replace(/host\.ttsVoices/g, 'host.voiceModule.voices')
    .replace(/host\.showCustomPull/g, 'host.modelsModule.showCustomPull')
    .replace(/host\.currentConversation/g, 'host.sidebarModule.currentConversation')
    .replace(/host\.createVoiceManager\(\)/g, 'host.voiceModule.init(host.settings)')
    .replace(/host\.voiceManager\?/g, '/* voiceManager */ null ?')
    .replace(/host\.voiceManager!/g, '/* voiceManager */ null!')
    .replace(/host\.voiceManager\./g, 'host.voiceModule.');
}

const lines = fs.readFileSync('src/App.ts', 'utf8').split('\n');

const renderBody = lines.slice(1227, 1739).join('\n');
const attachBody = lines.slice(2193, 2597).join('\n');

const viewFile = `/**
 * SettingsView — Renders the settings panel HTML.
 */
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { RECOMMENDED_MODELS } from '../../constants/recommendedModels';
import type { SettingsHost } from './SettingsHost';

export class SettingsView {
  render(host: SettingsHost): string {
${transform(renderBody)}
  }
}
`;

const ctrlFile = `/**
 * SettingsController — Binds settings panel event handlers.
 */
import { api } from '../../api';
import { setTransport, HttpSseTransport, TauriIpcTransport } from '../../api/_core';
import { changeLanguage, t } from '../../i18n';
import { getWhisperStatus, downloadWhisper, previewVoice } from '../../ui/VoiceManager';
import type { SettingsHost } from './SettingsHost';

export class SettingsController {
  attach(host: SettingsHost): void {
${transform(attachBody)}
  }
}
`;

fs.writeFileSync('src/modules/settings/SettingsView.ts', viewFile);
fs.writeFileSync('src/modules/settings/SettingsController.ts', ctrlFile);
console.log('Done:', viewFile.split('\n').length, ctrlFile.split('\n').length, 'lines');
