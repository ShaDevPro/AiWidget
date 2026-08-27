import { invoke } from "@tauri-apps/api/tauri";
import { t } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

export class LoginScreen {
  private profiles: ProfilePublic[] = [];
  private selected: ProfilePublic | null = null;
  private avatarUrls: Record<string, string> = {}; // profile_id -> data URL

  constructor(
    private el: HTMLElement,
    private onLogin: (p: ProfilePublic) => void,
    private onAdminCreate: () => void,
    private onCreateProfile: () => void,
    private onRecovery: () => void,
  ) {}

  async render(): Promise<void> {
    this.profiles = await invoke<ProfilePublic[]>("list_profiles");
    this.selected = this.profiles[0] ?? null;
    this.el.addEventListener("lang-changed", () => this.draw());
    // Pre-load all avatars asynchronously
    await this.loadAvatars();
    this.draw();
  }

  private async loadAvatars(): Promise<void> {
    for (const p of this.profiles) {
      if (p.has_avatar) {
        try {
          this.avatarUrls[p.id] = await invoke<string>("get_avatar_data_url", { profileId: p.id });
        } catch { /* use initials fallback */ }
      }
    }
  }

  private avatarHtml(p: ProfilePublic, size = "card"): string {
    const cls = size === "card" ? "profile-avatar-img" : "profile-avatar-img-sm";
    if (this.avatarUrls[p.id]) {
      return `<img src="${this.avatarUrls[p.id]}" class="${cls}" alt="${p.username}" />`;
    }
    const initial = p.username[0].toUpperCase();
    return `<div class="profile-avatar-circle" style="background:${p.avatar_color}">${initial}</div>`;
  }

  private draw(): void {
    const cards = this.profiles.map((p) => {
      const isSelected = this.selected?.id === p.id;
      return `
        <div class="profile-card ${isSelected ? "selected" : ""}" data-id="${p.id}">
          ${this.avatarHtml(p)}
          <span class="profile-card-name">${p.username}</span>
          ${p.role === "admin" ? `<span class="profile-card-badge">${t("profile.admin")}</span>` : ""}
        </div>`;
    }).join("");

    this.el.innerHTML = `
      <div class="profile-screen login-screen">
        <div class="login-header">
          <img src="/app-icon.png" class="login-app-icon" alt="AI Widget" />
          <h1 class="login-app-name">AI Widget</h1>
          <p class="login-tagline">${t("profile.selectProfile")}</p>
        </div>

        <div class="profile-cards-row">
          ${cards}
          <div class="profile-card add-profile-card" id="addProfileBtn">
            <div class="profile-avatar-circle profile-add-icon">+</div>
            <span class="profile-card-name">${t("profile.newProfile")}</span>
          </div>
        </div>

        ${this.selected ? `
        <div class="profile-login-form">
          <div class="profile-input-icon">
            <input id="loginPassword" type="password" class="profile-input"
              placeholder="${t("profile.password")}" autocomplete="current-password" />
            <button class="profile-eye-btn" id="togglePwd" type="button">👁</button>
          </div>
          <div id="loginError" class="profile-error hidden"></div>
          <button class="profile-btn-primary" id="loginBtn">${t("profile.login")}</button>
          <button class="profile-btn-link" id="recoveryBtn">${t("profile.forgotPassword")}</button>
        </div>` : ""}
      </div>`;

    this.bindEvents();
  }

  private bindEvents(): void {
    this.el.querySelectorAll<HTMLElement>(".profile-card[data-id]").forEach((card) => {
      card.addEventListener("click", () => {
        this.selected = this.profiles.find((p) => p.id === card.dataset.id!) ?? null;
        this.draw();
        setTimeout(() => (this.el.querySelector("#loginPassword") as HTMLInputElement)?.focus(), 50);
      });
    });

    this.el.querySelector("#addProfileBtn")?.addEventListener("click", () => this.onCreateProfile());

    this.el.querySelector("#togglePwd")?.addEventListener("click", () => {
      const inp = this.el.querySelector<HTMLInputElement>("#loginPassword");
      if (inp) inp.type = inp.type === "password" ? "text" : "password";
    });

    const loginBtn = this.el.querySelector<HTMLButtonElement>("#loginBtn");
    const loginPwd = this.el.querySelector<HTMLInputElement>("#loginPassword");

    const doLogin = async () => {
      if (!this.selected || !loginPwd) return;
      const pwd = loginPwd.value;
      if (!pwd) { this.showError(t("profile.passwordRequired")); return; }
      if (loginBtn) loginBtn.disabled = true;
      try {
        const profile = await invoke<ProfilePublic>("login", { profileId: this.selected.id, password: pwd });
        this.onLogin(profile);
      } catch (e) {
        const msg = String(e);
        if (msg.includes("account_banned")) {
          this.showError(t("profile.accountBanned"));
        } else {
          this.showError(t("profile.wrongPassword"));
        }
        loginPwd.value = "";
        loginPwd.focus();
      } finally {
        if (loginBtn) loginBtn.disabled = false;
      }
    };

    loginBtn?.addEventListener("click", doLogin);
    loginPwd?.addEventListener("keydown", (e) => { if (e.key === "Enter") void doLogin(); });
    this.el.querySelector("#recoveryBtn")?.addEventListener("click", () => this.onRecovery());
  }

  private showError(msg: string): void {
    const el = this.el.querySelector<HTMLElement>("#loginError");
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
}
