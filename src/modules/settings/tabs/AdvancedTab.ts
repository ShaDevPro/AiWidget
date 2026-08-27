/**
 * AdvancedTab — Settings panel "advanced" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderAdvancedTab(host: SettingsHost): string {
  return `
            <!-- ── AVANCÉ ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('settings.parameters')}</h2>

              <div class="sp-card">
                <label class="sp-label">URL Ollama</label>
                <p class="sp-desc">Serveur Ollama local (laissez par défaut si vous n'êtes pas expert)</p>
                <div class="sp-row-gap">
                  <input type="text" id="ollamaUrl" class="sp-input" value="${host.settings.ollama_base_url}" style="flex:1" />
                  <button class="sp-btn-secondary" id="testConnBtn">${icons.refresh} Tester</button>
                </div>
              </div>

              <div class="sp-card">
                <label class="sp-label">Température <span class="sp-val-badge" id="tempValue">${host.settings.temperature.toFixed(2)}</span></label>
                <p class="sp-desc">Créativité des réponses (0 = précis, 1 = créatif)</p>
                <input type="range" id="tempSlider" class="sp-range" min="0" max="1" step="0.01" value="${host.settings.temperature}" />
              </div>

              <div class="sp-card">
                <label class="sp-label">Tokens maximum <span class="sp-val-badge" id="tokenValue">${host.settings.max_tokens}</span></label>
                <p class="sp-desc">Longueur maximale des réponses</p>
                <input type="range" id="tokenSlider" class="sp-range" min="256" max="8192" step="128" value="${host.settings.max_tokens}" />
              </div>

              <div class="sp-card">
                <label class="sp-label">Autorisation Recherche Web</label>
                <p class="sp-desc">Réinitialise le consentement mémorisé pour faire réapparaître la pop-up de confirmation</p>
                <button class="sp-btn-secondary" id="resetWebAuthBtn" style="margin-top:6px;">🔄 Réinitialiser le consentement Web</button>
              </div>
            </div>
  `;
}
