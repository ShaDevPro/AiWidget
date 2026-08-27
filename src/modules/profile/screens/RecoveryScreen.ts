import { invoke } from "@tauri-apps/api/tauri";
import { t } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

export class RecoveryScreen {
  private profiles: ProfilePublic[] = [];
  private selected: ProfilePublic | null = null;
  private level = 1;
  private questions: string[] = [];

  constructor(private el: HTMLElement, private onBack: () => void) {}

  async render(): Promise<void> {
    this.profiles = await invoke<ProfilePublic[]>("list_profiles");
    this.selected = this.profiles[0] ?? null;
    this.level = 1;
    this.el.addEventListener("lang-changed", () => this.drawSelectProfile());
    this.drawSelectProfile();
  }

  private drawSelectProfile(): void {
    const opts = this.profiles.map(p => `<option value="${p.id}">${p.username}</option>`).join("");
    this.el.innerHTML = `
      <div class="profile-screen recovery-screen">
        <h2>${t("profile.recovery")}</h2>
        <p>${t("profile.recoveryHint")}</p>
        <select class="profile-select" id="recoverProfile">${opts}</select>
        <div class="step-nav-row">
          <button class="profile-btn-secondary" id="recBack">${t("profile.back")}</button>
          <button class="profile-btn-primary" id="recNext">${t("profile.next")} →</button>
        </div>
        <button class="profile-btn-link" id="masterKeyMode">${t("profile.useMasterKey")}</button>
      </div>`;

    this.el.querySelector("#recBack")?.addEventListener("click", () => this.onBack());
    this.el.querySelector("#recNext")?.addEventListener("click", async () => {
      const sel = (this.el.querySelector<HTMLSelectElement>("#recoverProfile"))?.value ?? "";
      this.selected = this.profiles.find(p => p.id === sel) ?? null;
      if (!this.selected) return;
      this.questions = await invoke<string[]>("get_secret_questions", { profileId: sel });
      this.drawQuestions();
    });
    this.el.querySelector("#masterKeyMode")?.addEventListener("click", () => {
      const sel = (this.el.querySelector<HTMLSelectElement>("#recoverProfile"))?.value ?? "";
      this.selected = this.profiles.find(p => p.id === sel) ?? null;
      this.drawMasterKey();
    });
  }

  private drawQuestions(): void {
    const rows = this.questions.map((q, i) => `
      <div class="secret-question-row">
        <label>${q}</label>
        <input class="profile-input" id="ra${i}" type="text" placeholder="${t("profile.secretAnswer")}" />
      </div>`).join("");

    this.el.innerHTML = `
      <div class="profile-screen recovery-screen">
        <h2>${t("profile.recovery")} — ${t("profile.stepQuestions")}</h2>
        ${rows}
        <div id="recError" class="profile-error hidden"></div>
        <div class="step-nav-row">
          <button class="profile-btn-secondary" id="qBack">${t("profile.back")}</button>
          <button class="profile-btn-primary" id="qNext">${t("profile.verify")}</button>
        </div>
      </div>`;

    this.el.querySelector("#qBack")?.addEventListener("click", () => this.drawSelectProfile());
    this.el.querySelector("#qNext")?.addEventListener("click", async () => {
      const answers = this.questions.map((_, i) =>
        (this.el.querySelector<HTMLInputElement>(`#ra${i}`))?.value.trim() ?? "");
      try {
        const ok = await invoke<boolean>("verify_secret_questions", {
          profileId: this.selected!.id, answers,
        });
        if (ok) this.drawNewPassword(answers);
        else this.showError("recError", t("profile.wrongAnswers"));
      } catch (e) { this.showError("recError", String(e)); }
    });
  }

