/**
 * SettingsView — Renders the settings panel HTML.
 */
import { icons } from '../../ui/icons';
import type { SettingsHost } from './SettingsHost';
import { getSettingsNavItems, resolveSettingsTab } from './tabs/settingsNav';
import { renderGeneralTab } from './tabs/GeneralTab';
import { renderLicenseTab } from './tabs/LicenseTab';
import { renderModelsTab } from './tabs/ModelsTab';
import { renderVoiceTab } from './tabs/VoiceTab';
import { renderImageTab } from './tabs/ImageTab';
import { renderKnowledgeTab } from './tabs/KnowledgeTab';
import { renderMemoryTab } from './tabs/MemoryTab';
import { renderAdvancedTab } from './tabs/AdvancedTab';

const TAB_RENDERERS: Record<string, (host: SettingsHost) => string> = {
  general: renderGeneralTab,
  license: renderLicenseTab,
  models: renderModelsTab,
  voice: renderVoiceTab,
  image: renderImageTab,
  knowledge: renderKnowledgeTab,
  memory: renderMemoryTab,
  advanced: renderAdvancedTab,
};

export class SettingsView {
  render(host: SettingsHost): string {
    const tab = resolveSettingsTab(host);
    const navItems = getSettingsNavItems(host);
    const renderTab = TAB_RENDERERS[tab] ?? renderGeneralTab;

    return `
      <div class="settings-premium">

        <!-- LEFT NAV -->
        <nav class="sp-nav">
          <div class="sp-nav-header">
            <img src="/logo.png" class="sp-nav-logo" alt="Logo" />
            <span class="sp-nav-title">Paramètres</span>
          </div>
          <ul class="sp-nav-list">
            ${navItems.map(n => `
              <li class="sp-nav-item ${tab === n.id ? 'active' : ''}" data-settings-tab="${n.id}">
                <span class="sp-nav-icon">${n.icon}</span>
                <span>${n.label}</span>
              </li>
            `).join('')}
          </ul>
          <div class="sp-nav-footer">
            <button class="sp-save-btn" id="saveSettingsBtn">
              ${icons.check} Enregistrer
            </button>
            <button class="sp-close-btn" id="closeSettingsBtn">
              ${icons.close}
            </button>
          </div>
        </nav>

        <!-- MAIN CONTENT -->
        <div class="sp-content">
          ${renderTab(host)}
        </div>
      </div>
    `;
  }
}
