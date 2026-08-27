/**
 * attachKnowledgeTab — Event handlers for the knowledge (RAG) settings tab.
 */
import { api } from '../../../api';
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachKnowledgeTab(host: SettingsHost, panel: HTMLElement): void {
  panel.querySelector('#reindexVectorsBtn')?.addEventListener('click', async () => {
    try {
      host.toast(t('vectorDb.reindexing'), 'info');
      const count = await api.reindexRAGVectors();
      host.vectorDbStats = await api.getVectorDBStats();
      host.render();
      host.toggleSettings(true);
      host.toast(t('vectorDb.reindexSuccess', { count: String(count) }), 'success');
    } catch (err) {
      host.toast(String(err), 'error');
    }
  });

  const runSemanticSearch = async () => {
    const input = panel.querySelector('#semanticSearchInput') as HTMLInputElement;
    const query = input ? input.value.trim() : '';
    host.semanticSearchQuery = query;
    if (!query) {
      host.semanticTestResults = [];
      host.render();
      host.toggleSettings(true);
      return;
    }
    try {
      host.semanticTestResults = await api.searchRAGSemantic(query, 4, 0.1);
      host.render();
      host.toggleSettings(true);
    } catch (err) {
      host.toast(String(err), 'error');
    }
  };

  panel.querySelector('#testSemanticSearchBtn')?.addEventListener('click', () => void runSemanticSearch());
  panel.querySelector('#semanticSearchInput')?.addEventListener('keydown', (e) => {
    if ((e as KeyboardEvent).key === 'Enter') {
      void runSemanticSearch();
    }
  });

  panel.querySelector('#addRagDocBtn')?.addEventListener('click', async () => {
    await host.handlePickAndIndexFile();
    try {
      host.vectorDbStats = await api.getVectorDBStats();
    } catch { /* ignore */ }
    host.render();
    host.toggleSettings(true);
  });

  panel.querySelectorAll('[data-del-rag-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-del-rag-id')!;
      try {
        await api.deleteRAGDocument(id);
        await host.refreshRAGDocuments();
        host.vectorDbStats = await api.getVectorDBStats();
        host.render();
        host.toggleSettings(true);
        host.toast('Document supprimé', 'info');
      } catch (err) {
        host.toast((err as Error).message || String(err), 'error');
      }
    });
  });
}
