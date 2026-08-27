/**
 * attachModelsTab — Event handlers for the models settings tab.
 */
import { api } from '../../../api';
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachModelsTab(host: SettingsHost, panel: HTMLElement): void {
  const testConnAction = async () => {
    const urlInput = panel.querySelector('#ollamaUrl') as HTMLInputElement;
    if (urlInput) {
      host.settings.ollama_base_url = urlInput.value.trim();
    }
    await host.refreshConnection();
    await host.refreshModels();
    host.render();
    host.toggleSettings(true);
    if (host.isConnected) {
      host.toast(t('settings.connected'), 'success');
    } else {
      host.toast(t('settings.notConnected'), 'error');
    }
  };

  panel.querySelector('#testConnBtn')?.addEventListener('click', () => void testConnAction());
  panel.querySelector('#quickRetryConnBtn')?.addEventListener('click', () => void testConnAction());

  // Handle setting active model (ignoring clicks on delete buttons)
  panel.querySelectorAll('[data-set-model]').forEach((el) => {
    el.addEventListener('click', async (e) => {
      if ((e.target as HTMLElement).closest('[data-delete-model]')) return;
      const name = (el as HTMLElement).getAttribute('data-set-model')!;
      host.settings.default_model = name;
      if (host.sidebarModule.currentConversation) {
        host.sidebarModule.currentConversation.model = name;
      }
      try { await api.saveSettings(host.settings); } catch { /* ignore */ }
      host.updateTitles();
      host.toggleSettings(true);
    });
  });

  // Universal delete model handler for cards & rows
  panel.addEventListener('click', async (e) => {
    const deleteBtn = (e.target as HTMLElement).closest('[data-delete-model]') as HTMLElement;
    if (deleteBtn) {
      e.stopPropagation();
      e.preventDefault();
      const modelName = deleteBtn.getAttribute('data-delete-model');
      if (!modelName) return;

      const confirmText = t('gguf.deleteConfirm') || `Supprimer le modèle ${modelName} ?`;
      host.showConfirm(confirmText, async () => {
        try {
          await api.deleteGGUFModel(modelName);
          host.toast(`${t('common.delete')} : ${modelName}`, 'success');
          if (host.settings.default_model?.toLowerCase() === modelName.toLowerCase()) {
            host.settings.default_model = '';
            try { await api.saveSettings(host.settings); } catch { /* ignore */ }
          }
          await host.refreshModels();
          host.render();
          host.toggleSettings(true);
        } catch (err) {
          host.toast(String(err), 'error');
        }
      });
      return;
    }

    const pullBtn = (e.target as HTMLElement).closest('[data-pull-name]') as HTMLElement;
    if (pullBtn && !pullBtn.hasAttribute('disabled')) {
      e.stopPropagation();
      const modelName = pullBtn.getAttribute('data-pull-name');
      if (modelName) {
        await host.pullModel(modelName);
      }
    }
  });

  panel.querySelector('#customPullToggle')?.addEventListener('click', () => {
    host.modelsModule.showCustomPull = !host.modelsModule.showCustomPull;
    const section = panel.querySelector('#customPullSection') as HTMLElement;
    if (section) {
      section.style.display = host.modelsModule.showCustomPull ? 'flex' : 'none';
    }
  });

  panel.querySelector('#pullBtn')?.addEventListener('click', async () => {
    const input = panel.querySelector('#pullModelInput') as HTMLInputElement;
    const model = input.value.trim();
    if (!model) return;
    await host.pullModel(model);
  });
}
