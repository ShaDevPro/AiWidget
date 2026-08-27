/**
 * LicenseTab — Settings panel "license" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderLicenseTab(host: SettingsHost): string {
  return `
            <!-- ── LICENCE & DÉBLOCAGE ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('license.title')}</h2>
              <p class="sp-desc">${host.licenseModule.licenseStatus?.is_licensed ? (host.licenseModule.licenseStatus.tier === 'pro' ? t('license.subtitlePro') : t('license.subtitleLite')) : t('license.subtitleLite')}</p>

              <!-- Status Card -->
              <div class="sp-card" style="${host.licenseModule.licenseStatus?.is_pro_unlocked ? 'border-color: rgba(16, 185, 129, 0.4); background: linear-gradient(135deg, rgba(16, 185, 129, 0.05), transparent);' : 'border-color: rgba(99, 102, 241, 0.3); background: rgba(99, 102, 241, 0.03);'}">
                <div class="sp-row-between">
                  <div>
                    <label class="sp-label">Édition Active</label>
                    <p class="sp-desc" style="font-weight:600; font-size:12.5px; color: ${host.licenseModule.licenseStatus?.is_pro_unlocked ? '#10b981' : 'var(--accent)'};">
                      ${host.licenseModule.licenseStatus?.is_pro_unlocked
                        ? '👑 Licence PRO Entreprise (Serveur Réseau & RAG Partagé Actif)'
                        : '⚡ Édition Standard Gratuite (Illimitée en Local : Chat, OCR, RAG, Voix)'}
                    </p>
                  </div>
                  <span class="ob-badge-gpo" style="${host.licenseModule.licenseStatus?.is_pro_unlocked ? 'background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;' : 'background:rgba(99,102,241,0.15);color:var(--accent);font-weight:700;'}">
                    ${host.licenseModule.licenseStatus?.is_pro_unlocked ? '✓ PRO ENTREPRISE' : '⚡ GRATUIT ILLIMITÉ'}
                  </span>
                </div>
                ${host.licenseModule.licenseStatus?.is_pro_unlocked ? `
                  <div style="margin-top:10px;padding-top:10px;border-top:1px solid var(--border);display:flex;flex-direction:column;gap:4px;font-size:11.5px;color:var(--text-secondary);">
                    <div>🔑 Clé scellée : <span style="font-family:monospace;font-weight:600;color:var(--text-primary);">${host.licenseModule.licenseStatus.license_key || 'Enregistrée'}</span></div>
                    ${host.licenseModule.licenseStatus.activated_at ? `<div>📅 Date d'activation : <span style="font-weight:600;color:var(--text-primary);">${host.licenseModule.licenseStatus.activated_at}</span></div>` : ''}
                    ${host.licenseModule.licenseStatus.company ? `<div>🏢 Entreprise : <span style="font-weight:600;color:var(--text-primary);">${host.licenseModule.licenseStatus.company}</span></div>` : ''}
                  </div>
                ` : ''}
              </div>

              <!-- HWID Card -->
              <div class="sp-card">
                <label class="sp-label">${t('license.hwidLabel')}</label>
                <p class="sp-desc">${t('license.hwidDesc')}</p>
                <div style="margin-top:8px;display:flex;align-items:center;justify-content:space-between;background:var(--bg-primary);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
                  <div style="font-family:monospace;font-size:13.5px;font-weight:700;color:var(--accent);">${host.licenseModule.licenseStatus?.hwid || 'Chargement...'}</div>
                  <button class="sp-btn-secondary" id="spCopyHwidTabBtn" type="button">
                    ${icons.copy} ${t('license.copyHwid')}
                  </button>
                </div>
              </div>

              ${!host.licenseModule.licenseStatus?.is_pro_unlocked ? `
                <!-- WhatsApp Direct Request Card -->
                <div class="sp-card">
                  <label class="sp-label">👑 Passer à la Licence PRO Entreprise</label>
                  <p class="sp-desc">Débloquez le serveur IA centralisé, le RAG d'entreprise partagé et la gestion multi-postes pour toute votre équipe.</p>
                  <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:10px;">
                    <a href="${host.getWhatsAppLicenseUrl('pro')}" target="_blank" class="sp-btn-primary" style="background:#25d366;border-color:#25d366;color:#fff;text-decoration:none;display:inline-flex;align-items:center;gap:8px;padding:8px 14px;">
                      <span>💬</span>
                      <span>Commander Licence PRO Entreprise (WhatsApp)</span>
                    </a>
                  </div>
                </div>
              ` : ''}

              <!-- Direct Key Activation Card -->
              <div class="sp-card">
                <label class="sp-label">${host.licenseModule.licenseStatus?.is_licensed ? 'Changer de Clé de Licence' : t('license.keyLabel')}</label>
                <p class="sp-desc">${t('license.keyPlaceholder')}</p>
                <div class="sp-row-gap" style="margin-top:8px;display:flex;gap:8px;">
                  <input type="text" id="spDirectKeyInput" class="sp-input" placeholder="Ex: WAI-PRO-XXXX-XXXX-XXXX-XXXX-..." style="flex:1;font-family:monospace;text-transform:uppercase;" />
                  <button class="sp-btn-primary" id="spDirectActivateBtn" type="button">${icons.check} ${host.licenseModule.licenseStatus?.is_licensed ? 'Mettre à jour' : t('license.activateBtn')}</button>
                </div>
              </div>

              <!-- Authenticité & Intégrité Card -->
              <div class="sp-card" style="border-left: 3px solid #10b981;">
                <div class="sp-row-between">
                  <div>
                    <label class="sp-label">Authenticité & Protection Logicielle</label>
                    <p class="sp-desc" id="spIntegrityText">Certification officielle ShaDevPro · Binaire scellé</p>
                  </div>
                  <span class="ob-badge-gpo" id="spIntegrityBadge" style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:700;">
                    🛡️ ORIGINAL CERTIFIÉ
                  </span>
                </div>
              </div>
            </div>
  `;
}
