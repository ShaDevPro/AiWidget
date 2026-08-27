/**
 * HelpModule — Rubrique Aide premium.
 * Bouton dans la sidebar → ouvre un overlay pleine page premium.
 * Architecture modulaire / i18n FR/EN/AR.
 * Extensible : ajouter une entrée dans HELP_ITEMS.
 */

import { t } from "../../i18n";

// ── Types ──────────────────────────────────────────────────────────────────────

export type HelpCategory = "all" | "shortcut" | "feature" | "tip" | "privacy";

export interface HelpItem {
  id: string;
  icon: string;
  titleKey: string;
  descKey: string;
  category: Exclude<HelpCategory, "all">;
}

// ── Content (ajouter ici pour étendre) ────────────────────────────────────────

const HELP_ITEMS: HelpItem[] = [
  {
    id: "ctrl-enter",
    icon: "⌨️",
    titleKey: "help.shortcutSendTitle",
    descKey:  "help.shortcutSendDesc",
    category: "shortcut",
  },
  {
    id: "voice-input",
    icon: "🎙️",
    titleKey: "help.voiceTitle",
    descKey:  "help.voiceDesc",
    category: "feature",
  },
  {
    id: "rag-docs",
    icon: "📎",
    titleKey: "help.ragTitle",
    descKey:  "help.ragDesc",
    category: "feature",
  },
  {
    id: "model-switch",
    icon: "🤖",
    titleKey: "help.modelTitle",
    descKey:  "help.modelDesc",
    category: "tip",
  },
  {
    id: "lang-switch",
    icon: "🌐",
    titleKey: "help.langTitle",
    descKey:  "help.langDesc",
    category: "tip",
  },
  {
    id: "privacy",
    icon: "🔒",
    titleKey: "help.privacyTitle",
    descKey:  "help.privacyDesc",
    category: "privacy",
  },
  {
    id: "resize",
    icon: "↔️",
    titleKey: "help.resizeTitle",
    descKey:  "help.resizeDesc",
    category: "tip",
  },
  {
    id: "stats",
    icon: "📊",
    titleKey: "help.statsTitle",
    descKey:  "help.statsDesc",
    category: "feature",
  },
  {
    id: "pin",
    icon: "📌",
    titleKey: "help.pinTitle",
    descKey:  "help.pinDesc",
    category: "feature",
  },
  {
    id: "memory",
    icon: "🧠",
    titleKey: "help.memoryTitle",
    descKey:  "help.memoryDesc",
    category: "feature",
  },
  {
    id: "bubble",
    icon: "🫧",
    titleKey: "help.bubbleTitle",
    descKey:  "help.bubbleDesc",
    category: "tip",
  },
  {
    id: "local-data",
    icon: "🛡️",
    titleKey: "help.localDataTitle",
    descKey:  "help.localDataDesc",
    category: "privacy",
  },
];

const CATEGORY_META: Record<string, { labelKey: string; cls: string; emoji: string }> = {
  all:      { labelKey: "help.catAll",      cls: "htag-all",      emoji: "✨" },
  shortcut: { labelKey: "help.catShortcut", cls: "htag-shortcut", emoji: "⌨️" },
  feature:  { labelKey: "help.catFeature",  cls: "htag-feature",  emoji: "🚀" },
  tip:      { labelKey: "help.catTip",      cls: "htag-tip",      emoji: "💡" },
  privacy:  { labelKey: "help.catPrivacy",  cls: "htag-privacy",  emoji: "🔒" },
};

// ── Module ────────────────────────────────────────────────────────────────────

export class HelpModule {
  private overlay: HTMLElement | null = null;
  private activeCategory: HelpCategory = "all";
  private searchQuery = "";
  private sidebarContainer: HTMLElement | null = null;

  /** Render the header trigger button */
  renderInto(container: HTMLElement): void {
    this.sidebarContainer = container;
    container.innerHTML = `
      <button class="tb-help-btn" id="helpOpenBtn" title="${t("help.title")}">
        <span class="tb-help-icon">❓</span>
        <span class="tb-help-label">${t("help.title")}</span>
        <span class="tb-help-badge">${HELP_ITEMS.length}</span>
      </button>`;
    container.querySelector("#helpOpenBtn")?.addEventListener("click", () => this.open());
  }

  /** Re-render trigger after lang change */
  refresh(): void {
    if (this.sidebarContainer) this.renderInto(this.sidebarContainer);
    if (this.overlay) this.renderOverlay();
  }

  // ── Overlay open/close ─────────────────────────────────────────────────────

