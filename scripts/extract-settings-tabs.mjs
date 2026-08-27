import fs from 'fs';
import path from 'path';

const viewLines = fs.readFileSync('src/modules/settings/SettingsView.ts', 'utf8').split('\n');
const ctrlLines = fs.readFileSync('src/modules/settings/SettingsController.ts', 'utf8').split('\n');

const tabsDir = 'src/modules/settings/tabs';
fs.mkdirSync(tabsDir, { recursive: true });

function slice(lines, start, end) {
  return lines.slice(start - 1, end).join('\n');
}

const tabHtml = {
  general: { lines: slice(viewLines, 61, 182), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"], preamble: `    const isProMode = host.settings.execution_mode === 'pro';
    const isAdmin = host.activeProfile?.role === 'admin';
` },
  license: { lines: slice(viewLines, 185, 249), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"] },
  models: { lines: slice(viewLines, 252, 303), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';", "import { RECOMMENDED_MODELS } from '../../../constants/recommendedModels';"], preamble: `    const installedNames = new Set(host.models.map((m) => m.name.toLowerCase()));
` },
  voice: { lines: slice(viewLines, 306, 385), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"] },
  knowledge: { lines: slice(viewLines, 388, 459), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"] },
  memory: { lines: slice(viewLines, 462, 490), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"] },
  advanced: { lines: slice(viewLines, 493, 517), imports: ["import { t } from '../../../i18n';", "import { icons } from '../../../ui/icons';"] },
};

for (const [name, cfg] of Object.entries(tabHtml)) {
  const className = name.charAt(0).toUpperCase() + name.slice(1) + 'Tab';
  const imports = [...cfg.imports, "import type { SettingsHost } from '../SettingsHost';"].join('\n');
  const preamble = cfg.preamble ?? '';
  fs.writeFileSync(
    path.join(tabsDir, `${className}.ts`),
    `/**
 * ${className} — Settings panel "${name}" tab.
 */
${imports}

export function render${className}(host: SettingsHost): string {
${preamble}  return \`
${cfg.lines}
  \`;
}
`,
  );
}

const ctrlBlocks = {
  GeneralTab: [slice(ctrlLines, 70, 72), '', slice(ctrlLines, 103, 137)].join('\n'),
  LicenseTab: slice(ctrlLines, 74, 101),
  ModelsTab: slice(ctrlLines, 139, 217),
  KnowledgeTab: slice(ctrlLines, 219, 283),
  MemoryTab: slice(ctrlLines, 285, 329),
  VoiceTab: slice(ctrlLines, 331, 414),
  AdvancedTab: slice(ctrlLines, 158, 172),
};

for (const [name, body] of Object.entries(ctrlBlocks)) {
  fs.writeFileSync(
    path.join(tabsDir, `attach${name}.ts`),
    `/**
 * attach${name} — Event handlers for the ${name.replace('Tab', '').toLowerCase()} settings tab.
 */
import { api } from '../../../api';
import { setTransport, HttpSseTransport, TauriIpcTransport } from '../../../api/_core';
import { changeLanguage, t } from '../../../i18n';
import { downloadWhisper, previewVoice } from '../../../ui/VoiceManager';
import type { SettingsHost } from '../SettingsHost';

export function attach${name}(host: SettingsHost, panel: HTMLElement): void {
${body}
}
`,
  );
}

fs.writeFileSync(
  path.join(tabsDir, 'attachCommonTab.ts'),
  `/**
 * attachCommonTab — Shared settings panel events (nav, theme, save, language).
 */
import { changeLanguage } from '../../../i18n';
import { api } from '../../../api';
import type { SettingsHost } from '../SettingsHost';

export function attachCommonTab(host: SettingsHost, panel: HTMLElement): void {
${slice(ctrlLines, 15, 68)}
}
`,
);

fs.writeFileSync(
  path.join(tabsDir, 'settingsNav.ts'),
  `/**
 * settingsNav — Navigation items for the settings panel.
 */
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export interface NavItem {
  id: string;
  icon: string;
  label: string;
  adminOnly?: boolean;
  proOnly?: boolean;
}

export function getSettingsNavItems(host: SettingsHost): NavItem[] {
  const isProMode = host.settings.execution_mode === 'pro';
  const isAdmin = host.activeProfile?.role === 'admin';
  const all: NavItem[] = [
    { id: 'general', icon: '🌐', label: t('settings.general') },
    { id: 'license', icon: '🔑', label: t('license.settingsTab'), proOnly: true },
    { id: 'models', icon: '🤖', label: t('settings.llm'), adminOnly: true },
    { id: 'voice', icon: '🎙️', label: t('voice.voiceSettings') },
    { id: 'knowledge', icon: '📚', label: t('rag.title') },
    { id: 'memory', icon: '🧠', label: t('memory.title') },
    { id: 'advanced', icon: '⚙️', label: t('settings.parameters') },
  ];
  return all.filter(n => (!n.adminOnly || isAdmin) && (!n.proOnly || isProMode));
}

export function resolveSettingsTab(host: SettingsHost): string {
  const isProMode = host.settings.execution_mode === 'pro';
  if (!isProMode && host.settingsTab === 'license') {
    host.settingsTab = 'general';
  }
  return host.settingsTab || 'general';
}
`,
);

console.log('Settings tabs generated.');
