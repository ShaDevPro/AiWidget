/**
 * GeneralTab — Settings panel "general" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderGeneralTab(host: SettingsHost): string {
  const isProMode = host.settings.execution_mode === 'pro';
  const isAdmin = host.activeProfile?.role === 'admin';

  return `
            <!-- ── GÉNÉRAL ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('settings.general')}</h2>

              <div class="sp-card">
                <div class="sp-field">
                  <label class="sp-label">${t('settings.language')}</label>
                  <p class="sp-desc">Langue de l'interface et de l'assistant</p>
                  <select class="sp-select" id="langSelect">
                    <option value="fr" ${host.settings.language === 'fr' ? 'selected' : ''}>🇫🇷 Français</option>
                    <option value="en" ${host.settings.language === 'en' ? 'selected' : ''}>🇬🇧 English</option>
                    <option value="ar" ${host.settings.language === 'ar' ? 'selected' : ''}>🌐 العربية</option>
                  </select>
                </div>
              </div>

              <div class="sp-card">
                <div class="sp-field">
                  <label class="sp-label">${t('settings.theme')}</label>
                  <p class="sp-desc">Apparence visuelle de l'application</p>
                  <div class="sp-theme-grid">
                    ${['light','dark','system'].map(th => `
                      <div class="sp-theme-card ${host.settings.theme === th ? 'active' : ''}" data-set-theme="${th}">
                        <span class="sp-theme-icon">${th === 'light' ? '☀️' : th === 'dark' ? '🌙' : '🖥️'}</span>
                        <span>${th === 'light' ? 'Clair' : th === 'dark' ? 'Sombre' : 'Système'}</span>
                      </div>
                    `).join('')}
                  </div>
                </div>
              </div>

              <div class="sp-card">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <label class="sp-label">${t('settings.autostart')}</label>
                    <p class="sp-desc">${t('settings.autostartDesc')}</p>
                  </div>
                  <input type="checkbox" id="autostartToggle" ${host.isAutostartEnabled ? 'checked' : ''} style="width:20px;height:20px;cursor:pointer;accent-color:var(--accent);" />
                </div>
              </div>

              <div class="sp-card">
                <div class="sp-field">
                  ${(host.licenseModule.enterprisePolicy?.is_managed && !host.licenseModule.enterprisePolicy.allow_mode_switch) || host.activeProfile?.role !== 'admin' ? `
                    <div class="sp-row-between">
                      <div>
                        <label class="sp-label">Mode d'exécution & Édition</label>
                        <p class="sp-desc">${host.licenseModule.enterprisePolicy?.company_name ? host.escapeText(host.licenseModule.enterprisePolicy.company_name) + ' · ' : ''}${t('enterprise.policyLocked')}</p>
                      </div>
                      <span class="ob-badge-gpo">${t('enterprise.lockBadge')}</span>
                    </div>
                    <div style="margin-top:10px;padding:10px 12px;background:rgba(99,102,241,0.06);border:1px solid rgba(99,102,241,0.2);border-radius:8px;font-size:12px;color:var(--text-primary);display:flex;align-items:center;gap:8px;">
                      <span>📡</span>
                      <div>
                        <strong>${host.settings.execution_mode === 'pro' ? 'Mode Réseau Entreprise (PRO)' : 'Mode Local Autonome (LITE)'}</strong>
                        <div style="color:var(--text-secondary);font-size:11.5px;margin-top:2px;">${host.settings.execution_mode === 'pro' ? 'Serveur : ' + host.escapeText(host.settings.server_url || 'http://localhost:8080') : 'Exécution 100% locale sur votre processeur'}</div>
                      </div>
                    </div>
                  ` : `
                    <label class="sp-label">Mode d'exécution & Édition</label>
                    <p class="sp-desc">Basculez entre le moteur local (Lite) et le serveur d'entreprise (Pro)</p>
                    <div class="sp-theme-grid">
                      <div class="sp-theme-card ${host.settings.execution_mode !== 'pro' ? 'active' : ''}" data-set-edition="lite">
                        <span class="sp-theme-icon">💻</span>
                        <span>WidgetAI LITE (Local)</span>
                      </div>
                      <div class="sp-theme-card ${host.settings.execution_mode === 'pro' ? 'active' : ''}" data-set-edition="pro">
                        <span class="sp-theme-icon">🏢</span>
                        <span>WidgetAI PRO (Réseau)</span>
                      </div>
                    </div>

                    ${host.settings.execution_mode === 'pro' ? `
                      <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                        <div>
                          <label class="sp-desc" style="font-weight:600;display:block;margin-bottom:3px;">Adresse du serveur d'entreprise :</label>
                          <input type="text" class="sp-input" id="spServerUrlInput" value="${host.escapeText(host.settings.server_url || 'http://localhost:8080')}" placeholder="http://192.168.1.50:8080" style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);" />
                        </div>
                        <div>
                          <label class="sp-desc" style="font-weight:600;display:block;margin-bottom:3px;">Jeton d'authentification (Optionnel) :</label>
                          <input type="password" class="sp-input" id="spServerTokenInput" value="${host.escapeText(host.settings.server_auth_token || '')}" placeholder="Bearer token..." style="width:100%;padding:6px 10px;border-radius:8px;border:1px solid var(--border);background:var(--bg-primary);color:var(--text-primary);" />
                        </div>
                      </div>
                    ` : ''}
                  `}
              ${isProMode && isAdmin ? `
                <div class="sp-card">
                  <div class="sp-field">
                    <div class="sp-row-between">
                      <div>
                        <label class="sp-label">Statut de Licence & Activation</label>
                        <p class="sp-desc">${host.licenseModule.licenseStatus?.is_licensed ? (host.licenseModule.licenseStatus.tier === 'pro' ? '👑 Licence PRO à Vie (500$)' : '💎 Licence LITE à Vie (50$)') : '🔒 Version Gratuite (Découverte)'}</p>
                      </div>
                      <span class="ob-badge-gpo" style="${host.licenseModule.licenseStatus?.is_licensed ? 'background:rgba(16,185,129,0.15);color:#10b981;' : 'background:rgba(245,158,11,0.15);color:#f59e0b;'}">
                        ${host.licenseModule.licenseStatus?.is_licensed ? '✓ Active' : 'Découverte'}
                      </span>
                    </div>
                    <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:var(--bg-primary);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
                      <div>
                        <div style="font-size:11px;color:var(--text-secondary);font-weight:600;">ID Machine (HWID) :</div>
                        <div style="font-family:monospace;font-size:13px;font-weight:700;color:var(--accent);">${host.licenseModule.licenseStatus?.hwid || 'Chargement...'}</div>
                      </div>
                      <button class="sp-save-btn" id="spOpenLicenseBtn" type="button" style="padding:6px 14px;font-size:12px;cursor:pointer;width:auto;margin:0;">
                        ${host.licenseModule.licenseStatus?.is_licensed ? '🔑 Gérer la Licence' : '💎 Activer une Licence'}
                      </button>
                    </div>
                  </div>
                </div>
              ` : ''}

              <div class="sp-card">
                <div class="sp-field">
                  <div class="sp-row-between">
                    <div>
                      <label class="sp-label">${t('updater.title')}</label>
                      <p class="sp-desc">${t('updater.desc')} · <strong style="color:var(--accent);">v1.0.1</strong></p>
                    </div>
                    <button class="sp-btn-secondary" id="checkUpdateBtn" type="button">
                      ${icons.refresh} ${t('updater.checkBtn')}
                    </button>
                  </div>
                  <div id="updateCheckStatus" style="display:none;margin-top:8px;font-size:11.5px;color:var(--text-secondary);"></div>
                </div>
              </div>

              <div class="sp-card">
                <div class="sp-field">
                  <div class="sp-row-between">
                    <div>
                      <label class="sp-label">Guide de démarrage</label>
                      <p class="sp-desc">Relancer l'assistant de configuration</p>
                    </div>
                    <button class="sp-btn-secondary" id="reopenOnboardingBtn">${icons.refresh} Relancer</button>
                  </div>
                </div>
              </div>
            </div>
  `;
}
