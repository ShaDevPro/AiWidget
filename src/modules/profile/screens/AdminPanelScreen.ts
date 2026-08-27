/**
 * AdminPanelScreen — Enterprise Admin Dashboard.
 * 4 Dedicated Administration Tabs:
 *   1. 👥 Utilisateurs & Profils (Comptes, Modération, Rôles)
 *   2. 🏢 Serveur Réseau & Cluster IA (Mode PRO, URL, Jeton, Ping, Modèles Distants)
 *   3. ⚡ Quotas Journaliers (Limites de requêtes pour les utilisateurs standards)
 *   4. 🔑 Licence Entreprise & Générateur IT (HWID, Déblocage PRO, Générateur de clés multi-postes)
 * i18n FR/EN/AR. Light theme only.
 */
import { invoke } from "@tauri-apps/api/tauri";
import { appWindow, LogicalSize } from "@tauri-apps/api/window";
import { t } from "../../../i18n";
import { ProfilePublic } from "../ProfileModule";

interface UserStats {
  id: string;
  username: string;
  role: string;
  avatar_color: string;
  has_avatar: boolean;
  created_at: string;
  is_banned: boolean;
}

interface AppSettingsData {
  language: string;
  ollama_base_url: string;
  temperature: number;
  max_tokens: number;
  default_model: string;
  theme: string;
  execution_mode: string;
  server_url: string;
  server_auth_token: string;
}

interface LicenseStatusData {
  is_licensed: boolean;
  tier: string;
  hwid: string;
  license_key?: string | null;
  activated_at?: string | null;
  company?: string | null;
}

interface QuotaData {
  profile_id: string;
  is_admin: boolean;
  daily_limit: number;
  used_today: number;
  remaining_today: number;
  is_exceeded: boolean;
}

export class AdminPanelScreen {
  private activeTab: 'users' | 'server' | 'quotas' | 'license' = 'users';
  private users: UserStats[] = [];
  private avatarUrls: Record<string, string> = {};
  private searchQuery = "";
  private adminPwd = "";
  private selectedUserId: string | null = null;

  private settings: AppSettingsData | null = null;
  private licenseStatus: LicenseStatusData | null = null;
  private quota: QuotaData | null = null;
  private serverPingResult: { ok: boolean; message: string } | null = null;
  private generatedAdminKey: string | null = null;

  constructor(
    private el: HTMLElement,
    private adminProfile: ProfilePublic,
    private onClose: () => void,
  ) {}

  async render(): Promise<void> {
    try {
      await appWindow.setSize(new LogicalSize(980, 700));
      await appWindow.center();
    } catch { /* ignore */ }
    this.el.addEventListener("lang-changed", () => void this.draw());
    await this.loadData();
    await this.draw();
  }

  private async loadData(): Promise<void> {
    try { this.users = await invoke<UserStats[]>("list_profiles"); }
    catch { this.users = []; }

    for (const u of this.users) {
      if (u.has_avatar && !this.avatarUrls[u.id]) {
        try { this.avatarUrls[u.id] = await invoke<string>("get_avatar_data_url", { profileId: u.id }); }
        catch { /* initials fallback */ }
      }
    }

    try { this.settings = await invoke<AppSettingsData>("get_settings"); }
    catch { this.settings = null; }

    try { this.licenseStatus = await invoke<LicenseStatusData>("get_license_status"); }
    catch { this.licenseStatus = null; }

    try { this.quota = await invoke<QuotaData>("get_user_quota"); }
    catch { this.quota = null; }
  }

  private avatarHtml(u: UserStats, size = 36): string {
    const url = this.avatarUrls[u.id];
    if (url) return `<img src="${url}" class="dash-avatar-img" style="width:${size}px;height:${size}px" />`;
    const initials = u.username.slice(0, 2).toUpperCase();
    return `<div class="dash-avatar-circle" style="width:${size}px;height:${size}px;background:${u.avatar_color};font-size:${Math.round(size*0.4)}px">${initials}</div>`;
  }

