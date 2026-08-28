/**
 * SettingsController — Binds settings panel event handlers.
 */
import type { SettingsHost } from './SettingsHost';
import { attachCommonTab } from './tabs/attachCommonTab';
import { attachGeneralTab } from './tabs/attachGeneralTab';
import { attachLicenseTab } from './tabs/attachLicenseTab';
import { attachModelsTab } from './tabs/attachModelsTab';
import { attachVoiceTab } from './tabs/attachVoiceTab';
import { attachImageTab } from './tabs/attachImageTab';
import { attachKnowledgeTab } from './tabs/attachKnowledgeTab';
import { attachMemoryTab } from './tabs/attachMemoryTab';
import { attachAdvancedTab } from './tabs/attachAdvancedTab';

export class SettingsController {
  attach(host: SettingsHost): void {
    const panel = document.getElementById('settingsPanel');
    if (!panel) return;

    attachCommonTab(host, panel);
    attachGeneralTab(host, panel);
    attachLicenseTab(host, panel);
    attachModelsTab(host, panel);
    attachVoiceTab(host, panel);
    attachImageTab(host, panel);
    attachKnowledgeTab(host, panel);
    attachMemoryTab(host, panel);
    attachAdvancedTab(host, panel);
  }
}
