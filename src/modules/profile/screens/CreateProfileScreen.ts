import { invoke } from "@tauri-apps/api/tauri";
import { t, initI18n } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

const SECRET_QUESTIONS = [
  "Nom de jeune fille de ta mère ?",
  "Prénom de ton meilleur ami d'enfance ?",
  "Ville où tu es né(e) ?",
  "Nom de ton premier animal de compagnie ?",
  "Modèle de ta première voiture ?",
  "Surnom de ton grand-père maternel ?",
];

export class CreateProfileScreen {
  private avatarBytes: number[] | null = null;
  private avatarExt = "png";
  private createdUsername = "";
  private showingWelcome = false;

  constructor(
    private el: HTMLElement,
    private onCancel: () => void,
    private onCreated: () => void,
  ) {}

  render(): void {
    this.el.addEventListener("lang-changed", () => {
      if (this.showingWelcome) this.showWelcome();
      else this.showForm();
    });
    this.showForm();
  }

  private showForm(): void {
    const questions = [
      {question: SECRET_QUESTIONS[0], answer: ""},
      {question: SECRET_QUESTIONS[2], answer: ""},
      {question: SECRET_QUESTIONS[3], answer: ""},
    ];

    this.el.innerHTML = `
      <div class="profile-screen create-profile-screen">
        <div class="profile-screen-header">
          <h2>${t("profile.createProfile")}</h2>
          <p class="profile-hint">${t("profile.createProfileHint")}</p>
        </div>

        <div class="create-profile-form">
          <h3 class="form-section-title">👤 ${t("profile.newUserDetails")}</h3>
          <input id="newUsername" class="profile-input" type="text" maxlength="20" placeholder="${t("profile.username")}" />
          <input id="newPwd" class="profile-input" type="password" placeholder="${t("profile.password")}" />
          <input id="newPwd2" class="profile-input" type="password" placeholder="${t("profile.confirmPassword")}" />

          <div class="avatar-upload-section">
            <div id="cpAvatarPreview" class="avatar-upload-placeholder">
              <span>📷</span><p>${t("profile.clickToUpload")}</p>
            </div>
            <input type="file" id="cpAvatarFile" accept=".png,.jpg,.jpeg,.webp" class="hidden" />
            <button class="profile-btn-secondary avatar-upload-btn" id="cpUploadBtn">
              📷 ${t("profile.uploadPhoto")}
            </button>
          </div>

          <h3 class="form-section-title">🔐 ${t("profile.secretQuestions")}</h3>
          ${questions.map((_, i) => `
            <select class="profile-select" id="nq${i}">
              ${SECRET_QUESTIONS.map(sq => `<option>${sq}</option>`).join("")}
            </select>
            <input class="profile-input" id="na${i}" type="text" placeholder="${t("profile.secretAnswer")}" />`).join("")}

          <div id="createError" class="profile-error hidden"></div>
          <div class="step-nav-row">
            <button class="profile-btn-secondary" id="cancelCreate">${t("common.cancel")}</button>
            <button class="profile-btn-primary" id="doCreate">${t("profile.createProfile")}</button>
          </div>
        </div>
      </div>`;

    const cpFileInput = this.el.querySelector<HTMLInputElement>("#cpAvatarFile")!;
    this.el.querySelector("#cpUploadBtn")?.addEventListener("click", () => cpFileInput.click());
    this.el.querySelector("#cpAvatarPreview")?.addEventListener("click", () => cpFileInput.click());
    cpFileInput.addEventListener("change", async () => {
      const file = cpFileInput.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) return;
      const buf = await file.arrayBuffer();
      this.avatarBytes = Array.from(new Uint8Array(buf));
      this.avatarExt = file.name.split(".").pop() ?? "png";
      const url = URL.createObjectURL(file);
      const prev = this.el.querySelector<HTMLElement>("#cpAvatarPreview");
      if (prev) prev.innerHTML = `<img src="${url}" class="settings-avatar-img" style="width:60px;height:60px" />`;
    });

