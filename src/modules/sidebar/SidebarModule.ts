/**
 * SidebarModule — Modern, robust conversation list management.
 */
import { api } from '../../api';
import { t } from '../../i18n';
import { icons } from '../../ui/icons';
import { getDateGroupKey, formatDate } from '../../utils';
import type { Conversation, LLMModel } from '../../types';

export class SidebarModule {
  conversations: Conversation[] = [];
  currentConversation: Conversation | null = null;
  searchQuery = '';

  // Callbacks
  onConversationChange?: (conv: Conversation | null) => void;
  onToast?: (msg: string, type: 'info' | 'error' | 'success') => void;

  async loadConversations(): Promise<void> {
    try {
      this.conversations = await api.getConversations();
    } catch {
      this.conversations = [];
    }
  }


  async newConversation(defaultModel: string, models: LLMModel[]): Promise<Conversation | null> {
    const model = defaultModel || models[0]?.name || 'qwen2.5:1.5b';
    try {
      const conv = await api.createConversation(t('sidebar.newChat'), model);
      this.conversations.unshift(conv);
      this.currentConversation = conv;
      this.onConversationChange?.(conv);
      return conv;
    } catch {
      return null;
    }
  }

  async openConversation(id: string): Promise<Conversation | null> {
    const conv = this.conversations.find((c) => c.id === id);
    if (!conv) return null;
    this.currentConversation = conv;
    this.onConversationChange?.(conv);
    return conv;
  }


  async deleteConversation(id: string): Promise<void> {
    try {
      await api.deleteConversation(id);
      this.conversations = this.conversations.filter((c) => c.id !== id);
      if (this.currentConversation?.id === id) {
        this.currentConversation = this.conversations[0] || null;
        this.onConversationChange?.(this.currentConversation);
      }
      this.onToast?.('Discussion supprimée', 'info');
    } catch (err) {
      this.onToast?.(t('common.error') + ': ' + (err as Error).message, 'error');
    }
  }

  async pinConversation(id: string): Promise<void> {
    try {
      await api.toggleConversationPin(id);
      await this.loadConversations();
    } catch (err) {
      this.onToast?.((err as Error).message, 'error');
    }
  }


  renderList(onEscapeText: (text: string) => string): string {
    const filtered = this.conversations.filter((c) =>
      c.title.toLowerCase().includes(this.searchQuery.toLowerCase()),
    );

    if (filtered.length === 0) {
      return `<div class="empty-conv">${t('sidebar.noConversations')}</div>`;
    }

    const pinned = filtered.filter((c) => c.is_pinned);
    const unpinned = filtered.filter((c) => !c.is_pinned);

    let html = '';


    // 1. PINNED CONVERSATIONS
    if (pinned.length > 0) {
      html += `<div class="conv-group-label pinned-group-label"><span style="font-size:12px;">📈</span> <span>${t('sidebar.pinned') || 'Épinglés'}</span></div>`;
      for (const conv of pinned) {
        const active = this.currentConversation && this.currentConversation.id === conv.id;
        html += `
          <div class="conv-item ${active ? 'active' : ''} is-pinned" data-conv-id="${conv.id}">
            <div class="conv-item-icon pinned-icon"><span style="font-size:12px;">📏</span></div>
            <div class="conv-item-body">
              <div class="conv-item-title">${onEscapeText(conv.title)}</div>
              <div class="conv-item-meta">${formatDate(conv.updated_at)} · ${onEscapeText(conv.model.split(':')[0])}</div>
            </div>
            <div class="conv-actions-group">
              <button class="conv-item-pin pinned" data-pin-id="${conv.id}" title="Détacher">${icons.pin}</button>
              <button class="conv-item-delete" data-delete-id="${conv.id}" title="${t('common.delete')}">${icons.trash}</button>
            </div>
          </div>
        `;
      }
    }

    // 2. UNPINNED CONVERSATIONS BY DATE
    const groups: Record<string, Conversation[]> = { today: [], yesterday: [], '7d': [], older: [] };
    unpinned.forEach((c) => groups[getDateGroupKey(c.updated_at||c.created_at)].push(c));

    const labels: Record<string, string> = {
      today: t('sidebar.today'),
      yesterday: t('sidebar.yesterday'),
      '7d': t('sidebar.previous7Days'),
      older: t('sidebar.older'),
    };

    for (const key of ['today', 'yesterday', '7d', 'older']) {
      const items = groups[key];
      if (items.length === 0) continue;
      html += `<div class="conv-group-label">${labels[key]}</div>`;
      for (const conv of items) {
        const active = this.currentConversation && this.currentConversation.id === conv.id;
        html += `
          <div class="conv-item ${active ? 'active' : ''}" data-conv-id="${conv.id}">
            <div class="conv-item-icon">${icons.chat}</div>
            <div class="conv-item-body">
              <div class="conv-item-title">${onEscapeText(conv.title)}</div>
              <div class="conv-item-meta">${formatDate(conv.updated_at)} · ${onEscapeText(conv.model.split(':')[0])}</div>
            </div>
            <div class="conv-actions-group">
              <button class="conv-item-pin" data-pin-id="${conv.id}" title="Épingler">${icons.pin}</button>
              <button class="conv-item-delete" data-delete-id="${conv.id}" title="${t('common.delete')}">${icons.trash}</button>
            </div>
          </div>
        `;
      }
    }

    return html;
  }
}
