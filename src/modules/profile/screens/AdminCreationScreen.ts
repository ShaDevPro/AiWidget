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


export class AdminCreationScreen {
  private step = 1;
  private loggedProfile: ProfilePublic | null = null; // set after auto-login in step 5
  private data = {
    username: "",
    password: "",
    color: "#6366f1",
    questions: [] as {question:string,answer:string}[],
    masterKey: "",
    avatarBytes: null as number[] | null,
    avatarExt: "png",
    avatarPreviewUrl: "" as string,
  };

  constructor(
    private el: HTMLElement,
    private onDone: (p: ProfilePublic) => void,
  ) {}

  render(): void {
    this.el.addEventListener("lang-changed", () => this.drawStep());
    this.drawStep();
  }

  private drawStep(): void {
    switch (this.step) {
      case 1: this.drawStep1(); break;
      case 2: this.drawStep2(); break;
      case 3: this.drawStep3(); break;
      case 4: void this.drawStep4(); break;
      case 5: void this.drawStep5(); break;
      case 6: this.drawStep6(); break;
      case 7: void this.drawStep7(); break;
    }
  }

  private stepHeader(title: string): string {
    return `
      <div class="admin-creation-header">
        <div class="admin-step-indicator">
          ${[1,2,3,4,5,6,7].map(n => `<span class="step-dot ${n <= this.step ? "active" : ""} ${n < this.step ? "done" : ""}">${n < this.step ? "✓" : n}</span>`).join("")}
        </div>
        <h2 class="admin-step-title">🛡️ ${t("profile.adminCreation")}</h2>
        <p class="admin-step-subtitle">${title}</p>
      </div>`;
  }

  private drawStep1(): void {
    const preview = this.data.avatarPreviewUrl
      ? `<img id="avatarPreview" class="avatar-upload-preview avatar-clickable"
             src="${this.data.avatarPreviewUrl}"
             title="${t("profile.uploadPhoto")}" />`
      : `<div id="avatarPreview" class="avatar-upload-placeholder avatar-clickable"
             title="${t("profile.uploadPhoto")}">
           <span>📷</span>
           <p>${t("profile.clickToUpload")}</p>
         </div>`;

    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepIdentity"))}
        <div class="admin-step-body">
          <div class="avatar-upload-section">
            <label>${t("profile.avatar")}</label>
            ${preview}
            <input type="file" id="avatarFile" accept=".png,.jpg,.jpeg,.webp" class="hidden" />
            <button class="profile-btn-secondary avatar-upload-btn" id="uploadAvatarBtn">
              📷 ${t("profile.uploadPhoto")}
            </button>
          </div>
          <div class="profile-input-group">
            <label>${t("profile.username")}</label>
            <input id="adminUsername" class="profile-input" type="text" maxlength="20"
              placeholder="admin" value="${this.data.username}" />
            <span class="profile-hint">${t("profile.usernameHint")}</span>
          </div>
          <div id="step1Error" class="profile-error hidden"></div>
          <button class="profile-btn-primary" id="step1Next">${t("profile.next")} →</button>
        </div>
      </div>`;

    // Avatar upload handler — both button AND circle open file picker
    const fileInput = this.el.querySelector<HTMLInputElement>("#avatarFile")!;
    const openPicker = () => fileInput.click();
    this.el.querySelector("#uploadAvatarBtn")?.addEventListener("click", openPicker);
    this.el.querySelector("#avatarPreview")?.addEventListener("click", openPicker);

    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      if (file.size > 3 * 1024 * 1024) { this.showError("step1Error", t("profile.avatarTooBig")); return; }
      const buf = await file.arrayBuffer();
      this.data.avatarBytes = Array.from(new Uint8Array(buf));
      this.data.avatarExt = file.name.split(".").pop() ?? "png";
      // Revoke previous blob URL to avoid memory leak
      if (this.data.avatarPreviewUrl) URL.revokeObjectURL(this.data.avatarPreviewUrl);
      this.data.avatarPreviewUrl = URL.createObjectURL(file);
      // Re-render step1 — src will be set from this.data.avatarPreviewUrl
      this.drawStep1();
    });

    this.el.querySelector("#step1Next")?.addEventListener("click", () => {
      const val = (this.el.querySelector<HTMLInputElement>("#adminUsername"))?.value.trim() ?? "";
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(val)) {
        this.showError("step1Error", t("profile.usernameInvalid")); return;
      }
      this.data.username = val;
      this.step = 2; this.drawStep();
    });
  }

  private drawStep2(): void {
    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepPassword"))}
        <div class="admin-step-body">
          <div class="profile-input-group">
            <label>${t("profile.password")}</label>
            <input id="adminPwd" class="profile-input" type="password" placeholder="••••••••" />
          </div>
          <div class="profile-input-group">
            <label>${t("profile.confirmPassword")}</label>
            <input id="adminPwd2" class="profile-input" type="password" placeholder="••••••••" />
          </div>
          <div class="pwd-strength-bar">
            <div id="pwdStrengthFill" class="pwd-strength-fill"></div>
          </div>
          <ul class="pwd-rules" id="pwdRules">
            <li id="r-len">○ ${t("profile.ruleLength")}</li>
            <li id="r-upper">○ ${t("profile.ruleUpper")}</li>
            <li id="r-num">○ ${t("profile.ruleNumber")}</li>
            <li id="r-special">○ ${t("profile.ruleSpecial")}</li>
          </ul>
          <div id="step2Error" class="profile-error hidden"></div>
          <div class="step-nav-row">
            <button class="profile-btn-secondary" id="step2Back">← ${t("profile.back")}</button>
            <button class="profile-btn-primary" id="step2Next">${t("profile.next")} →</button>
          </div>
        </div>
      </div>`;

    const pwd = this.el.querySelector<HTMLInputElement>("#adminPwd")!;
    pwd.addEventListener("input", () => this.updatePwdStrength(pwd.value));
    this.el.querySelector("#step2Back")?.addEventListener("click", () => { this.step = 1; this.drawStep(); });
    this.el.querySelector("#step2Next")?.addEventListener("click", () => {
      const p1 = pwd.value;
      const p2 = (this.el.querySelector<HTMLInputElement>("#adminPwd2"))?.value ?? "";
      if (!this.validatePassword(p1)) { this.showError("step2Error", t("profile.passwordWeak")); return; }
      if (p1 !== p2) { this.showError("step2Error", t("profile.passwordMismatch")); return; }
      this.data.password = p1;
      this.step = 3; this.drawStep();
    });
  }

