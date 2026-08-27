/**
 * MemoryTab — Settings panel "memory" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderMemoryTab(host: SettingsHost): string {
  return `
            <!-- ── MÉMOIRE ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('memory.title')}</h2>
              <p class="sp-desc">${t('memory.subtitle')}</p>

              <div class="sp-memory-list">
                ${host.userMemories.length === 0
                  ? `<div class="sp-empty">${icons.user} <span>${t('memory.noMemories')}</span></div>`
                  : host.userMemories.map(m => `
                    <div class="sp-memory-row">
                      <div class="sp-memory-info">
                        <div class="sp-memory-key">${m.key}</div>
                        <div class="sp-memory-val">${m.content}</div>
                      </div>
                      <button class="sp-btn-danger" data-del-memory-id="${m.id}">${icons.trash}</button>
                    </div>
                  `).join('')
                }
              </div>

              <div class="sp-card" style="margin-top:12px">
                <div class="sp-field-row">
                  <input type="text" id="newMemoryKey" class="sp-input" placeholder="${t('memory.keyPlaceholder')}" style="flex:1" />
                  <input type="text" id="newMemoryVal" class="sp-input" placeholder="${t('memory.contentPlaceholder')}" style="flex:2" />
                  <button class="sp-btn-primary" id="saveMemoryBtn">${icons.plus}</button>
                </div>
              </div>
              ${host.userMemories.length > 0 ? `<button class="sp-btn-danger-outline" id="clearAllMemoriesBtn" style="margin-top:8px">${icons.trash} ${t('memory.clearAll')}</button>` : ''}
            </div>
  `;
}