  private open(): void {
    if (this.overlay) return;

    this.overlay = document.createElement("div");
    this.overlay.className = "help-overlay";
    this.overlay.setAttribute("role", "dialog");
    this.overlay.setAttribute("aria-modal", "true");

    // Close on backdrop click
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });

    document.body.appendChild(this.overlay);
    this.renderOverlay();

    // Animate in
    requestAnimationFrame(() => this.overlay?.classList.add("help-overlay-visible"));
  }

  private close(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove("help-overlay-visible");
    this.overlay.classList.add("help-overlay-closing");
    setTimeout(() => {
      this.overlay?.remove();
      this.overlay = null;
    }, 220);
  }

  // ── Overlay render ─────────────────────────────────────────────────────────

  private renderOverlay(): void {
    if (!this.overlay) return;

    const categories: HelpCategory[] = ["all", "shortcut", "feature", "tip", "privacy"];
    const q = this.searchQuery.toLowerCase();

    const filtered = HELP_ITEMS.filter(item => {
      const matchCat = this.activeCategory === "all" || item.category === this.activeCategory;
      const matchQ   = !q || t(item.titleKey).toLowerCase().includes(q) || t(item.descKey).toLowerCase().includes(q);
      return matchCat && matchQ;
    });

    const catTabs = categories.map(c => {
      const m = CATEGORY_META[c];
      const count = c === "all" ? HELP_ITEMS.length : HELP_ITEMS.filter(i => i.category === c).length;
      return `
        <button class="help-cat-tab ${this.activeCategory === c ? "active" : ""} ${m.cls}" data-cat="${c}">
          ${m.emoji} ${t(m.labelKey)}
          <span class="help-cat-count">${count}</span>
        </button>`;
    }).join("");

    const cards = filtered.length === 0
      ? `<div class="help-empty">${t("help.noResults")}</div>`
      : filtered.map(item => {
          const meta = CATEGORY_META[item.category];
          return `
            <div class="help-card">
              <div class="help-card-header">
                <span class="help-card-icon">${item.icon}</span>
                <span class="help-card-tag ${meta.cls}">${meta.emoji} ${t(meta.labelKey)}</span>
              </div>
              <div class="help-card-title">${t(item.titleKey)}</div>
              <div class="help-card-desc">${t(item.descKey)}</div>
            </div>`;
        }).join("");

    this.overlay.innerHTML = `
      <div class="help-page">
        <!-- Header -->
        <div class="help-header">
          <div class="help-header-left">
            <span class="help-header-icon">❓</span>
            <div>
              <h2 class="help-header-title">${t("help.title")}</h2>
              <p class="help-header-sub">${t("help.subtitle")}</p>
            </div>
          </div>
          <button class="help-close-btn" id="helpCloseBtn" aria-label="Fermer">✕</button>
        </div>

        <!-- Search bar -->
        <div class="help-search-wrap">
          <span class="help-search-icon">🔍</span>
          <input class="help-search-input" id="helpSearch"
            type="text" placeholder="${t("help.searchPlaceholder")}"
            value="${this.searchQuery}" />
          ${this.searchQuery ? `<button class="help-search-clear" id="helpSearchClear">✕</button>` : ""}
        </div>

        <!-- Category tabs -->
        <div class="help-cat-tabs">
          ${catTabs}
        </div>

        <!-- Cards grid -->
        <div class="help-grid" id="helpGrid">
          ${cards}
        </div>

        <!-- Footer -->
        <div class="help-page-footer">
          <span class="help-version-badge">AI Widget v1.0</span>
          <span class="help-footer-text">${t("help.footerNote")}</span>
        </div>
      </div>`;

    // ── Events ──────────────────────────────────────────────────────────────
    this.overlay.querySelector("#helpCloseBtn")?.addEventListener("click", () => this.close());

    this.overlay.querySelector<HTMLInputElement>("#helpSearch")?.addEventListener("input", (e) => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      this.renderOverlay();
    });

    this.overlay.querySelector("#helpSearchClear")?.addEventListener("click", () => {
      this.searchQuery = "";
      this.renderOverlay();
    });

    this.overlay.querySelectorAll<HTMLButtonElement>(".help-cat-tab").forEach(btn => {
      btn.addEventListener("click", () => {
        this.activeCategory = btn.dataset.cat as HelpCategory;
        this.renderOverlay();
      });
    });

    // Focus search
    setTimeout(() => {
      this.overlay?.querySelector<HTMLInputElement>("#helpSearch")?.focus();
    }, 50);
  }
}

export const helpModule = new HelpModule();
