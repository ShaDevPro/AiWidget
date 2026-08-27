/**
 * ProfileModule — Multi-user profile system orchestrator.
 * Manages login screen, admin creation, profile switching, logout.
 * Modular, i18n FR/EN/AR. Light theme only.
 */
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow, LogicalSize } from "@tauri-apps/api/window";
import { t } from "../../i18n";
import { LoginScreen } from "./screens/LoginScreen";
import { AdminCreationScreen } from "./screens/AdminCreationScreen";
import { CreateProfileScreen } from "./screens/CreateProfileScreen";
import { RecoveryScreen } from "./screens/RecoveryScreen";
import { AdminPanelScreen } from "./screens/AdminPanelScreen";
import { ProfileSettingsScreen } from "./screens/ProfileSettingsScreen";
import { SidebarProfile } from "./components/SidebarProfile";

export interface ProfilePublic {
  id: string;
  username: string;
  role: string;
  avatar_path: string | null;
  avatar_color: string;
  created_at: string;
  has_avatar: boolean;
  is_banned: boolean;
}

// Window size for profile screens (login / onboarding)
const PROFILE_WINDOW_W = 520;
const PROFILE_WINDOW_H = 680;

export class ProfileModule {
  private overlay: HTMLElement | null = null;
  private activeProfile: ProfilePublic | null = null;
  private onLoginCallback: ((profile: ProfilePublic) => void) | null = null;
  private onLogoutCallback: (() => void) | null = null;
  public onLaunchOnboarding: (() => void) | null = null;
  private sidebarProfile: SidebarProfile | null = null;

  // Called by App.ts on startup
  async init(onLogin: (p: ProfilePublic) => void, onLogout: () => void): Promise<void> {
    this.onLoginCallback = onLogin;
    this.onLogoutCallback = onLogout;

    // Center + resize BEFORE showing any screen (prevents top-left flash)
    await this.expandForProfile();

    const isFirst = await invoke<boolean>("is_first_launch");
    if (isFirst) {
      this.showAdminCreation();
    } else {
      this.showLogin();
    }
  }

  // ── Window resize helpers ─────────────────────────────────────────

  private async expandForProfile(): Promise<void> {
    try {
      await appWindow.setSize(new LogicalSize(PROFILE_WINDOW_W, PROFILE_WINDOW_H));
      await appWindow.center();
      await appWindow.setResizable(false);
    } catch { /* ignore */ }
  }

  private async restoreWidgetSize(): Promise<void> {
    try {
      await appWindow.setResizable(true);
      // App.ts will handle the proper widget sizing after login
    } catch { /* ignore */ }
  }

  // ── Overlay management ────────────────────────────────────────────

  /**
   * Creates the overlay with chrome elements (drag bar, close button, lang toggle).
   * Returns the CONTENT area div — screens render into this, never touching chrome.
   * This prevents innerHTML overwrites from wiping the drag bar / close button.
   */
  /**
   * requiresAuth=true  → used for login/signup overlays (no user logged in).
   *   ✕ closes the ENTIRE app — prevents exposing the app without a session.
   * requiresAuth=false → used for settings/admin panel (user already logged in).
   *   ✕ closes the overlay only and returns to the running app.
   */
  private createOverlay(requiresAuth = true): HTMLElement {
    if (this.overlay) this.overlay.remove();

    const overlay = document.createElement("div");
    overlay.className = "profile-overlay";

    // ── Chrome row: drag region + close button (never overwritten) ──
    const dragBar = document.createElement("div");
    dragBar.setAttribute("data-tauri-drag-region", "");
    dragBar.className = "profile-drag-bar";
    overlay.appendChild(dragBar);

    const closeBtn = document.createElement("button");
    closeBtn.className = "profile-overlay-close";
    closeBtn.innerHTML = "&#x2715;";
    closeBtn.title = "Fermer";
    if (requiresAuth) {
      // No session active → closing means quitting the app
      closeBtn.addEventListener("click", () => { void appWindow.close(); });
    } else {
      // Session active → closing means returning to the app
      closeBtn.addEventListener("click", () => { this.closeOverlay(); });
    }
    dragBar.appendChild(closeBtn);

    // ── Content area — screens render here via innerHTML ────────────
    const content = document.createElement("div");
    content.className = "profile-content-area";
    overlay.appendChild(content);

    // ── Language toggle bar (bottom, never overwritten) ─────────────
    const langBar = document.createElement("div");
    langBar.className = "profile-lang-bar";
    const LS_KEY = "aiwidget_ui_lang";
    const currentLang = localStorage.getItem(LS_KEY) || this.detectBrowserLang();
    const langs = [
      { code: "fr", label: "FR" },
      { code: "en", label: "EN" },
      { code: "ar", label: "عر" },
    ];
    langs.forEach(({ code, label }) => {
      const btn = document.createElement("button");
      btn.className = `profile-lang-btn ${code === currentLang ? "active" : ""}`;
      btn.textContent = label;
      btn.addEventListener("click", async () => {
        localStorage.setItem(LS_KEY, code);
        const { initI18n } = await import("../../i18n");
        await initI18n(code);
        langBar.querySelectorAll(".profile-lang-btn").forEach(b => b.classList.remove("active"));
        btn.classList.add("active");
        content.dispatchEvent(new CustomEvent("lang-changed", { detail: code, bubbles: true }));
      });
      langBar.appendChild(btn);
    });
    overlay.appendChild(langBar);

    document.body.appendChild(overlay);
    this.overlay = overlay;

    // Return CONTENT area (not overlay) so screens never touch chrome
    return content;
  }

