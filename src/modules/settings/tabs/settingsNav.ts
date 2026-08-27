/**
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