  private async draw(): Promise<void> {
    const allUsers   = this.users;
    const others     = allUsers.filter(u => u.id !== this.adminProfile.id);
    const total      = allUsers.length;
    const admins     = allUsers.filter(u => u.role === "admin").length;
    const regular    = allUsers.filter(u => u.role !== "admin").length;
    const banned     = allUsers.filter(u => u.is_banned).length;

    const q = this.searchQuery.toLowerCase();
    const filtered = others.filter(u =>
      u.username.toLowerCase().includes(q) || u.role.toLowerCase().includes(q)
    );

    const adminAvatar = this.adminProfile.has_avatar && this.avatarUrls[this.adminProfile.id]
      ? `<img src="${this.avatarUrls[this.adminProfile.id]}" class="dash-me-avatar-img" />`
      : `<div class="dash-me-avatar" style="background:${this.adminProfile.avatar_color}">${this.adminProfile.username[0].toUpperCase()}</div>`;

    const sel = this.selectedUserId;

    const userRows = filtered.length === 0
      ? `<div class="dash-empty-row">${t("profile.noOtherUsers")}</div>`
      : filtered.map(u => `
          <div class="dash-user-card ${u.is_banned ? "dash-user-card-banned" : ""} ${sel === u.id ? "dash-user-card-selected" : ""}"
               data-uid="${u.id}">
            <div class="dash-user-card-left">
              ${this.avatarHtml(u, 44)}
              <div class="dash-user-card-info">
                <div class="dash-user-card-name">
                  ${u.username}
                  ${u.is_banned ? `<span class="dash-banned-badge">🚫 ${t("profile.banned")}</span>` : ""}
                </div>
                <div class="dash-user-card-meta">
                  <span class="dash-role-badge role-${u.role}">${u.role}</span>
                  <span class="dash-user-card-date">${u.created_at ? new Date(u.created_at).toLocaleDateString() : ""}</span>
                </div>
              </div>
            </div>
            <button class="dash-user-expand-btn" data-uid="${u.id}" title="${t("profile.manageUser")}">
              ${sel === u.id ? "▲" : "▼"} ${t("profile.actions")}
            </button>
          </div>
          ${sel === u.id ? `
          <div class="dash-user-actions-panel">
            <div class="dash-action-grid">
              <button class="dash-action-btn dash-action-clear" data-id="${u.id}">
                <span class="dash-action-icon">🗑</span>
                <span class="dash-action-label">${t("profile.clearConversations")}</span>
                <span class="dash-action-desc">${t("profile.clearConversationsDesc")}</span>
              </button>
              <button class="dash-action-btn ${u.is_banned ? "dash-action-unban" : "dash-action-ban"}"
                data-id="${u.id}" data-banned="${u.is_banned}">
                <span class="dash-action-icon">${u.is_banned ? "✅" : "🚫"}</span>
                <span class="dash-action-label">${u.is_banned ? t("profile.unban") : t("profile.ban")}</span>
                <span class="dash-action-desc">${u.is_banned ? t("profile.unbanDesc") : t("profile.banDesc")}</span>
              </button>
              <button class="dash-action-btn dash-action-delete" data-id="${u.id}" data-name="${u.username}">
                <span class="dash-action-icon">🗑</span>
                <span class="dash-action-label">${t("profile.deleteUser")}</span>
                <span class="dash-action-desc">${t("profile.deleteUserDesc")}</span>
              </button>
            </div>
          </div>` : ""}
        `).join("");

    this.el.innerHTML = `
      <div class="admin-dashboard">
        <!-- Top bar -->
        <div class="dash-topbar">
          <div class="dash-topbar-left">
            <div class="dash-logo">🛡️ AI Widget</div>
            <div class="dash-topbar-title">Panneau d'Administration Entreprise</div>
          </div>
          <div class="dash-topbar-right">
            ${adminAvatar}
            <div class="dash-me-info">
              <div class="dash-me-name">${this.adminProfile.username}</div>
              <div class="dash-me-role">ADMINISTRATEUR MAÎTRE</div>
            </div>
          </div>
        </div>

        <!-- Tab Bar Navigation -->
        <div class="dash-nav-tabs">
          <button class="dash-nav-tab ${this.activeTab === 'users' ? 'active' : ''}" data-tab="users">
            👥 Utilisateurs & Profils
          </button>
          <button class="dash-nav-tab ${this.activeTab === 'server' ? 'active' : ''}" data-tab="server">
            🏢 Serveur Réseau <span class="dash-tab-badge pro">PRO</span>
          </button>
          <button class="dash-nav-tab ${this.activeTab === 'quotas' ? 'active' : ''}" data-tab="quotas">
            ⚡ Quotas Journaliers
          </button>
          <button class="dash-nav-tab ${this.activeTab === 'license' ? 'active' : ''}" data-tab="license">
            🔑 Licence Entreprise & Clés
          </button>
        </div>

        <!-- ── TAB 1: USERS ── -->
        ${this.activeTab === 'users' ? `
          <!-- Stats row -->
          <div class="dash-stats-row">
            <div class="dash-stat-card stat-blue">
              <div class="dash-stat-icon">👥</div>
              <div class="dash-stat-value">${total}</div>
              <div class="dash-stat-label">${t("profile.totalUsers")}</div>
            </div>
            <div class="dash-stat-card stat-gold">
              <div class="dash-stat-icon">🛡️</div>
              <div class="dash-stat-value">${admins}</div>
              <div class="dash-stat-label">${t("profile.adminCount")}</div>
            </div>
            <div class="dash-stat-card stat-green">
              <div class="dash-stat-icon">👤</div>
              <div class="dash-stat-value">${regular}</div>
              <div class="dash-stat-label">${t("profile.userCount")}</div>
            </div>
            <div class="dash-stat-card stat-red">
              <div class="dash-stat-icon">🚫</div>
              <div class="dash-stat-value">${banned}</div>
              <div class="dash-stat-label">${t("profile.bannedCount")}</div>
            </div>
          </div>

          <!-- Main content -->
          <div class="dash-main">
            <!-- User list -->
            <div class="dash-user-list-section">
              <div class="dash-section-header">
                <h3 class="dash-section-title">👥 ${t("profile.allUsers")}</h3>
                <input class="dash-search" id="dashSearch" type="text"
                  placeholder="🔍 ${t("profile.searchUser")}…" value="${this.searchQuery}" />
              </div>
              <div class="dash-user-list" id="dashUserList">
                ${userRows}
              </div>
            </div>

            <!-- Admin password + message -->
            <div class="dash-sidebar-right">
              <div class="dash-pwd-section">
                <div class="dash-pwd-label">🔑 ${t("profile.adminActionPwd")}</div>
                <input class="dash-pwd-input" id="dashAdminPwd" type="password"
                  placeholder="${t("profile.adminPassword")}" value="${this.adminPwd}" />
                <p class="dash-pwd-note">${t("profile.adminPwdNote")}</p>
              </div>
              <div id="dashMsg" class="dash-msg hidden"></div>
              <button class="dash-back-btn" id="dashClose">← ${t("profile.back")}</button>
            </div>
          </div>
        ` : ''}

        <!-- ── TAB 2: SERVER PRO ── -->
        ${this.activeTab === 'server' ? `
          <div class="dash-full-panel">
            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>🏢 Configuration du Serveur IA Réseau (Mode PRO Entreprise)</span>
                <span class="dash-tab-badge pro">CLUSTER CENTRALISÉ</span>
              </div>
              <p class="dash-card-desc">
                Configurez l'adresse réseau du serveur IA d'entreprise dédié pour déporter l'inférence des modèles de tous les postes utilisateurs.
              </p>
              <div style="display:flex;flex-direction:column;gap:12px;">
                <div>
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">URL du Serveur IA distant :</label>
                  <div class="dash-input-row">
                    <input type="text" class="dash-form-input" id="dashServerUrlInput" value="${this.settings?.server_url || 'http://localhost:8080'}" placeholder="http://192.168.1.50:8080" />
                    <button class="dash-btn-blue" id="dashTestServerBtn" type="button">🔄 Tester Connexion</button>
                  </div>
                </div>
                <div>
                  <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">Jeton d'authentification Bearer (Optionnel) :</label>
                  <input type="password" class="dash-form-input" id="dashServerTokenInput" value="${this.settings?.server_auth_token || ''}" placeholder="Bearer secret token..." style="width:100%;" />
                </div>
                ${this.serverPingResult ? `
                  <div style="padding:10px 14px;border-radius:8px;font-size:12.5px;font-weight:600;background:${this.serverPingResult.ok ? '#ecfdf5' : '#fef2f2'};color:${this.serverPingResult.ok ? '#059669' : '#dc2626'};border:1px solid ${this.serverPingResult.ok ? '#a7f3d0' : '#fecaca'};">
                    ${this.serverPingResult.ok ? '✓ ' : '✕ '} ${this.serverPingResult.message}
                  </div>
                ` : ''}
                <div style="display:flex;justify-content:flex-end;margin-top:8px;">
                  <button class="dash-btn-blue" id="dashSaveServerBtn" type="button">💾 Enregistrer la Configuration Serveur</button>
                </div>
              </div>
            </div>

            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>🛡️ Mode d'Exécution Global</span>
              </div>
              <p class="dash-card-desc">
                Mode d'exécution par défaut pour l'application :
              </p>
              <div style="display:flex;gap:12px;">
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                  <input type="radio" name="execModeRadio" value="lite" ${this.settings?.execution_mode !== 'pro' ? 'checked' : ''} />
                  <span>💻 <strong>Mode LITE (Local)</strong> — Inférence sur le PC client via Ollama / GGUF</span>
                </label>
                <label style="display:flex;align-items:center;gap:8px;font-size:13px;cursor:pointer;">
                  <input type="radio" name="execModeRadio" value="pro" ${this.settings?.execution_mode === 'pro' ? 'checked' : ''} />
                  <span>🏢 <strong>Mode PRO (Réseau Entreprise)</strong> — Inférence centralisée sur serveur distant</span>
                </label>
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;">
              <button class="dash-back-btn" id="dashClose">← ${t("profile.back")}</button>
            </div>
          </div>
        ` : ''}

        <!-- ── TAB 3: QUOTAS ── -->
        ${this.activeTab === 'quotas' ? `
          <div class="dash-full-panel">
            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>⚡ Politique de Quotas et Consommation de Jetons</span>
                <span class="dash-tab-badge">GESTION DES UTILISATEURS</span>
              </div>
              <p class="dash-card-desc">
                Définissez la limite maximale de requêtes quotidiennes allouée à chaque utilisateur standard. Les administrateurs bénéficient automatiquement d'un accès illimité (∞).
              </p>
              <div style="display:flex;flex-direction:column;gap:14px;background:#f9fafb;padding:16px;border-radius:10px;border:1px solid #e5e7eb;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <div style="font-weight:700;font-size:13.5px;color:#111827;">Limite Quotidienne par Utilisateur :</div>
                    <div style="font-size:11.5px;color:#6b7280;">Nombre de requêtes permises par 24 heures (réinitialisé chaque nuit à minuit)</div>
                  </div>
                  <div style="display:flex;align-items:center;gap:8px;">
                    <input type="number" class="dash-form-input" id="dashQuotaInput" min="1" max="10000" value="${this.quota?.daily_limit || 50}" style="width:90px;text-align:center;font-weight:700;" />
                    <span style="font-weight:600;font-size:12px;color:#4b5563;">req / jour</span>
                  </div>
                </div>
                <button class="dash-btn-blue" id="dashSaveQuotaBtn" type="button" style="align-self:flex-end;">
                  ⚡ Mettre à jour la Limite Quota
                </button>
              </div>
            </div>

            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>📊 État d'Utilisation du Compte Actuel</span>
              </div>
              <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-top:10px;">
                <div style="padding:12px;background:#f3f4f6;border-radius:8px;text-align:center;">
                  <div style="font-size:11px;color:#6b7280;font-weight:600;">STATUT ADMIN</div>
                  <div style="font-size:18px;font-weight:800;color:#4f46e5;">👑 Illimité (∞)</div>
                </div>
                <div style="padding:12px;background:#f3f4f6;border-radius:8px;text-align:center;">
                  <div style="font-size:11px;color:#6b7280;font-weight:600;">UTILISÉ AUJOURD'HUI</div>
                  <div style="font-size:18px;font-weight:800;color:#111827;">${this.quota?.used_today || 0} requêtes</div>
                </div>
                <div style="padding:12px;background:#f3f4f6;border-radius:8px;text-align:center;">
                  <div style="font-size:11px;color:#6b7280;font-weight:600;">RESTANT STANDARD</div>
                  <div style="font-size:18px;font-weight:800;color:#059669;">${this.quota?.remaining_today || 50} requêtes</div>
                </div>
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;">
              <button class="dash-back-btn" id="dashClose">← ${t("profile.back")}</button>
            </div>
          </div>
        ` : ''}

        <!-- ── TAB 4: LICENSE & IT KEYS ── -->
        ${this.activeTab === 'license' ? `
          <div class="dash-full-panel">
            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>🔑 Licence Entreprise & Scellement Matériel</span>
                <span class="dash-tab-badge pro">${this.licenseStatus?.is_licensed ? (this.licenseStatus.tier === 'pro' ? '👑 PRO ACTIVE' : '💎 LITE ACTIVE') : '🔒 DÉCOUVERTE'}</span>
              </div>
              <p class="dash-card-desc">
                Informations cryptographiques et scellement d'intégrité de la machine.
              </p>
              <div style="display:flex;flex-direction:column;gap:10px;background:#f9fafb;padding:16px;border-radius:10px;border:1px solid #e5e7eb;">
                <div style="display:flex;align-items:center;justify-content:space-between;">
                  <div>
                    <div style="font-size:11px;color:#6b7280;font-weight:600;">IDENTIFIANT UNIQUE MACHINE (HWID) :</div>
                    <div style="font-family:monospace;font-size:14px;font-weight:700;color:#4f46e5;">${this.licenseStatus?.hwid || 'Chargement...'}</div>
                  </div>
                  <button class="dash-btn-blue" id="dashCopyHwidBtn" type="button">📋 Copier l'ID</button>
                </div>
                ${this.licenseStatus?.is_licensed ? `
                  <div style="margin-top:6px;padding-top:10px;border-top:1px solid #e5e7eb;font-size:12px;color:#374151;">
                    <div>🔑 Clé scellée : <strong style="font-family:monospace;">${this.licenseStatus.license_key || 'Enregistrée'}</strong></div>
                    ${this.licenseStatus.company ? `<div>🏢 Société : <strong>${this.licenseStatus.company}</strong></div>` : ''}
                    ${this.licenseStatus.activated_at ? `<div>📅 Date d'activation : <strong>${this.licenseStatus.activated_at}</strong></div>` : ''}
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- IT Admin Key Generator Tool -->
            <div class="dash-card-box">
              <div class="dash-card-title">
                <span>🛠️ Générateur de Clés Multi-Postes pour Administrateur IT</span>
              </div>
              <p class="dash-card-desc">
                Générez des clés d'activation signées pour débloquer les autres ordinateurs de vos collaborateurs :
              </p>
              <div style="display:flex;flex-direction:column;gap:10px;">
                <div style="display:flex;gap:10px;">
                  <input type="text" class="dash-form-input" id="dashGenHwidInput" placeholder="Saisir le HWID du poste client (Ex: D8D2-00D5-07B2-5C51)..." style="font-family:monospace;" />
                  <select class="dash-form-input" id="dashGenTierSelect" style="width:130px;flex:none;">
                    <option value="pro">👑 PRO (500$)</option>
                    <option value="lite">💎 LITE (50$)</option>
                  </select>
                  <button class="dash-btn-blue" id="dashGenerateKeyBtn" type="button">⚡ Générer Clé</button>
                </div>
                ${this.generatedAdminKey ? `
                  <div style="margin-top:8px;padding:12px 14px;background:#eef2ff;border:1.5px solid #c7d2fe;border-radius:8px;display:flex;align-items:center;justify-content:space-between;">
                    <div>
                      <div style="font-size:11px;font-weight:700;color:#4338ca;">CLÉ SIGNÉE GÉNÉRÉE :</div>
                      <div style="font-family:monospace;font-size:13.5px;font-weight:800;color:#1e1b4b;word-break:break-all;">${this.generatedAdminKey}</div>
                    </div>
                    <button class="dash-btn-blue" id="dashCopyGenKeyBtn" type="button">📋 Copier</button>
                  </div>
                ` : ''}
              </div>
            </div>

            <div style="display:flex;justify-content:flex-end;">
              <button class="dash-back-btn" id="dashClose">← ${t("profile.back")}</button>
            </div>
          </div>
        ` : ''}
      </div>`;

    // ── Tab Switching ───────────────────────────────────────────────
    this.el.querySelectorAll<HTMLButtonElement>(".dash-nav-tab").forEach(tabBtn => {
      tabBtn.addEventListener("click", () => {
        this.activeTab = tabBtn.dataset.tab as any || 'users';
        void this.draw();
      });
    });

    // ── Search ──────────────────────────────────────────────────────
    this.el.querySelector<HTMLInputElement>("#dashSearch")?.addEventListener("input", e => {
      this.searchQuery = (e.target as HTMLInputElement).value;
      void this.draw();
    });

    // ── Admin pwd sync ──────────────────────────────────────────────
    this.el.querySelector<HTMLInputElement>("#dashAdminPwd")?.addEventListener("input", e => {
      this.adminPwd = (e.target as HTMLInputElement).value;
    });

    // ── Expand/collapse user panel ──────────────────────────────────
    this.el.querySelectorAll<HTMLButtonElement>(".dash-user-expand-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const uid = btn.dataset.uid!;
        this.selectedUserId = this.selectedUserId === uid ? null : uid;
        void this.draw();
      });
    });

    // ── Card click → expand ─────────────────────────────────────────
    this.el.querySelectorAll<HTMLDivElement>(".dash-user-card").forEach(card => {
      card.addEventListener("click", e => {
        const target = e.target as HTMLElement;
        if (target.closest(".dash-user-expand-btn")) return;
        const uid = card.dataset.uid!;
        this.selectedUserId = this.selectedUserId === uid ? null : uid;
        void this.draw();
      });
    });

    // ── Clear conversations ─────────────────────────────────────────
    this.el.querySelectorAll<HTMLButtonElement>(".dash-action-clear").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!this.adminPwd) { this.showMsg(t("profile.passwordRequired"), "error"); return; }
        if (!confirm(t("profile.confirmClearConversations"))) return;
        try {
          await invoke("admin_clear_user_conversations", {
            adminId: this.adminProfile.id, adminPassword: this.adminPwd, targetId: btn.dataset.id!,
          });
          this.showMsg(t("profile.conversationsCleared"), "success");
        } catch (e) { this.showMsg(String(e), "error"); }
      });
    });

    // ── Ban / Unban ─────────────────────────────────────────────────
    this.el.querySelectorAll<HTMLButtonElement>(".dash-action-ban, .dash-action-unban").forEach(btn => {
      btn.addEventListener("click", async () => {
        const isBanned = btn.dataset.banned === "true";
        if (!confirm(isBanned ? t("profile.confirmUnban") : t("profile.confirmBan"))) return;
        try {
          await invoke(isBanned ? "admin_unban_user" : "admin_ban_user", { profileId: btn.dataset.id! });
          await this.loadData(); await this.draw();
          this.showMsg(isBanned ? t("profile.userUnbanned") : t("profile.userBanned"), "success");
        } catch (e) { this.showMsg(String(e), "error"); }
      });
    });

    // ── Delete user ─────────────────────────────────────────────────
    this.el.querySelectorAll<HTMLButtonElement>(".dash-action-delete").forEach(btn => {
      btn.addEventListener("click", async () => {
        if (!this.adminPwd) { this.showMsg(t("profile.passwordRequired"), "error"); return; }
        if (!confirm(`${t("profile.confirmDeleteUser")} "${btn.dataset.name}" ?`)) return;
        try {
          await invoke("admin_delete_user", {
            adminId: this.adminProfile.id, adminPassword: this.adminPwd, targetId: btn.dataset.id!,
          });
          this.selectedUserId = null;
          await this.loadData(); await this.draw();
          this.showMsg(t("profile.userDeleted"), "success");
        } catch (e) { this.showMsg(String(e), "error"); }
      });
    });

    // ── Server tab events ───────────────────────────────────────────
    this.el.querySelector<HTMLButtonElement>("#dashTestServerBtn")?.addEventListener("click", async () => {
      const urlInput = this.el.querySelector<HTMLInputElement>("#dashServerUrlInput");
      const url = urlInput?.value.trim() || "";
      if (!url) return;
      const start = Date.now();
      try {
        const cleanUrl = url.replace(/\/+$/, '');
        const res = await fetch(`${cleanUrl}/api/tags`).catch(() => null);
        const latency = Date.now() - start;
        if (res && res.ok) {
          this.serverPingResult = { ok: true, message: `Serveur IA Réseau Joignable (${latency}ms) - API Tags OK` };
        } else {
          this.serverPingResult = { ok: false, message: `Serveur non joignable sur ${url}` };
        }
      } catch (e) {
        this.serverPingResult = { ok: false, message: `Erreur de connexion : ${(e as Error).message}` };
      }
      void this.draw();
    });

    this.el.querySelector<HTMLButtonElement>("#dashSaveServerBtn")?.addEventListener("click", async () => {
      if (!this.settings) return;
      const url = this.el.querySelector<HTMLInputElement>("#dashServerUrlInput")?.value.trim() || "";
      const token = this.el.querySelector<HTMLInputElement>("#dashServerTokenInput")?.value.trim() || "";
      const execMode = (this.el.querySelector<HTMLInputElement>("input[name='execModeRadio']:checked")?.value as string) || "lite";
      this.settings.server_url = url;
      this.settings.server_auth_token = token;
      this.settings.execution_mode = execMode;
      try {
        await invoke("save_settings", { settings: this.settings });
        alert("✓ Configuration Serveur enregistrée avec succès !");
      } catch (e) {
        alert("Erreur lors de l'enregistrement : " + String(e));
      }
    });

    // ── Quota tab events ────────────────────────────────────────────
    this.el.querySelector<HTMLButtonElement>("#dashSaveQuotaBtn")?.addEventListener("click", async () => {
      const val = parseInt(this.el.querySelector<HTMLInputElement>("#dashQuotaInput")?.value || "50", 10);
      try {
        await invoke("set_user_quota_limit", { limit: val });
        await this.loadData();
        alert("✓ Limite Quota mise à jour à " + val + " requêtes / jour !");
        void this.draw();
      } catch (e) {
        alert("Erreur : " + String(e));
      }
    });

    // ── License tab events ──────────────────────────────────────────
    this.el.querySelector<HTMLButtonElement>("#dashCopyHwidBtn")?.addEventListener("click", async () => {
      if (this.licenseStatus?.hwid) {
        await navigator.clipboard.writeText(this.licenseStatus.hwid);
        alert("✓ ID Machine (HWID) copié dans le presse-papier !");
      }
    });

    this.el.querySelector<HTMLButtonElement>("#dashGenerateKeyBtn")?.addEventListener("click", async () => {
      const hwid = this.el.querySelector<HTMLInputElement>("#dashGenHwidInput")?.value.trim() || "";
      const tier = this.el.querySelector<HTMLSelectElement>("#dashGenTierSelect")?.value || "pro";
      if (!hwid) {
        alert("Veuillez renseigner le HWID du poste client.");
        return;
      }
      try {
        this.generatedAdminKey = await invoke<string>("generate_license_key_admin", { tier, hwid });
        void this.draw();
      } catch (e) {
        alert("Erreur génération clé : " + String(e));
      }
    });

    this.el.querySelector<HTMLButtonElement>("#dashCopyGenKeyBtn")?.addEventListener("click", async () => {
      if (this.generatedAdminKey) {
        await navigator.clipboard.writeText(this.generatedAdminKey);
        alert("✓ Clé de licence signée copiée !");
      }
    });

    // ── Close ───────────────────────────────────────────────────────
    this.el.querySelectorAll("#dashClose").forEach(btn => {
      btn.addEventListener("click", () => this.onClose());
    });
  }

  private showMsg(msg: string, type: "success" | "error"): void {
    const el = this.el.querySelector<HTMLElement>("#dashMsg");
    if (!el) return;
    el.textContent = msg;
    el.className = `dash-msg dash-msg-${type}`;
    setTimeout(() => el.className = "dash-msg hidden", 4000);
  }
}