  private detectBrowserLang(): string {
    const nav = navigator.language?.split("-")[0].toLowerCase() ?? "fr";
    return ["fr", "en", "ar"].includes(nav) ? nav : "fr";
  }

  private closeOverlay(): void {
    this.overlay?.remove();
    this.overlay = null;
    void this.restoreWidgetSize();
  }

  // ── Screens ───────────────────────────────────────────────────────

  showAdminCreation(): void {
    const el = this.createOverlay();
    const screen = new AdminCreationScreen(el, (profile) => {
      this.closeOverlay();
      this.handleLoginSuccess(profile);
    });
    screen.render();
  }

  showLogin(): void {
    const el = this.createOverlay();
    const screen = new LoginScreen(
      el,
      (profile) => { this.closeOverlay(); this.handleLoginSuccess(profile); },
      () => { this.closeOverlay(); this.showAdminCreation(); },
      () => { this.showCreateProfile(el); },
      () => { this.closeOverlay(); this.showRecovery(); },
    );
    screen.render();
  }

  showCreateProfile(parentEl: HTMLElement): void {
    const el = this.createOverlay();
    const screen = new CreateProfileScreen(
      el,
      () => { this.closeOverlay(); this.showLogin(); },
      () => { this.closeOverlay(); this.showLogin(); },
    );
    screen.render();
  }

  showRecovery(): void {
    const el = this.createOverlay();
    const screen = new RecoveryScreen(
      el,
      () => { this.closeOverlay(); this.showLogin(); },
    );
    screen.render();
  }

  showProfileSettings(): void {
    if (!this.activeProfile) return;
    const el = this.createOverlay(false); // user logged in → ✕ returns to app
    const screen = new ProfileSettingsScreen(
      el,
      this.activeProfile,
      () => {
        // Just close overlay → user returns to the app normally
        this.closeOverlay();
      },
      () => {
        // Delete account → logout
        this.closeOverlay();
        void this.handleLogout();
      },
    );
    screen.render();
  }

  showAdminPanel(profile: ProfilePublic): void {
    const el = this.createOverlay(false); // user logged in → ✕ returns to app
    const screen = new AdminPanelScreen(
      el,
      profile,
      () => {
        this.closeOverlay();
        // Restore normal widget size after closing dashboard
        void import("@tauri-apps/api/window").then(({ appWindow, LogicalSize }) =>
          appWindow.setSize(new LogicalSize(520, 680)).then(() => appWindow.center())
        );
      },
    );
    void screen.render();
  }

  // ── Login / Logout ────────────────────────────────────────────────

  private handleLoginSuccess(profile: ProfilePublic): void {
    this.activeProfile = profile;
    this.onLoginCallback?.(profile);
    // Sidebar will be attached after App.ts renders the expanded UI
  }

  attachSidebar(containerEl: HTMLElement): void {
    if (!this.activeProfile) return;
    if (this.sidebarProfile) {
      this.sidebarProfile.detach();
    }
    this.sidebarProfile = new SidebarProfile(
      containerEl,
      this.activeProfile,
      () => this.showProfileSettings(),
      () => this.handleLogout(),
      this.activeProfile.role === "admin"
        ? () => this.showAdminPanel(this.activeProfile!)
        : undefined,
      this.onLaunchOnboarding ? () => this.onLaunchOnboarding!() : undefined,
    );
    this.sidebarProfile.render();
  }

  private updateSidebarProfile(): void {
    if (!this.activeProfile || !this.sidebarProfile) return;
    this.sidebarProfile.updateProfile(this.activeProfile);
  }

  private async handleLogout(): Promise<void> {
    try {
      await invoke("logout");
    } catch { /* ignore */ }
    this.activeProfile = null;
    this.sidebarProfile?.detach();
    this.sidebarProfile = null;
    this.onLogoutCallback?.();
    this.showLogin();
  }

  getActiveProfile(): ProfilePublic | null {
    return this.activeProfile;
  }
}