  private drawMasterKey(): void {
    this.el.innerHTML = `
      <div class="profile-screen recovery-screen">
        <h2>${t("profile.useMasterKey")}</h2>
        <p>${t("profile.masterKeyHint")}</p>
        <input class="profile-input" id="masterKey" type="text" placeholder="XXXX-XXXX-XXXX-XXXX-XXXX-XXXX" />
        <div id="mkError" class="profile-error hidden"></div>
        <div class="step-nav-row">
          <button class="profile-btn-secondary" id="mkBack">${t("profile.back")}</button>
          <button class="profile-btn-primary" id="mkNext">${t("profile.next")} →</button>
        </div>
      </div>`;

    this.el.querySelector("#mkBack")?.addEventListener("click", () => this.drawSelectProfile());
    this.el.querySelector("#mkNext")?.addEventListener("click", () => {
      const key = (this.el.querySelector<HTMLInputElement>("#masterKey"))?.value.trim() ?? "";
      if (!key) return;
      this.drawNewPasswordMasterKey(key);
    });
  }

  private drawNewPassword(answers: string[]): void {
    this.el.innerHTML = `
      <div class="profile-screen recovery-screen">
        <h2>${t("profile.resetPassword")}</h2>
        <input class="profile-input" id="newPwd" type="password" placeholder="${t("profile.password")}" />
        <input class="profile-input" id="newPwd2" type="password" placeholder="${t("profile.confirmPassword")}" />
        <div id="rpError" class="profile-error hidden"></div>
        <button class="profile-btn-primary" id="doReset">${t("profile.resetPassword")}</button>
      </div>`;

    this.el.querySelector("#doReset")?.addEventListener("click", async () => {
      const pwd = (this.el.querySelector<HTMLInputElement>("#newPwd"))?.value ?? "";
      const pwd2 = (this.el.querySelector<HTMLInputElement>("#newPwd2"))?.value ?? "";
      if (pwd.length < 6) { this.showError("rpError", t("profile.passwordTooShort")); return; }
      if (pwd !== pwd2) { this.showError("rpError", t("profile.passwordMismatch")); return; }
      try {
        await invoke("reset_password_with_questions", {
          profileId: this.selected!.id, answers, newPassword: pwd,
        });
        this.drawSuccess();
      } catch (e) { this.showError("rpError", String(e)); }
    });
  }

  private drawNewPasswordMasterKey(masterKey: string): void {
    this.el.innerHTML = `
      <div class="profile-screen recovery-screen">
        <h2>${t("profile.resetPassword")}</h2>
        <input class="profile-input" id="newPwd" type="password" placeholder="${t("profile.password")}" />
        <input class="profile-input" id="newPwd2" type="password" placeholder="${t("profile.confirmPassword")}" />
        <div id="rpError" class="profile-error hidden"></div>
        <button class="profile-btn-primary" id="doReset">${t("profile.resetPassword")}</button>
      </div>`;

    this.el.querySelector("#doReset")?.addEventListener("click", async () => {
      const pwd = (this.el.querySelector<HTMLInputElement>("#newPwd"))?.value ?? "";
      const pwd2 = (this.el.querySelector<HTMLInputElement>("#newPwd2"))?.value ?? "";
      if (pwd.length < 6) { this.showError("rpError", t("profile.passwordTooShort")); return; }
      if (pwd !== pwd2) { this.showError("rpError", t("profile.passwordMismatch")); return; }
      try {
        await invoke("reset_password_with_master_key", {
          profileId: this.selected!.id, masterKey, newPassword: pwd,
        });
        this.drawSuccess();
      } catch (e) { this.showError("rpError", String(e)); }
    });
  }

  private drawSuccess(): void {
    this.el.innerHTML = `
      <div class="profile-screen recovery-screen recovery-success">
        <div class="success-icon">✅</div>
        <h2>${t("profile.passwordChanged")}</h2>
        <button class="profile-btn-primary" id="successBack">${t("profile.login")}</button>
      </div>`;
    this.el.querySelector("#successBack")?.addEventListener("click", () => this.onBack());
  }

  private showError(id: string, msg: string): void {
    const el = this.el.querySelector<HTMLElement>(`#${id}`);
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
}
