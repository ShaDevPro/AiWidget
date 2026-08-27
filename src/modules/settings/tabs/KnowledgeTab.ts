/**
 * KnowledgeTab — Settings panel "knowledge" tab (RAG).
 */
import { t } from '../../../i18n';
import { icons } from '../../../ui/icons';
import type { SettingsHost } from '../SettingsHost';

export function renderKnowledgeTab(host: SettingsHost): string {
  return `
            <!-- ── SAVOIR & VECTOR DB (RAG) ── -->
            <div class="sp-section">
              <h2 class="sp-section-title">${t('rag.title')}</h2>
              <p class="sp-desc">${t('rag.subtitle')}</p>

              <!-- Vector DB Status Card -->
              <div class="sp-card" style="border-color: rgba(99, 102, 241, 0.3); background: linear-gradient(135deg, rgba(99, 102, 241, 0.04), transparent);">
                <div class="sp-row-between">
                  <div>
                    <label class="sp-label">🧠 ${t('vectorDb.title')}</label>
                    <p class="sp-desc">${t('vectorDb.dimensions')}</p>
                  </div>
                  <span class="ob-badge-gpo" style="background:rgba(99,102,241,0.15);color:var(--accent);font-weight:700;">
                    ⚡ ${t('vectorDb.status')}
                  </span>
                </div>
                <div style="margin-top:10px;display:flex;align-items:center;justify-content:space-between;background:var(--bg-primary);padding:10px 12px;border-radius:8px;border:1px solid var(--border);">
                  <div style="font-size:12px;color:var(--text-secondary);">
                    📊 <strong>${host.vectorDbStats?.total_chunks || 0}</strong> extraits vectorisés · 💾 ${(Number(host.vectorDbStats?.memory_bytes || 0) / 1024).toFixed(0)} Ko
                  </div>
                  <button class="sp-btn-secondary" id="reindexVectorsBtn" type="button" style="padding:5px 12px;font-size:11.5px;">
                    🔄 ${t('vectorDb.reindexBtn')}
                  </button>
                </div>
              </div>

              <!-- Semantic Search Interactive Tester -->
              <div class="sp-card">
                <label class="sp-label">🔍 ${t('vectorDb.semanticSearch')}</label>
                <p class="sp-desc">${t('vectorDb.searchPlaceholder')}</p>
                <div style="margin-top:8px;display:flex;gap:8px;">
                  <input type="text" id="semanticSearchInput" class="sp-input" placeholder="${t('vectorDb.searchPlaceholder')}" value="${host.escapeText(host.semanticSearchQuery)}" style="flex:1;" />
                  <button class="sp-btn-primary" id="testSemanticSearchBtn" type="button">Tester</button>
                </div>

                ${host.semanticTestResults.length > 0 ? `
                  <div style="margin-top:12px;display:flex;flex-direction:column;gap:8px;">
                    ${host.semanticTestResults.map((r) => `
                      <div style="background:var(--bg-primary);border:1px solid var(--border);border-left:3px solid var(--accent);border-radius:6px;padding:8px 10px;font-size:12px;">
                        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px;">
                          <strong>📄 ${host.escapeText(r.document_name)} (Extrait #${r.chunk_index})</strong>
                          <span style="background:rgba(16,185,129,0.15);color:#10b981;font-weight:bold;padding:2px 6px;border-radius:4px;font-size:11px;">
                            ✓ ${r.similarity_pct}% pertinence
                          </span>
                        </div>
                        <div style="color:var(--text-secondary);font-size:11.5px;line-height:1.4;">${host.escapeText(r.content)}</div>
                      </div>
                    `).join('')}
                  </div>
                ` : host.semanticSearchQuery ? `
                  <div style="margin-top:10px;font-size:12px;color:var(--text-tertiary);text-align:center;">${t('vectorDb.noMatch')}</div>
                ` : ''}
              </div>

              <h3 class="sp-subtitle" style="margin-top:16px;">Documents Indexés (${host.ragDocuments.length})</h3>
              <div class="sp-rag-list">
                ${host.ragDocuments.length === 0
                  ? `<div class="sp-empty">${icons.book} <span>${t('rag.noDocs')}</span></div>`
                  : host.ragDocuments.map(d => `
                    <div class="sp-rag-row">
                      <span class="sp-rag-icon">📄</span>
                      <div class="sp-rag-info">
                        <div class="sp-rag-name">${d.filename}</div>
                        <div class="sp-rag-meta">${d.file_type.toUpperCase()} · ${d.chunk_count} chunks · ${d.size_bytes > 1024*1024 ? (d.size_bytes/1048576).toFixed(1)+' MB' : (d.size_bytes/1024).toFixed(0)+' KB'}</div>
                      </div>
                      <button class="sp-btn-danger" data-del-rag-id="${d.id}">${icons.trash}</button>
                    </div>
                  `).join('')
                }
              </div>
              <button class="sp-btn-primary" id="addRagDocBtn" style="margin-top:12px">${icons.paperclip} ${t('rag.addDocBtn')}</button>
            </div>
  `;
}