    this.el.querySelector("#cancelCreate")?.addEventListener("click", () => this.onCancel());
    this.el.querySelector("#doCreate")?.addEventListener("click", async () => {
      const username = (this.el.querySelector<HTMLInputElement>("#newUsername"))?.value.trim() ?? "";
      const pwd      = (this.el.querySelector<HTMLInputElement>("#newPwd"))?.value ?? "";
      const pwd2     = (this.el.querySelector<HTMLInputElement>("#newPwd2"))?.value ?? "";

      if (!username || pwd.length < 6) { this.showError(t("profile.invalidCredentials")); return; }
      if (pwd !== pwd2) { this.showError(t("profile.passwordMismatch")); return; }

      const qs = [0,1,2].map(i => ({
        question: (this.el.querySelector<HTMLSelectElement>(`#nq${i}`))?.value ?? "",
        answer:   (this.el.querySelector<HTMLInputElement>(`#na${i}`))?.value.trim() ?? "",
      }));
      if (qs.some(q => !q.answer)) { this.showError(t("profile.allAnswersRequired")); return; }

      const createBtn = this.el.querySelector<HTMLButtonElement>("#doCreate")!;
      createBtn.disabled = true;
      try {
        // No admin credentials — self-service creation (Rust accepts null)
        const profile = await invoke<{id: string}>("create_profile", {
          adminId: null, adminPassword: null,
          username, password: pwd, role: "user",
          secretQuestions: qs, avatarColor: "#6366f1",
        });
        if (this.avatarBytes && this.avatarBytes.length > 0) {
          try {
            await invoke("upload_avatar", {
              profileId: profile.id,
              fileBytes: this.avatarBytes,
              extension: this.avatarExt,
            });
          } catch { /* avatar optional */ }
        }
        this.createdUsername = username;
        this.showingWelcome = true;
        this.showWelcome();
      } catch (e) {
        this.showError(String(e));
        createBtn.disabled = false;
      }
    });
  }

  private showWelcome(): void {
    const langs = [
      { code: "fr", flag: "🇫🇷", label: "Français" },
      { code: "en", flag: "🇬🇧", label: "English" },
      { code: "ar", flag: "🇸🇦", label: "العربية" },
    ];
    const current = localStorage.getItem("aiwidget_ui_lang") || "fr";

    this.el.innerHTML = `
      <div class="profile-screen create-profile-screen">
        <div class="user-welcome-screen">
          <div class="user-welcome-icon">🎉</div>
          <h2 class="user-welcome-title">${t("profile.welcomeUser")} ${this.createdUsername} !</h2>
          <p class="user-welcome-subtitle">${t("profile.aiReadyUser")}</p>

          <div class="user-welcome-section">
            <p class="user-welcome-lang-label">${t("profile.chooseLanguage")}</p>
            <div class="lang-cards-row">
              ${langs.map(l => `
                <button class="lang-card ${l.code === current ? "selected" : ""}" data-lang="${l.code}">
                  <span class="lang-card-flag">${l.flag}</span>
                  <span class="lang-card-label">${l.label}</span>
                </button>`).join("")}
            </div>
          </div>

          <button class="profile-btn-primary profile-btn-large" id="enterAppBtn" style="margin-top:24px">
            ${t("profile.enterApp")} →
          </button>
        </div>
      </div>`;

    this.el.querySelectorAll<HTMLButtonElement>(".lang-card").forEach(btn => {
      btn.addEventListener("click", async () => {
        const code = btn.dataset.lang!;
        localStorage.setItem("aiwidget_ui_lang", code);
        await initI18n(code);
        this.el.dispatchEvent(new CustomEvent("lang-changed", { detail: code, bubbles: true }));
      });
    });

    this.el.querySelector("#enterAppBtn")?.addEventListener("click", () => this.onCreated());
  }

  private showError(msg: string): void {
    const el = this.el.querySelector<HTMLElement>("#createError");
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
}
