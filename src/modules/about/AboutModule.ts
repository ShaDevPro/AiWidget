/**
 * AboutModule — Copyright clicable + popup developer premium.
 * Architecture modulaire / i18n FR/EN/AR.
 */

import { t } from "../../i18n";

export class AboutModule {
  private overlay: HTMLElement | null = null;
  private lightbox: HTMLElement | null = null;
  private sidebarContainer: HTMLElement | null = null;

  /** Render the clickable copyright line */
  renderInto(container: HTMLElement): void {
    this.sidebarContainer = container;
    container.innerHTML = `
      <button class="about-copyright-btn" id="aboutOpenBtn">
        © S.H.A dev 2026. All rights reserved.
      </button>`;
    container.querySelector("#aboutOpenBtn")?.addEventListener("click", () => this.open());
  }

  refresh(): void {
    if (this.sidebarContainer) this.renderInto(this.sidebarContainer);
    if (this.overlay) this.renderOverlay();
  }

  // ── Overlay open/close ────────────────────────────────────────────

  private open(): void {
    if (this.overlay) return;
    this.overlay = document.createElement("div");
    this.overlay.className = "about-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
    this.renderOverlay();
    requestAnimationFrame(() => this.overlay?.classList.add("about-overlay-visible"));
  }

  private close(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove("about-overlay-visible");
    setTimeout(() => { this.overlay?.remove(); this.overlay = null; }, 220);
  }

  // ── Photo lightbox ────────────────────────────────────────────────

  private openLightbox(): void {
    if (this.lightbox) return;
    this.lightbox = document.createElement("div");
    this.lightbox.className = "about-lightbox";
    this.lightbox.innerHTML = `
      <div class="about-lightbox-inner">
        <img src="/dev.webp" class="about-lightbox-img" alt="Hadj Ahmed SLIMANI" />
        <button class="about-lightbox-close" id="lbClose">✕</button>
      </div>`;
    this.lightbox.addEventListener("click", (e) => {
      if (e.target === this.lightbox) this.closeLightbox();
    });
    this.lightbox.querySelector("#lbClose")?.addEventListener("click", () => this.closeLightbox());
    document.body.appendChild(this.lightbox);
    requestAnimationFrame(() => this.lightbox?.classList.add("about-lightbox-visible"));
  }

  private closeLightbox(): void {
    if (!this.lightbox) return;
    this.lightbox.classList.remove("about-lightbox-visible");
    setTimeout(() => { this.lightbox?.remove(); this.lightbox = null; }, 200);
  }

  // ── Overlay render ────────────────────────────────────────────────

  private renderOverlay(): void {
    if (!this.overlay) return;

    this.overlay.innerHTML = `
      <div class="about-page">

        <!-- Close -->
        <button class="about-close-btn" id="aboutClose">✕</button>

        <!-- Header gradient band -->
        <div class="about-header-band"></div>

        <!-- Dev photo -->
        <div class="about-photo-wrap">
          <div class="about-photo-ring">
            <img src="/dev.webp"
                 class="about-photo-img"
                 id="aboutPhoto"
                 alt="Hadj Ahmed SLIMANI"
                 title="${t("about.clickToZoom")}" />
          </div>
          <span class="about-photo-zoom-hint">${t("about.clickToZoom")}</span>
        </div>

        <!-- Identity -->
        <div class="about-identity">
          <h2 class="about-name">Hadj Ahmed SLIMANI</h2>
          <p class="about-role">${t("about.role")}</p>
        </div>

        <!-- Bio -->
        <div class="about-bio-wrap">
          <p class="about-bio">${t("about.bio")}</p>
        </div>

        <!-- Divider -->
        <div class="about-divider"></div>

        <!-- Copyright -->
        <div class="about-footer">
          <span class="about-copyright">© S.H.A dev 2026. All rights reserved.</span>
          <span class="about-made">${t("about.madeWith")}</span>
        </div>
      </div>`;

    // Events
    this.overlay.querySelector("#aboutClose")?.addEventListener("click", () => this.close());
    this.overlay.querySelector("#aboutPhoto")?.addEventListener("click", () => this.openLightbox());
  }
}

export const aboutModule = new AboutModule();
