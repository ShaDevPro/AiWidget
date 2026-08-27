/**
 * TipsModule — Guide des Astuces & Meilleures Pratiques pour AI Widget.
 * Architecture modulaire / i18n FR/EN/AR / Thème clair & sombre / RTL.
 */

import { t, isRTL } from '../../i18n';
import { escapeText } from '../../utils/dom';

interface TipCardDef {
  icon: string;
  titleKey: string;
  descKey: string;
  promptKey: string;
}

export class TipsModule {
  private overlay: HTMLElement | null = null;

  private tips: TipCardDef[] = [
    {
      icon: '📚',
      titleKey: 'tips.catCoursesTitle',
      descKey: 'tips.catCoursesDesc',
      promptKey: 'tips.catCoursesPrompt',
    },
    {
      icon: '📊',
      titleKey: 'tips.catDocsTitle',
      descKey: 'tips.catDocsDesc',
      promptKey: 'tips.catDocsPrompt',
    },
    {
      icon: '✉️',
      titleKey: 'tips.catMailTitle',
      descKey: 'tips.catMailDesc',
      promptKey: 'tips.catMailPrompt',
    },
    {
      icon: '🌐',
      titleKey: 'tips.catWebTitle',
      descKey: 'tips.catWebDesc',
      promptKey: 'tips.catWebPrompt',
    },
    {
      icon: '🎙️',
      titleKey: 'tips.catVoiceTitle',
      descKey: 'tips.catVoiceDesc',
      promptKey: 'tips.catVoicePrompt',
    },
    {
      icon: '📐',
      titleKey: 'tips.catMathTitle',
      descKey: 'tips.catMathDesc',
      promptKey: 'tips.catMathPrompt',
    },
  ];

  open(): void {
    if (this.overlay) return;
    this.overlay = document.createElement('div');
    this.overlay.className = 'tips-overlay';
    this.overlay.addEventListener('click', (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
    this.render();
    requestAnimationFrame(() => this.overlay?.classList.add('tips-overlay-visible'));
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove('tips-overlay-visible');
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
    }, 220);
  }

  private render(): void {
    if (!this.overlay) return;

    const rtlClass = isRTL() ? 'rtl' : '';

    const cardsHtml = this.tips
      .map((tip, idx) => {
        const title = t(tip.titleKey);
        const desc = t(tip.descKey);
        const prompt = t(tip.promptKey);
        const encodedPrompt = encodeURIComponent(prompt);

        return `
          <div class="tip-card" data-tip-idx="${idx}">
            <div class="tip-card-header">
              <div class="tip-card-title-wrap">
                <span class="tip-card-icon">${tip.icon}</span>
                <h3 class="tip-card-title">${escapeText(title)}</h3>
              </div>
            </div>
            <p class="tip-card-desc">${escapeText(desc)}</p>
            <div class="tip-prompt-box">
              <div class="tip-prompt-label">💡 ${t('tips.examplePrompt', { defaultValue: 'Exemple de prompt optimal :' })}</div>
              <div class="tip-prompt-text">${escapeText(prompt)}</div>
              <div class="tip-prompt-actions">
                <button class="tip-btn tip-copy-btn" data-copy-prompt="${encodedPrompt}" title="${t('tips.copyPrompt')}">
                  <span>📋</span> ${t('tips.copyPrompt')}
                </button>
                <button class="tip-btn primary tip-insert-btn" data-insert-prompt="${encodedPrompt}" title="${t('tips.insertPrompt')}">
                  <span>✍️</span> ${t('tips.insertPrompt')}
                </button>
              </div>
            </div>
          </div>
        `;
      })
      .join('');

    this.overlay.innerHTML = `
      <div class="tips-page ${rtlClass}">
        <div class="tips-header">
          <div class="tips-header-left">
            <span class="tips-header-icon">💡</span>
            <div>
              <h2 class="tips-header-title">${t('tips.modalTitle')}</h2>
              <p class="tips-header-sub">${t('tips.modalSubtitle')}</p>
            </div>
          </div>
          <button class="tips-close-btn" id="tipsCloseBtn">✕</button>
        </div>

        <div class="tips-body">
          <div class="tips-grid">
            ${cardsHtml}
          </div>
        </div>
      </div>
    `;

    // Attach click events
    this.overlay.querySelector('#tipsCloseBtn')?.addEventListener('click', () => this.close());

    // Copy prompt handlers
    this.overlay.querySelectorAll<HTMLButtonElement>('.tip-copy-btn').forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        e.stopPropagation();
        const encoded = btn.getAttribute('data-copy-prompt') || '';
        const text = decodeURIComponent(encoded);
        try {
          await navigator.clipboard.writeText(text);
          const originalText = btn.innerHTML;
          btn.innerHTML = `<span>✓</span> ${t('tips.copiedPrompt')}`;
          btn.classList.add('copied');
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.classList.remove('copied');
          }, 2000);
        } catch (err) {
          console.error('Failed to copy prompt:', err);
        }
      });
    });

    // Insert prompt handlers
    this.overlay.querySelectorAll<HTMLButtonElement>('.tip-insert-btn').forEach((btn) => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const encoded = btn.getAttribute('data-insert-prompt') || '';
        const text = decodeURIComponent(encoded);
        const chatInput = document.getElementById('chatInput') as HTMLTextAreaElement | null;
        if (chatInput) {
          chatInput.value = text;
          chatInput.dispatchEvent(new Event('input', { bubbles: true }));
          this.close();
          setTimeout(() => {
            chatInput.focus();
            chatInput.setSelectionRange(text.length, text.length);
          }, 250);
        }
      });
    });
  }
}

export const tipsModule = new TipsModule();
