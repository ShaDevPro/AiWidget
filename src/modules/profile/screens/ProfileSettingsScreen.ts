/**
 * ProfileSettingsScreen — Change username, password, avatar.
 * + Self-service: delete all conversations, delete account.
 * i18n + modular.
 */
import { invoke } from "@tauri-apps/api/tauri";
import { t } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

export class ProfileSettingsScreen {
  private avatarDataUrl = "";
  private newAvatarBytes: number[] | null = null;
  private newAvatarExt = "png";

  constructor(
    private el: HTMLElement,
    private profile: ProfilePublic,
    private onClose: () => void,
    private onLogout: () => void,
  ) {}

  render(): void {
    this.el.addEventListener("lang-changed", () => this.render());
    void this.loadAndDraw();
  }

  private async loadAndDraw(): Promise<void> {
    // Load avatar as data URL
    if (this.profile.has_avatar) {
      try {
        this.avatarDataUrl = await invoke<string>("get_avatar_data_url", { profileId: this.profile.id });
      } catch { this.avatarDataUrl = ""; }
    }
    this.draw();
  }

  private draw(): void {
    const initial = this.profile.username[0].toUpperCase();
    const avatarHtml = this.avatarDataUrl
      ? `<img src="${this.avatarDataUrl}" class="settings-avatar-img" />`
      : `<div class="settings-avatar-circle" style="background:${this.profile.avatar_color}">${initial}</div>`;

    this.el.innerHTML = `
      <div class="profile-screen settings-screen">
        <div class="admin-creation-header">
          <h2 class="admin-step-title">⚙️ ${t("profile.settings")}</h2>
          <p class="admin-step-subtitle">${this.profile.username}</p>
        </div>

        <div class="admin-step-body">
          <!-- Avatar -->
          <div class="avatar-upload-section">
            <label>${t("profile.avatar")}</label>
            <div id="settingsAvatarPreview" class="avatar-clickable">
              ${avatarHtml}
            </div>
            <input type="file" id="settingsAvatarFile" accept=".png,.jpg,.jpeg,.webp" class="hidden" />
            <button class="profile-btn-secondary avatar-upload-btn" id="settingsUploadBtn">
              📷 ${t("profile.uploadPhoto")}
            </button>
          </div>

          <!-- Change username -->
          <div class="settings-section">
            <h3>${t("profile.changeUsername")}</h3>
            <div class="profile-input-group">
              <input type="text" id="newUsername" class="profile-input"
                value="${this.profile.username}" maxlength="20" />
            </div>
            <button class="profile-btn-secondary" id="saveUsernameBtn">${t("profile.save")}</button>
          </div>

          <!-- Change password -->
          <div class="settings-section">
            <h3>${t("profile.changePassword")}</h3>
            <div class="profile-input-group">
              <input type="password" id="currentPwd" class="profile-input"
                placeholder="${t("profile.currentPassword")}" />
            </div>
            <div class="profile-input-group">
              <input type="password" id="newPwd" class="profile-input"
                placeholder="${t("profile.newPassword")}" />
            </div>
            <button class="profile-btn-secondary" id="savePwdBtn">${t("profile.save")}</button>
          </div>

          <div id="settingsMsg" class="hidden"></div>

          <!-- Danger zone -->
          <div class="danger-zone">
            <div class="form-section-title" style="color:#dc2626">${t("profile.dangerZone")}</div>
            <button class="profile-btn-danger" id="clearConvsBtn">
              🗑 ${t("profile.clearMyConversations")}
            </button>
            <button class="profile-btn-danger profile-btn-danger-strong" id="deleteAccountBtn">
              ✕ ${t("profile.deleteMyAccount")}
            </button>
          </div>

          <button class="profile-btn-secondary" id="settingsCloseBtn">← ${t("profile.back")}</button>
        </div>
      </div>`;

    this.bindEvents();
  }

  private bindEvents(): void {
    // Avatar upload
    const fileInput = this.el.querySelector<HTMLInputElement>("#settingsAvatarFile")!;
    const openPicker = () => fileInput.click();
    this.el.querySelector("#settingsUploadBtn")?.addEventListener("click", openPicker);
    this.el.querySelector("#settingsAvatarPreview")?.addEventListener("click", openPicker);
    fileInput.addEventListener("change", async () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      const buf = await file.arrayBuffer();
      this.newAvatarBytes = Array.from(new Uint8Array(buf));
      this.newAvatarExt = file.name.split(".").pop() ?? "png";
      if (this.avatarDataUrl) URL.revokeObjectURL(this.avatarDataUrl);
      this.avatarDataUrl = URL.createObjectURL(file);
      // Update preview immediately
      const preview = this.el.querySelector<HTMLElement>("#settingsAvatarPreview");
      if (preview) preview.innerHTML = `<img src="${this.avatarDataUrl}" class="settings-avatar-img" />`;
      // Auto-save avatar
      try {
        await invoke("upload_avatar", {
          profileId: this.profile.id,
          fileBytes: this.newAvatarBytes,
          extension: this.newAvatarExt,
        });
        this.showMsg(t("profile.avatarSaved"), "success");
      } catch (e) { this.showMsg(String(e), "error"); }
    });

    // Save username
    this.el.querySelector("#saveUsernameBtn")?.addEventListener("click", async () => {
      const val = (this.el.querySelector<HTMLInputElement>("#newUsername"))?.value.trim();
      if (!val) return;
      try {
        await invoke("update_profile", { profileId: this.profile.id, username: val });
        this.profile = { ...this.profile, username: val };
        this.showMsg(t("profile.saved"), "success");
      } catch (e) { this.showMsg(String(e), "error"); }
    });

    // Save password
    this.el.querySelector("#savePwdBtn")?.addEventListener("click", async () => {
      const cur = (this.el.querySelector<HTMLInputElement>("#currentPwd"))?.value;
      const nw = (this.el.querySelector<HTMLInputElement>("#newPwd"))?.value;
      if (!cur || !nw) { this.showMsg(t("profile.allFieldsRequired"), "error"); return; }
      try {
        await invoke("update_profile", { profileId: this.profile.id, currentPassword: cur, newPassword: nw });
        this.showMsg(t("profile.passwordChanged"), "success");
        (this.el.querySelector<HTMLInputElement>("#currentPwd"))!.value = "";
        (this.el.querySelector<HTMLInputElement>("#newPwd"))!.value = "";
      } catch (e) { this.showMsg(String(e), "error"); }
    });

    // Clear my conversations
    this.el.querySelector("#clearConvsBtn")?.addEventListener("click", async () => {
      if (!confirm(t("profile.confirmClearMyConversations"))) return;
      try {
        await invoke("clear_my_conversations");
        this.showMsg(t("profile.conversationsCleared"), "success");
      } catch (e) { this.showMsg(String(e), "error"); }
    });

    // Delete my account
    this.el.querySelector("#deleteAccountBtn")?.addEventListener("click", async () => {
      const pwd = prompt(t("profile.confirmDeleteAccountPwd"));
      if (!pwd) return;
      if (!confirm(t("profile.confirmDeleteAccountFinal"))) return;
      try {
        await invoke("delete_my_account", { password: pwd });
        this.onLogout();
      } catch (e) { this.showMsg(String(e), "error"); }
    });

    // Close
    this.el.querySelector("#settingsCloseBtn")?.addEventListener("click", () => this.onClose());
  }

  private showMsg(msg: string, type: "success" | "error"): void {
    const el = this.el.querySelector<HTMLElement>("#settingsMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = type === "success" ? "profile-success" : "profile-error";
    setTimeout(() => el.classList.add("hidden"), 3500);
  }
}
