/**
 * LegalModule — Privacy Policy & Terms of Service overlays.
 * Architecture modulaire / i18n FR/EN/AR.
 */

import { t } from "../../i18n";

// ── Section structure ─────────────────────────────────────────────────────────

interface LegalSection {
  iconKey: string;
  titleKey: string;
  textKey: string;
}

// ── Privacy sections ──────────────────────────────────────────────────────────

const PRIVACY_SECTIONS: LegalSection[] = [
  { iconKey: "💾", titleKey: "privacy.s1Title", textKey: "privacy.s1Text" },
  { iconKey: "🔒", titleKey: "privacy.s2Title", textKey: "privacy.s2Text" },
  { iconKey: "💬", titleKey: "privacy.s3Title", textKey: "privacy.s3Text" },
  { iconKey: "🚫", titleKey: "privacy.s4Title", textKey: "privacy.s4Text" },
  { iconKey: "🛡️", titleKey: "privacy.s5Title", textKey: "privacy.s5Text" },
  { iconKey: "📬", titleKey: "privacy.s6Title", textKey: "privacy.s6Text" },
];

// ── Terms sections ────────────────────────────────────────────────────────────

const TERMS_SECTIONS: LegalSection[] = [
  { iconKey: "✅", titleKey: "terms.s1Title", textKey: "terms.s1Text" },
  { iconKey: "📱", titleKey: "terms.s2Title", textKey: "terms.s2Text" },
  { iconKey: "©",  titleKey: "terms.s3Title", textKey: "terms.s3Text" },
  { iconKey: "⚠️", titleKey: "terms.s4Title", textKey: "terms.s4Text" },
  { iconKey: "🔄", titleKey: "terms.s5Title", textKey: "terms.s5Text" },
  { iconKey: "📬", titleKey: "terms.s6Title", textKey: "terms.s6Text" },
];

// ── Generic Legal Overlay ─────────────────────────────────────────────────────

class LegalOverlay {
  private overlay: HTMLElement | null = null;
  private type: "privacy" | "terms";

  constructor(type: "privacy" | "terms") {
    this.type = type;
  }

  open(): void {
    if (this.overlay) return;
    this.overlay = document.createElement("div");
    this.overlay.className = "legal-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
    this.render();
    requestAnimationFrame(() => this.overlay?.classList.add("legal-overlay-visible"));
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove("legal-overlay-visible");
    setTimeout(() => { this.overlay?.remove(); this.overlay = null; }, 220);
  }

  private render(): void {
    if (!this.overlay) return;
    const isPrivacy = this.type === "privacy";
    const sections  = isPrivacy ? PRIVACY_SECTIONS : TERMS_SECTIONS;
    const ns        = isPrivacy ? "privacy" : "terms";

    const sectionsHTML = sections.map(s => `
      <div class="legal-section">
        <div class="legal-section-header">
          <span class="legal-section-icon">${s.iconKey}</span>
          <h3 class="legal-section-title">${t(s.titleKey)}</h3>
        </div>
        <p class="legal-section-text">${t(s.textKey)}</p>
      </div>`).join("");

    this.overlay.innerHTML = `
      <div class="legal-page">

        <!-- Header -->
        <div class="legal-header ${isPrivacy ? "legal-hdr-privacy" : "legal-hdr-terms"}">
          <div class="legal-header-left">
            <span class="legal-header-icon">${isPrivacy ? "🔐" : "📋"}</span>
            <div>
              <h2 class="legal-header-title">${t(`${ns}.title`)}</h2>
              <p class="legal-header-sub">${t(`${ns}.subtitle`)}</p>
            </div>
          </div>
          <button class="legal-close-btn" id="legalClose">✕</button>
        </div>

        <!-- Intro -->
        <div class="legal-intro">
          <p class="legal-intro-text">${t(`${ns}.intro`)}</p>
        </div>

        <!-- Sections -->
        <div class="legal-content">
          ${sectionsHTML}
        </div>

        <!-- Footer -->
        <div class="legal-footer">
          <span class="legal-updated">${t("legal.updated")}: ${t(`${ns}.updatedDate`)}</span>
          <span class="legal-brand">© S.H.A dev 2026</span>
        </div>
      </div>`;

    this.overlay.querySelector("#legalClose")?.addEventListener("click", () => this.close());
  }
}

// ── Module ────────────────────────────────────────────────────────────────────

export class LegalModule {
  private privacyOverlay = new LegalOverlay("privacy");
  private termsOverlay   = new LegalOverlay("terms");
  private sidebarContainer: HTMLElement | null = null;

  renderInto(container: HTMLElement): void {
    this.sidebarContainer = container;
    container.innerHTML = `
      <div class="legal-sidebar-row">
        <button class="legal-sidebar-btn" id="privacyOpenBtn">
          🔐 ${t("privacy.title")}
        </button>
        <span class="legal-sidebar-sep">·</span>
        <button class="legal-sidebar-btn" id="termsOpenBtn">
          📋 ${t("terms.title")}
        </button>
      </div>`;

    container.querySelector("#privacyOpenBtn")?.addEventListener("click", () => this.privacyOverlay.open());
    container.querySelector("#termsOpenBtn")?.addEventListener("click",   () => this.termsOverlay.open());
  }

  openPrivacy(): void {
    this.privacyOverlay.open();
  }

  openTerms(): void {
    this.termsOverlay.open();
  }

  refresh(): void {
    if (this.sidebarContainer) this.renderInto(this.sidebarContainer);
  }
}

export const legalModule = new LegalModule();
