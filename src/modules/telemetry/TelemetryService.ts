/**
 * TelemetryService — Collecteur de télémétrie anonyme et sécurisé.
 * RESPECT STRICT DE LA CONFIDENTIALITÉ (Privacy-by-Design) :
 * - ZÉRO texte de prompt ou réponse envoyé.
 * - ZÉRO document, fichier ou voix transmis.
 * - Uniquement des compteurs numériques et caractéristiques matérielles.
 */
import { api } from '../../api';

export interface TelemetryPayload {
  client_hash: string;
  version: string;
  tier: string;
  lang: string;
  os: string;
  gpu: string;
  ram_gb: number;
  active_llm: string;
  active_sd: string;
  counts: {
    total_chats: number;
    total_images_sdxl: number;
    total_images_sd15: number;
    total_courses: number;
    total_voice_messages: number;
    total_rag_docs: number;
  };
}

class TelemetryService {
  private static instance: TelemetryService | null = null;
  private endpoint = 'http://localhost:9090/api/telemetry/ping';
  private clientHash: string | null = null;
  private timer: any = null;

  public static getInstance(): TelemetryService {
    if (!TelemetryService.instance) {
      TelemetryService.instance = new TelemetryService();
    }
    return TelemetryService.instance;
  }

  /**
   * Initialise le service de télémétrie et déclenche le premier ping après 4 secondes.
   */
  public init(): void {
    // Premier ping au démarrage
    setTimeout(() => {
      void this.sendPing();
    }, 4000);

    // Pings réguliers toutes les 4 heures si l'application reste ouverte
    if (!this.timer) {
      this.timer = setInterval(() => {
        void this.sendPing();
      }, 4 * 60 * 60 * 1000);
    }
  }

  /**
   * Enregistre un événement numérique localement dans localStorage.
   */
  public trackEvent(type: 'chat' | 'image_sdxl' | 'image_sd15' | 'course' | 'voice' | 'rag'): void {
    try {
      const key = `ai_telemetry_${type}`;
      const current = parseInt(localStorage.getItem(key) || '0', 10);
      localStorage.setItem(key, String(current + 1));
    } catch (_) {}
  }

  /**
   * Génère ou récupère un identifiant anonymisé unique (hash SHA-256).
   */
  private async getClientHash(): Promise<string> {
    if (this.clientHash) return this.clientHash;

    try {
      const hw = await api.getHardwareId();
      if (hw) {
        this.clientHash = await this.sha256(`AI_WIDGET_SALT_${hw}`);
        return this.clientHash;
      }
    } catch (_) {}

    // Fallback ID anonyme stocké localement
    let localId = localStorage.getItem('ai_widget_anon_client_id');
    if (!localId) {
      localId = 'anon_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('ai_widget_anon_client_id', localId);
    }
    this.clientHash = await this.sha256(`AI_WIDGET_SALT_${localId}`);
    return this.clientHash;
  }

  private async sha256(message: string): Promise<string> {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Envoie le rapport de métriques anonyme au serveur de dashboard.
   */
  public async sendPing(): Promise<void> {
    try {
      const clientHash = await this.getClientHash();

      // Récupération des specs matérielles
      let gpu = 'Inconnu';
      let ramGb = 8;
      try {
        const specs = await api.getHardwareSpecs();
        if (specs) {
          gpu = specs.gpu_name || 'Intégré';
          ramGb = Math.round(specs.total_ram_gb) || 8;
        }
      } catch (_) {}

      // Récupération des paramètres
      let settings: any = {};
      try {
        settings = await api.getSettings();
      } catch (_) {}

      let tier = 'lite';
      try {
        const lic = await api.getLicenseStatus();
        if (lic && lic.tier) tier = lic.tier.toLowerCase();
      } catch (_) {}

      const payload: TelemetryPayload = {
        client_hash: clientHash,
        version: '1.1.0',
        tier,
        lang: settings.language || 'fr',
        os: 'Windows',
        gpu,
        ram_gb: ramGb,
        active_llm: settings.default_model || 'qwen2.5:1.5b',
        active_sd: settings.sd_active_model || 'juggernaut',
        counts: {
          total_chats: parseInt(localStorage.getItem('ai_telemetry_chat') || '0', 10),
          total_images_sdxl: parseInt(localStorage.getItem('ai_telemetry_image_sdxl') || '0', 10),
          total_images_sd15: parseInt(localStorage.getItem('ai_telemetry_image_sd15') || '0', 10),
          total_courses: parseInt(localStorage.getItem('ai_telemetry_course') || '0', 10),
          total_voice_messages: parseInt(localStorage.getItem('ai_telemetry_voice') || '0', 10),
          total_rag_docs: parseInt(localStorage.getItem('ai_telemetry_rag') || '0', 10),
        },
      };

      // Envoi non bloquant vers le serveur de dashboard
      await fetch(this.endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        mode: 'cors',
      });
    } catch (_) {
      // Ignorer silencieusement si hors ligne ou serveur de dashboard éteint
    }
  }
}

export const telemetryService = TelemetryService.getInstance();
