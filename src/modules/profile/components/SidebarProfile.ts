import { invoke } from "@tauri-apps/api/tauri";
import { t } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

export class SidebarProfile {
  private el: HTMLElement | null = null;
  private isOpen = false;

  constructor(
    private container: HTMLElement,
    private profile: ProfilePublic,
    private onSettings: () => void,
    private onLogout: () => void,
    private onAdminPanel?: () => void,
    private onLaunchOnboarding?: () => void,
  ) {}

  render(): void {
    this.el?.remove();
    const div = document.createElement("div");
    div.className = "sidebar-profile-block";

    const initial = this.profile.username[0].toUpperCase();

    div.innerHTML = `
      <div class="sidebar-profile-card" id="sidebarProfileTrigger" role="button" tabindex="0" title="${this.profile.username}">
        <div class="sidebar-avatar-circle" id="sidebarAvatarEl"
          style="background:${this.profile.avatar_color}">${initial}</div>
        <div class="sidebar-profile-text">
          <span class="sidebar-profile-name">${this.profile.username}</span>
          ${this.profile.role === "admin"
            ? `<span class="sidebar-profile-badge">${t("profile.admin")}</span>`
            : ""}
        </div>
        <span class="sidebar-profile-chevron">▾</span>
      </div>

      <div class="sidebar-profile-popover" id="sidebarProfilePopover">
        <button class="sp-menu-item" id="profileSettingsBtn">
          <span class="sp-menu-icon">⚙️</span>
          <span class="sp-menu-text">${t("profile.profileSettings")}</span>
        </button>
        ${this.onLaunchOnboarding ? `
        <button class="sp-menu-item" id="onboardingLaunchBtn">
          <span class="sp-menu-icon">🚀</span>
          <span class="sp-menu-text">${t("onboarding.relaunchBtn")}</span>
        </button>` : ""}
        ${this.profile.role === "admin" && this.onAdminPanel ? `
        <button class="sp-menu-item" id="adminPanelBtn">
          <span class="sp-menu-icon">🛡️</span>
          <span class="sp-menu-text">${t("profile.adminPanel")}</span>
        </button>` : ""}
        <div class="sp-menu-divider"></div>
        <button class="sp-menu-item sp-menu-logout" id="logoutBtn">
          <span class="sp-menu-icon">🚪</span>
          <span class="sp-menu-text">${t("profile.logout")}</span>
        </button>
      </div>`;

    const trigger = div.querySelector<HTMLElement>("#sidebarProfileTrigger");

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.togglePopover();
    });

    div.querySelector("#profileSettingsBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePopover();
      this.onSettings();
    });

    div.querySelector("#onboardingLaunchBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePopover();
      this.onLaunchOnboarding?.();
    });

    div.querySelector("#adminPanelBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePopover();
      this.onAdminPanel?.();
    });

    div.querySelector("#logoutBtn")?.addEventListener("click", (e) => {
      e.stopPropagation();
      this.closePopover();
      this.onLogout();
    });

    document.addEventListener("click", (e) => {
      if (this.isOpen && !div.contains(e.target as Node)) {
        this.closePopover();
      }
    });

    this.container.insertBefore(div, this.container.firstChild);
    this.el = div;

    // Async: load avatar and patch the DOM element
    if (this.profile.has_avatar) {
      void invoke<string>("get_avatar_data_url", { profileId: this.profile.id })
        .then((dataUrl) => {
          const avatarEl = div.querySelector("#sidebarAvatarEl");
          if (avatarEl && dataUrl) {
            const img = document.createElement("img");
            img.src = dataUrl;
            img.className = "sidebar-avatar-img";
            img.alt = this.profile.username;
            avatarEl.replaceWith(img);
          }
        })
        .catch(() => { /* keep initials on error */ });
    }
  }

  private togglePopover(): void {
    if (this.isOpen) this.closePopover();
    else this.openPopover();
  }

  private openPopover(): void {
    this.isOpen = true;
    const trigger = this.el?.querySelector<HTMLElement>("#sidebarProfileTrigger");
    const popover = this.el?.querySelector<HTMLElement>("#sidebarProfilePopover");
    trigger?.classList.add("active");
    popover?.classList.add("open");
  }

  private closePopover(): void {
    this.isOpen = false;
    const trigger = this.el?.querySelector<HTMLElement>("#sidebarProfileTrigger");
    const popover = this.el?.querySelector<HTMLElement>("#sidebarProfilePopover");
    trigger?.classList.remove("active");
    popover?.classList.remove("open");
  }

  updateProfile(profile: ProfilePublic): void {
    this.profile = profile;
    this.render();
  }

  detach(): void {
    this.el?.remove();
    this.el = null;
  }
}
