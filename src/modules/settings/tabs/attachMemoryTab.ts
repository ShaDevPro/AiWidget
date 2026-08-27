/**
 * attachMemoryTab — Event handlers for the memory settings tab.
 */
import { api } from '../../../api';
import { t } from '../../../i18n';
import type { SettingsHost } from '../SettingsHost';

export function attachMemoryTab(host: SettingsHost, panel: HTMLElement): void {
  panel.querySelector('#saveMemoryBtn')?.addEventListener('click', async () => {
    const keyInput = panel.querySelector('#newMemoryKey') as HTMLInputElement;
    const valInput = panel.querySelector('#newMemoryVal') as HTMLInputElement;
    const key = keyInput?.value.trim();
    const val = valInput?.value.trim();
    if (!key || !val) return;
    try {
      await api.saveUserMemory('custom', key, val);
      await host.refreshUserMemories();
      host.render();
      host.toggleSettings(true);
      host.toast(t('memory.saved'), 'success');
    } catch (err) {
      host.toast((err as Error).message || String(err), 'error');
    }
  });

  panel.querySelectorAll('[data-del-memory-id]').forEach((btn) => {
    btn.addEventListener('click', async (e) => {
      e.stopPropagation();
      const id = (btn as HTMLElement).getAttribute('data-del-memory-id')!;
      try {
        await api.deleteUserMemory(id);
        await host.refreshUserMemories();
        host.render();
        host.toggleSettings(true);
        host.toast('Souvenir supprimé', 'info');
      } catch (err) {
        host.toast((err as Error).message || String(err), 'error');
      }
    });
  });

  panel.querySelector('#clearAllMemoriesBtn')?.addEventListener('click', async () => {
    try {
      await api.clearUserMemories();
      await host.refreshUserMemories();
      host.render();
      host.toggleSettings(true);
      host.toast('Mémoire effacée', 'info');
    } catch (err) {
      host.toast((err as Error).message || String(err), 'error');
    }
  });
}
