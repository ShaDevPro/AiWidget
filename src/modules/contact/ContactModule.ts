/**
 * ContactModule — Contact & Feedback popups.
 * Architecture modulaire / i18n FR/EN/AR.
 * Email: s.h.a.dev.pro@gmail.com
 */

import { t } from "../../i18n";

const DEV_EMAIL = "s.h.a.dev.pro@gmail.com";

// ── Generic popup builder ─────────────────────────────────────────────────────

class ContactPopup {
  private overlay: HTMLElement | null = null;
  private type: "contact" | "feedback";

  constructor(type: "contact" | "feedback") {
    this.type = type;
  }

  open(): void {
    if (this.overlay) return;
    this.overlay = document.createElement("div");
    this.overlay.className = "contact-overlay";
    this.overlay.addEventListener("click", (e) => {
      if (e.target === this.overlay) this.close();
    });
    document.body.appendChild(this.overlay);
    this.render();
    requestAnimationFrame(() => this.overlay?.classList.add("contact-overlay-visible"));
  }

  close(): void {
    if (!this.overlay) return;
    this.overlay.classList.remove("contact-overlay-visible");
    setTimeout(() => { this.overlay?.remove(); this.overlay = null; }, 220);
  }

  private render(): void {
    if (!this.overlay) return;
    const isContact = this.type === "contact";

    const bodyHTML = isContact ? this.buildContactBody() : this.buildFeedbackBody();

    this.overlay.innerHTML = `
      <div class="contact-page">
        <!-- Header -->
        <div class="contact-header ${isContact ? 'contact-hdr-contact' : 'contact-hdr-feedback'}">
          <div class="contact-header-left">
            <span class="contact-header-icon">${isContact ? "📬" : "💬"}</span>
            <div>
              <h2 class="contact-header-title">${t(isContact ? "contact.title" : "feedback.title")}</h2>
              <p class="contact-header-sub">${t(isContact ? "contact.subtitle" : "feedback.subtitle")}</p>
            </div>
          </div>
          <button class="contact-close-btn" id="contactClose">✕</button>
        </div>

        <!-- Body -->
        <div class="contact-body">
          ${bodyHTML}
        </div>
      </div>`;

    // Events
    this.overlay.querySelector("#contactClose")?.addEventListener("click", () => this.close());
    if (!isContact) this.attachFeedbackEvents();
    else this.attachContactEvents();
  }

  // ── Contact body ────────────────────────────────────────────────────────────

  private buildContactBody(): string {
    return `
      <div class="contact-section">
        <p class="contact-desc">${t("contact.desc")}</p>
      </div>

      <div class="contact-email-card">
        <span class="contact-email-icon">✉️</span>
        <div class="contact-email-info">
          <span class="contact-email-label">${t("contact.emailLabel")}</span>
          <span class="contact-email-addr" id="contactEmailAddr">${DEV_EMAIL}</span>
        </div>
        <button class="contact-copy-btn" id="contactCopyBtn" title="${t("contact.copy")}">
          📋
        </button>
      </div>

      <a class="contact-mailto-btn" href="mailto:${DEV_EMAIL}?subject=${encodeURIComponent(t("contact.mailSubject"))}" target="_blank">
        ${t("contact.openMailClient")} →
      </a>

      <p class="contact-note">${t("contact.responseNote")}</p>`;
  }

  // ── Feedback body ───────────────────────────────────────────────────────────

  private buildFeedbackBody(): string {
    return `
      <div class="contact-section">
        <p class="contact-desc">${t("feedback.desc")}</p>
      </div>

      <div class="feedback-type-row">
        <button class="feedback-type-btn active" data-type="suggestion">💡 ${t("feedback.suggestion")}</button>
        <button class="feedback-type-btn" data-type="bug">🐛 ${t("feedback.bug")}</button>
        <button class="feedback-type-btn" data-type="compliment">⭐ ${t("feedback.compliment")}</button>
      </div>

      <textarea class="feedback-textarea" id="feedbackText"
        placeholder="${t("feedback.placeholder")}"
        maxlength="500" rows="4"></textarea>
      <div class="feedback-char-count"><span id="feedbackCount">0</span>/500</div>

      <div class="contact-email-card" style="margin-top:10px">
        <span class="contact-email-icon">✉️</span>
        <div class="contact-email-info">
          <span class="contact-email-label">${t("contact.emailLabel")}</span>
          <span class="contact-email-addr">${DEV_EMAIL}</span>
        </div>
      </div>

      <button class="contact-mailto-btn feedback-send-btn" id="feedbackSendBtn">
        ${t("feedback.send")} →
      </button>`;
  }

  // ── Contact events ──────────────────────────────────────────────────────────

  private attachContactEvents(): void {
    const copyBtn = this.overlay?.querySelector<HTMLButtonElement>("#contactCopyBtn");
    copyBtn?.addEventListener("click", async () => {
      await navigator.clipboard.writeText(DEV_EMAIL);
      copyBtn.textContent = "✅";
      setTimeout(() => { copyBtn.textContent = "📋"; }, 1800);
    });
  }

  // ── Feedback events ─────────────────────────────────────────────────────────

  private attachFeedbackEvents(): void {
    const textarea = this.overlay?.querySelector<HTMLTextAreaElement>("#feedbackText");
    const countEl  = this.overlay?.querySelector<HTMLElement>("#feedbackCount");
    const sendBtn  = this.overlay?.querySelector<HTMLButtonElement>("#feedbackSendBtn");
    let selectedType = "suggestion";

    // Type buttons
    this.overlay?.querySelectorAll<HTMLButtonElement>(".feedback-type-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        this.overlay?.querySelectorAll(".feedback-type-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        selectedType = btn.dataset.type ?? "suggestion";
      });
    });

    // Char count
    textarea?.addEventListener("input", () => {
      if (countEl) countEl.textContent = String(textarea.value.length);
    });

    // Send via mailto
    sendBtn?.addEventListener("click", () => {
      const text    = textarea?.value.trim() ?? "";
      const subject = encodeURIComponent(`[AI Widget Feedback – ${selectedType}]`);
      const body    = encodeURIComponent(text);
      window.open(`mailto:${DEV_EMAIL}?subject=${subject}&body=${body}`, "_blank");
    });
  }
}

// ── Module singleton ──────────────────────────────────────────────────────────

export class ContactModule {
  private contactPopup = new ContactPopup("contact");
  private feedbackPopup = new ContactPopup("feedback");
  private sidebarContainer: HTMLElement | null = null;

  renderInto(container: HTMLElement): void {
    this.sidebarContainer = container;
    container.innerHTML = `
      <div class="contact-sidebar-row">
        <button class="contact-sidebar-btn" id="contactOpenBtn">
          📬 ${t("contact.title")}
        </button>
        <span class="contact-sidebar-sep">·</span>
        <button class="contact-sidebar-btn" id="feedbackOpenBtn">
          💬 ${t("feedback.title")}
        </button>
      </div>`;

    container.querySelector("#contactOpenBtn")?.addEventListener("click", () => this.contactPopup.open());
    container.querySelector("#feedbackOpenBtn")?.addEventListener("click", () => this.feedbackPopup.open());
  }

  openContact(): void {
    this.contactPopup.open();
  }

  openFeedback(): void {
    this.feedbackPopup.open();
  }

  refresh(): void {
    if (this.sidebarContainer) this.renderInto(this.sidebarContainer);
  }
}

export const contactModule = new ContactModule();
