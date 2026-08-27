/**
 * ModelsTab — Settings panel "models" tab.
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import { formatDownloadSize } from '../../../ui/ModelDownloadProgress';
import { RECOMMENDED_MODELS } from '../../../constants/recommendedModels';
import { getSafeId } from '../../../utils/dom';
import type { SettingsHost } from '../SettingsHost';
import type { PartialGGUFDownload } from '../../../types';

export function renderModelsTab(host: SettingsHost): string {
  const installedNames = new Set(host.models.map((m) => m.name.toLowerCase()));
  const partialMap = new Map<string, PartialGGUFDownload>(
    host.modelsModule.partialDownloads.map((p) => [p.model_id.toLowerCase(), p]),
  );
  const pulling = host.modelsModule.currentlyPullingModel;

  return `
            <!-- ── MODÈLES ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('settings.llm')}</h2>

              <div id="modelDownloadBanner" class="mdl-dl-banner ${pulling ? 'visible' : ''}"></div>

              <div class="sp-status-row ${host.isConnected ? 'connected' : 'disconnected'}">
                <span class="sp-status-dot"></span>
                <span>${host.isConnected ? t('settings.engineConnected') : t('settings.engineDisconnected')}</span>
                <button class="sp-btn-ghost" id="testConnBtn">${icons.refresh} ${t('settings.testConnection')}</button>
              </div>

              ${host.models.length > 0 ? `
                <h3 class="sp-subtitle">${t('settings.installedModelsTitle')}</h3>
                <div class="sp-models-list">
                  ${host.models.map(m => `
                    <div class="sp-model-row ${host.settings.default_model === m.name ? 'active' : ''}" data-set-model="${m.name}">
                      <span class="sp-model-dot"></span>
                      <div class="sp-model-info">
                        <span class="sp-model-name">${m.name}</span>
                        ${host.settings.default_model === m.name ? `<span class="sp-model-badge">${t('settings.activeModel')}</span>` : ''}
                      </div>
                      <button class="sp-btn-ghost sp-model-select-btn" data-set-model="${m.name}">${t('settings.useModel')}</button>
                      <button type="button" class="sp-btn-ghost sp-model-delete-btn" data-delete-model="${m.name}" title="${t('common.delete')}" style="color:#ef4444;padding:4px 8px;margin-left:4px;">${icons.trash}</button>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <h3 class="sp-subtitle" style="margin-top:16px;">${t('settings.catalogTitle')}</h3>
              <div class="sp-catalog-grid" id="curatedCatalog">
                ${RECOMMENDED_MODELS.map(m => {
                  const isInstalled = installedNames.has(m.name.toLowerCase());
                  const partial = partialMap.get(m.name.toLowerCase());
                  const isPulling = pulling === m.name;
                  const lang = host.settings.language || 'fr';
                  const desc = lang === 'fr' ? m.descFr : lang === 'ar' ? m.descAr : m.descEn;
                  const safeId = getSafeId(m.name);
                  const btnLabel = partial && !isInstalled
                    ? t('gguf.resumeDownload')
                    : t('settings.download');
                  return `
                    <div class="sp-catalog-card ${isInstalled ? 'installed' : ''} ${partial ? 'partial' : ''} ${isPulling ? 'pulling' : ''}">
                      <div class="sp-catalog-top">
                        <span class="sp-catalog-name">${m.name}</span>
                        ${partial && !isInstalled
                          ? `<span class="sp-catalog-partial">${t('gguf.partialDownloadHint', { pct: partial.percentage })}</span>`
                          : m.tag === '★'
                            ? '<span class="sp-catalog-rec">⭐</span>'
                            : `<span class="sp-catalog-tag">${m.tag}</span>`}
                      </div>
                      <div class="sp-catalog-meta">${m.size} · ${m.ram}${partial && !isInstalled ? ` · ${formatDownloadSize(partial.partial_bytes)} / ${formatDownloadSize(partial.total_bytes)}` : ''}</div>
                      <p class="sp-catalog-desc">${desc}</p>
                      <div class="sp-catalog-progress-slot" id="card-progress-${safeId}"></div>
                      ${isInstalled
                        ? `
                          <div class="sp-catalog-actions">
                            <span class="sp-btn-installed">✅ ${t('settings.installed')}</span>
                            <button type="button" class="sp-catalog-delete-btn" data-delete-model="${m.name}" title="${t('common.delete')}">
                              ${icons.trash} ${t('common.delete')}
                            </button>
                          </div>
                        `
                        : partial
                          ? `
                            <div class="sp-catalog-actions">
                              <button type="button" class="sp-catalog-install-btn" data-pull-name="${m.name}" style="flex:1;">
                                ${icons.download} ${btnLabel}
                              </button>
                              <button type="button" class="sp-catalog-delete-btn" data-delete-model="${m.name}" title="${t('common.delete')}">
                                ${icons.trash}
                              </button>
                            </div>
                          `
                          : `<button type="button" class="sp-catalog-install-btn" data-pull-name="${m.name}">${icons.download} ${btnLabel}</button>`
                      }
                    </div>
                  `;
                }).join('')}
              </div>

              <div id="pullProgress" class="mdl-dl-footer-progress"></div>
            </div>
  `;
}