  private updatePwdStrength(pwd: string): void {
    const rules = [pwd.length >= 8, /[A-Z]/.test(pwd), /[0-9]/.test(pwd), /[!@#$%^&*]/.test(pwd)];
    const score = rules.filter(Boolean).length;
    const fill = this.el.querySelector<HTMLElement>("#pwdStrengthFill");
    if (fill) {
      fill.style.width = `${score * 25}%`;
      fill.style.background = ["#ef4444","#f59e0b","#eab308","#22c55e"][score - 1] ?? "#e2e8f0";
    }
    const ids = ["r-len","r-upper","r-num","r-special"];
    ids.forEach((id, i) => {
      const el = this.el.querySelector(`#${id}`);
      if (el) el.textContent = (rules[i] ? "✅" : "○") + " " + el.textContent!.slice(2);
    });
  }

  private validatePassword(p: string): boolean {
    return p.length >= 8 && /[A-Z]/.test(p) && /[0-9]/.test(p) && /[!@#$%^&*]/.test(p);
  }

  private drawStep3(): void {
    if (this.data.questions.length === 0) {
      this.data.questions = [
        {question: SECRET_QUESTIONS[0], answer: ""},
        {question: SECRET_QUESTIONS[2], answer: ""},
        {question: SECRET_QUESTIONS[3], answer: ""},
      ];
    }
    const qRows = this.data.questions.map((q, i) => `
      <div class="secret-question-row">
        <select class="profile-select" id="q${i}">
          ${SECRET_QUESTIONS.map(sq => `<option value="${sq}" ${sq === q.question ? "selected" : ""}>${sq}</option>`).join("")}
        </select>
        <input class="profile-input" type="text" id="a${i}" placeholder="${t("profile.secretAnswer")}" value="${q.answer}" />
      </div>`).join("");

    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepQuestions"))}
        <div class="admin-step-body">
          <p class="profile-hint">${t("profile.questionsHint")}</p>
          ${qRows}
          <div id="step3Error" class="profile-error hidden"></div>
          <div class="step-nav-row">
            <button class="profile-btn-secondary" id="step3Back">← ${t("profile.back")}</button>
            <button class="profile-btn-primary" id="step3Next">${t("profile.next")} →</button>
          </div>
        </div>
      </div>`;

    this.el.querySelector("#step3Back")?.addEventListener("click", () => { this.step = 2; this.drawStep(); });
    this.el.querySelector("#step3Next")?.addEventListener("click", () => {
      this.data.questions = this.data.questions.map((_, i) => ({
        question: (this.el.querySelector<HTMLSelectElement>(`#q${i}`))?.value ?? "",
        answer: (this.el.querySelector<HTMLInputElement>(`#a${i}`))?.value.trim() ?? "",
      }));
      if (this.data.questions.some(q => !q.answer)) {
        this.showError("step3Error", t("profile.allAnswersRequired")); return;
      }
      this.step = 4; this.drawStep();
    });
  }

  private async drawStep4(): Promise<void> {
    this.data.masterKey = await invoke<string>("generate_master_key");
    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepMasterKey"))}
        <div class="admin-step-body">
          <div class="master-key-warning">⚠️ ${t("profile.masterKeyWarning")}</div>
          <div class="master-key-display">${this.data.masterKey}</div>
          <div class="master-key-actions">
            <button class="profile-btn-secondary" id="copyKey">📋 ${t("profile.copy")}</button>
            <button class="profile-btn-secondary" id="downloadKey">⬇️ ${t("profile.download")}</button>
          </div>
          <label class="profile-checkbox-label">
            <input type="checkbox" id="keySaved" />
            ${t("profile.masterKeySaved")}
          </label>
          <div id="step4Error" class="profile-error hidden"></div>
          <div class="step-nav-row">
            <button class="profile-btn-secondary" id="step4Back">← ${t("profile.back")}</button>
            <button class="profile-btn-primary" id="step4Next">${t("profile.next")} →</button>
          </div>
        </div>
      </div>`;

    this.el.querySelector("#copyKey")?.addEventListener("click", () => {
      navigator.clipboard.writeText(this.data.masterKey).catch(() => {});
    });
    this.el.querySelector("#downloadKey")?.addEventListener("click", () => {
      const blob = new Blob([`AI Widget - Clé Maître Admin

${this.data.masterKey}

Gardez cette clé en lieu sûr.`], {type:"text/plain"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "aiwidget-master-key.txt";
      a.click();
    });
    this.el.querySelector("#step4Back")?.addEventListener("click", () => { this.step = 3; this.drawStep(); });
    this.el.querySelector("#step4Next")?.addEventListener("click", () => {
      if (!(this.el.querySelector<HTMLInputElement>("#keySaved"))?.checked) {
        this.showError("step4Error", t("profile.mustSaveMasterKey")); return;
      }
      this.step = 5; void this.drawStep5();
    });
  }

  private async drawStep5(): Promise<void> {
    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepConfirm"))}
        <div class="admin-step-body">
          <div class="creation-summary">
            <div class="summary-item">✅ ${t("profile.summaryUsername")}: <strong>${this.data.username}</strong></div>
            <div class="summary-item">✅ ${t("profile.summaryPassword")}</div>
            <div class="summary-item">✅ ${t("profile.summaryQuestions")}</div>
            <div class="summary-item">✅ ${t("profile.summaryMasterKey")}</div>
            <div class="summary-item">🛡️ ${t("profile.role")}: <strong>${t("profile.admin")}</strong></div>
          </div>
          <div id="step5Error" class="profile-error hidden"></div>
          <button class="profile-btn-primary profile-btn-large" id="createAdminBtn">
            ${t("profile.finishSetup")} →
          </button>
        </div>
      </div>`;

    this.el.querySelector("#createAdminBtn")?.addEventListener("click", async () => {
      const btn = this.el.querySelector<HTMLButtonElement>("#createAdminBtn")!;
      btn.disabled = true;
      btn.textContent = t("profile.creating");
      try {
        // 1 — Create the admin profile in Rust
        const profile = await invoke<ProfilePublic>("create_admin_profile", {
          username: this.data.username,
          password: this.data.password,
          secretQuestions: this.data.questions,
          masterKey: this.data.masterKey,
          avatarColor: this.data.color,
        });
        // 2 — Upload avatar photo if provided
        if (this.data.avatarBytes && this.data.avatarBytes.length > 0) {
          try {
            await invoke("upload_avatar", {
              profileId: profile.id,
              fileBytes: this.data.avatarBytes,
              extension: this.data.avatarExt,
            });
          } catch { /* avatar optional */ }
        }
        // 3 — Auto-login: opens the DB, sets active profile in backend
        const logged = await invoke<ProfilePublic>("login", {
          profileId: profile.id,
          password: this.data.password,
        });
        this.loggedProfile = logged;
        // 4 — Go to onboarding steps
        this.step = 6; this.drawStep();
      } catch (e) {
        const errEl = this.el.querySelector<HTMLElement>("#step5Error");
        if (errEl) { errEl.textContent = String(e); errEl.classList.remove("hidden"); }
        btn.disabled = false;
        btn.textContent = t("profile.finishSetup");
      }
    });
  }

  // ── Step 6: Language selection ──────────────────────────────────────────────
  private drawStep6(): void {
    const langs = [
      { code: "fr", flag: "🇫🇷", label: "Français" },
      { code: "en", flag: "🇬🇧", label: "English" },
      { code: "ar", flag: "🇸🇦", label: "العربية" },
    ];
    const current = localStorage.getItem("aiwidget_ui_lang") || "fr";

    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepLanguage"))}
        <div class="admin-step-body">
          <p class="profile-hint">${t("profile.chooseLanguage")}</p>
          <div class="lang-cards-row">
            ${langs.map(l => `
              <button class="lang-card ${l.code === current ? "selected" : ""}" data-lang="${l.code}">
                <span class="lang-card-flag">${l.flag}</span>
                <span class="lang-card-label">${l.label}</span>
              </button>`).join("")}
          </div>
          <button class="profile-btn-primary profile-btn-large" id="step6Next" style="margin-top:20px">
            ${t("profile.next")} →
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

    this.el.querySelector("#step6Next")?.addEventListener("click", () => {
      localStorage.removeItem("aiwidget_onboarded");
      this.onDone(this.loggedProfile!);
    });
  }

  // ── Step 7: LLM model setup ─────────────────────────────────────────────────
  private async drawStep7(): Promise<void> {
    this.el.innerHTML = `
      <div class="profile-screen admin-creation-screen">
        ${this.stepHeader(t("profile.stepLLM"))}
        <div class="admin-step-body">
          <div id="llmLoading" class="llm-loading">⏳ ${t("profile.detectingModels")}…</div>
          <div id="llmContent" class="hidden"></div>
        </div>
      </div>`;

    let installedModels: { name: string }[] = [];
    let ollamaModels: { name: string }[] = [];

    try { installedModels = await invoke<{ name: string }[]>("list_installed_gguf_models"); } catch { installedModels = []; }
    try { ollamaModels = await invoke<{ name: string }[]>("list_llm_models", { url: "http://localhost:11434" }); } catch { ollamaModels = []; }

    const allModels = [
      ...ollamaModels.map(m => ({ name: m.name, type: "Ollama" })),
      ...installedModels.map(m => ({ name: m.name, type: "GGUF" })),
    ];

    const loading = this.el.querySelector<HTMLElement>("#llmLoading")!;
    const content = this.el.querySelector<HTMLElement>("#llmContent")!;
    loading.classList.add("hidden");
    content.classList.remove("hidden");

    if (allModels.length === 0) {
      content.innerHTML = `
        <div class="llm-no-models">
          <div class="llm-no-models-icon">🤖</div>
          <p>${t("profile.noModelsInstalled")}</p>
          <p class="profile-hint">${t("profile.configureInSettings")}</p>
        </div>
        <button class="profile-btn-primary profile-btn-large" id="llmSkip">${t("profile.enterApp")} →</button>`;
    } else {
      let selected = allModels[0].name;
      content.innerHTML = `
        <p class="profile-hint">${t("profile.llmSetupAdmin")}</p>
        <div class="llm-model-list">
          ${allModels.map(m => `
            <label class="llm-model-item">
              <input type="radio" name="llmModel" value="${m.name}" ${m.name === selected ? "checked" : ""} />
              <span class="llm-model-name">${m.name}</span>
              <span class="llm-model-badge">${m.type}</span>
            </label>`).join("")}
        </div>
        <div id="llmMsg" class="hidden"></div>
        <button class="profile-btn-primary profile-btn-large" id="llmDone">${t("profile.enterApp")} →</button>`;

      content.querySelectorAll<HTMLInputElement>("input[name=llmModel]").forEach(r => {
        r.addEventListener("change", () => { selected = r.value; });
      });

      content.querySelector("#llmDone")?.addEventListener("click", async () => {
        const btn = content.querySelector<HTMLButtonElement>("#llmDone")!;
        btn.disabled = true;
        try {
          // Save default model to settings
          const settings = await invoke<Record<string, unknown>>("get_settings");
          await invoke("save_settings", { ...settings, defaultModel: selected });
        } catch { /* ignore — user can set in Settings */ }
        this.onDone(this.loggedProfile!);
      });
      return; // event binding done, skip the skip-button handler below
    }

    content.querySelector("#llmSkip")?.addEventListener("click", () => {
      this.onDone(this.loggedProfile!);
    });
  }

  private showError(id: string, msg: string): void {
    const el = this.el.querySelector<HTMLElement>(`#${id}`);
    if (el) { el.textContent = msg; el.classList.remove("hidden"); }
  }
}
