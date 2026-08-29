import { invoke } from '@tauri-apps/api/tauri';
import { listen as tauriListen, type UnlistenFn } from '@tauri-apps/api/event';

export { type UnlistenFn };

export type ExecutionMode = 'lite' | 'pro';

export interface TransportAdapter {
  call<T>(cmd: string, args?: Record<string, unknown>): Promise<T>;
  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<UnlistenFn>;
  getMode(): ExecutionMode;
}

/**
 * 1. Mode LITE (In-Process / Local Tauri IPC)
 */
export class TauriIpcTransport implements TransportAdapter {
  call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    return invoke<T>(cmd, args);
  }

  listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<UnlistenFn> {
    return tauriListen<T>(event, handler);
  }

  getMode(): ExecutionMode {
    return 'lite';
  }
}

/**
 * 2. Mode PRO (Client / Serveur On-Premise REST + SSE)
 */
export class HttpSseTransport implements TransportAdapter {
  private serverUrl: string;
  private token: string | null = null;
  private eventListeners: Map<string, Set<(event: { payload: any }) => void>> = new Map();

  constructor(serverUrl: string, token?: string) {
    this.serverUrl = serverUrl.replace(/\/+$/, '');
    this.token = token || null;
  }

  setAuthToken(token: string | null): void {
    this.token = token;
  }

  async call<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
    // 1. All native desktop, window, hardware, profile, voice, and system operations are strictly LOCAL
    const isRemoteCommand = cmd === 'generate_response' || cmd === 'list_remote_models';
    if (!isRemoteCommand) {
      return invoke<T>(cmd, args);
    }

    // 2. Remote AI Inference
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      // Attach Native Cryptographic Protocol Signature (Mutual Handshake & Anti-Tamper)
      try {
        const signInfo = await invoke<{ timestamp: number; hwid: string; signature: string }>(
          'sign_enterprise_request',
          { route: cmd }
        );
        if (signInfo?.signature) {
          headers['X-AiWidget-HWID'] = signInfo.hwid;
          headers['X-AiWidget-Timestamp'] = String(signInfo.timestamp);
          headers['X-AiWidget-Signature'] = signInfo.signature;
        }
      } catch {
        // Fallback gracefully
      }

      const resp = await fetch(`${this.serverUrl}/api/v1/${cmd}`, {
        method: 'POST',
        headers,
        body: JSON.stringify(args || {}),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => resp.statusText);
        throw new Error(`[Server ${resp.status}] ${errText}`);
      }

      return (await resp.json()) as T;
    } catch (e) {
      // Fallback to local execution if remote server is unreachable
      return invoke<T>(cmd, args);
    }
  }

  async listen<T>(event: string, handler: (event: { payload: T }) => void): Promise<UnlistenFn> {
    // Listening for local events (GGUF progress, whisper progress, etc.)
    return tauriListen<T>(event, handler);
  }

  getMode(): ExecutionMode {
    return 'pro';
  }
}

// ── Active Transport Singleton ───────────────────────────────────────────────
let currentTransport: TransportAdapter = new TauriIpcTransport();

export const setTransport = (transport: TransportAdapter): void => {
  currentTransport = transport;
};

export const getTransportMode = (): ExecutionMode => {
  return currentTransport.getMode();
};

export const call = async <T>(cmd: string, args?: Record<string, unknown>): Promise<T> => {
  return currentTransport.call<T>(cmd, args);
};

export const listen = async <T>(
  event: string,
  handler: (event: { payload: T }) => void
): Promise<UnlistenFn> => {
  return currentTransport.listen<T>(event, handler);
};
