// OpenClaw gateway adapter for NAIS.
// Connects the NAIS desktop app to the OpenClaw gateway brain running on VPS.

import type { AgentAdapter } from "../adapter.js";
import {
  type AgentAdapterCapabilities,
  type AgentAdapterStatus,
  type AgentEvent,
  type AgentEventData,
  type AgentMessage,
  type AgentMessageResult,
  AgentAdapterError,
} from "../types.js";

export const OPENCLAW_CAPABILITIES: AgentAdapterCapabilities = {
  adapter: "openclaw",
  supportsStreaming: true,
  supportsToolCalls: true,
  supportsSessionManagement: true,
  supportsAvatarState: true,
};

/** Config for the OpenClaw adapter. */
export interface OpenClawAdapterConfig {
  /** Base URL of the OpenClaw gateway (e.g. "https://your-vps.example.com"). */
  gatewayUrl: string;
  /** Bearer token for gateway auth. */
  authToken: string;
}

/** Constructor options. */
export interface OpenClawAdapterOptions {
  /** Optional default config — can also be set via connect(). */
  config?: OpenClawAdapterConfig;
}

/**
 * OpenClaw gateway adapter.
 *
 * Communication paths:
 * - HTTP POST to `/tools/invoke` for sending messages and session management.
 * - WebSocket on the same host/port for subscribing to agent events.
 *
 * The gateway URL is typically the OpenClaw gateway's public URL or a tunnel
 * endpoint. Authentication uses the gateway bearer token.
 *
 * This adapter is a **contract placeholder**. Real implementation will bind the
 * WebSocket event subscription loop once a networking layer is in place.
 */
export class OpenClawAgentAdapter implements AgentAdapter {
  readonly name = "OpenClaw Agent Adapter";
  readonly #config?: OpenClawAdapterConfig;
  #status: AgentAdapterStatus;
  #eventHandlers: Array<(_event: AgentEvent) => void> = [];
  #ws: WebSocket | null = null;
  #wsReconnectTimer: ReturnType<typeof setTimeout> | null = null;
  #sessionKey = "main";

  constructor(options: OpenClawAdapterOptions = {}) {
    this.#config = options.config;
    this.#status = {
      adapter: "openclaw",
      connected: false,
    };
  }

  getCapabilities(): AgentAdapterCapabilities {
    return OPENCLAW_CAPABILITIES;
  }

  getStatus(): AgentAdapterStatus {
    return this.#status;
  }

  async connect(gatewayUrl: string, sessionKey: string): Promise<void> {
    this.#sessionKey = sessionKey;
    const url = gatewayUrl.replace(/\/$/, "");
    this.#status = {
      ...this.#status,
      connected: true,
      gatewayUrl: url,
      sessionKey,
    };
    await this.#connectWebSocket(url);
  }

  async #connectWebSocket(baseUrl: string): Promise<void> {
    const wsUrl = baseUrl.startsWith("https:")
      ? baseUrl.replace("https:", "wss:")
      : baseUrl.replace("http:", "ws:");
    const wsEndpoint = `${wsUrl}/ws`;

    return new Promise((resolve, reject) => {
      try {
        const ws = new WebSocket(wsEndpoint);
        this.#ws = ws;

        ws.addEventListener("open", () => {
          ws.send(
            JSON.stringify({
              type: "req",
              id: "openclaw-init",
              method: "connect",
              params: {
                minProtocol: 3,
                maxProtocol: 4,
                client: {
                  id: "nais-desktop",
                  version: "0.1.0",
                  platform: "windows",
                  mode: "operator",
                },
                role: "operator",
                scopes: ["operator.read", "operator.write"],
                auth: { token: this.#config?.authToken },
              },
            }),
          );
          resolve();
        });

        ws.addEventListener("message", (ev: MessageEvent) => {
          try {
            const frame = JSON.parse(String(ev.data)) as OpenClawFrame;
            void this.#handleFrame(frame);
          } catch {
            // Malformed frame — ignore.
          }
        });

        ws.addEventListener("error", () => {
          reject(
            new AgentAdapterError("WebSocket connection error", {
              code: "OPENCLAW_WS_ERROR",
              adapter: "openclaw",
            }),
          );
        });

        ws.addEventListener("close", () => {
          this.#status = { ...this.#status, connected: false };
          this.#scheduleReconnect(baseUrl);
        });
      } catch (err) {
        reject(
          new AgentAdapterError("Failed to open WebSocket", {
            code: "OPENCLAW_WS_OPEN_ERROR",
            adapter: "openclaw",
            cause: err,
          }),
        );
      }
    });
  }

  async #handleFrame(frame: OpenClawFrame): Promise<void> {
    if (frame.type === "event") {
      const event = this.#frameToAgentEvent(frame as OpenClawEventFrame);
      if (event) {
        for (const handler of this.#eventHandlers) {
          try {
            handler(event);
          } catch {
            // Handler error — don't break other handlers.
          }
        }
      }
    }
  }

  #frameToAgentEvent(frame: OpenClawEventFrame): AgentEvent | null {
    const eventName = frame.event as string;
    const payload = frame.payload as Record<string, unknown>;

    switch (eventName) {
      case "session.message":
        return {
          kind: "message",
          level: "info",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: {
            text: String(payload["text"] ?? ""),
            sender: (payload["sender"] as "agent" | "user") ?? "agent",
          } satisfies AgentEventData,
        };

      case "agent.thinking":
        return {
          kind: "agent.thinking",
          level: "debug",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: { text: String(payload["text"] ?? "") } satisfies AgentEventData,
        };

      case "agent.speaking":
        return {
          kind: "agent.speaking",
          level: "info",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: { text: String(payload["text"] ?? "") } satisfies AgentEventData,
        };

      case "agent.idle":
        return {
          kind: "agent.idle",
          level: "info",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: {} satisfies AgentEventData,
        };

      case "agent.error":
      case "error":
        return {
          kind: "agent.error",
          level: "error",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: {
            message: String(payload["message"] ?? "Unknown error"),
            code: String(payload["code"] ?? "UNKNOWN"),
          } satisfies AgentEventData,
        };

      case "session.ended":
        return {
          kind: "session.ended",
          level: "info",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: { reason: String(payload["reason"] ?? "ended") } satisfies AgentEventData,
        };

      default:
        return {
          kind: "agent.state",
          level: "debug",
          sessionKey: this.#sessionKey,
          timestamp: Date.now(),
          data: { state: eventName } satisfies AgentEventData,
        };
    }
  }

  #scheduleReconnect(baseUrl: string): void {
    if (this.#wsReconnectTimer) return;
    this.#wsReconnectTimer = setTimeout(async () => {
      this.#wsReconnectTimer = null;
      if (this.#status.connected) return;
      try {
        await this.#connectWebSocket(baseUrl);
      } catch {
        // Reconnect will be scheduled again by the close handler.
      }
    }, 5000);
  }

  async sendMessage(message: AgentMessage): Promise<AgentMessageResult> {
    const gatewayUrl = this.#status.gatewayUrl;
    if (!gatewayUrl) {
      throw new AgentAdapterError("Not connected; call connect() first", {
        code: "OPENCLAW_NOT_CONNECTED",
        adapter: "openclaw",
      });
    }

    const invokeUrl = `${gatewayUrl}/tools/invoke`;
    const response = await fetch(invokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${this.#config?.authToken ?? ""}`,
      },
      body: JSON.stringify({
        tool: "sessions_send",
        action: "json",
        args: {
          sessionKey: message.sessionKey,
          message: message.text,
          context: message.context,
        },
        sessionKey: message.sessionKey,
        dryRun: false,
      }),
    });

    if (!response.ok) {
      throw new AgentAdapterError(`Gateway returned ${response.status}`, {
        code: "OPENCLAW_HTTP_ERROR",
        adapter: "openclaw",
        statusCode: response.status,
      });
    }

    const body = (await response.json()) as Record<string, unknown>;
    if (!body.ok) {
      throw new AgentAdapterError(String(body["error"] ?? "Unknown error"), {
        code: "OPENCLAW_INVOKE_ERROR",
        adapter: "openclaw",
      });
    }

    return {
      ok: true,
      eventId: String(body["eventId"] ?? crypto.randomUUID()),
    };
  }

  onEvent(handler: (_event: AgentEvent) => void): () => void {
    this.#eventHandlers.push(handler);
    return () => {
      const idx = this.#eventHandlers.indexOf(handler);
      if (idx >= 0) this.#eventHandlers.splice(idx, 1);
    };
  }

  async disconnect(): Promise<void> {
    this.#status = { ...this.#status, connected: false };
    if (this.#wsReconnectTimer) {
      clearTimeout(this.#wsReconnectTimer);
      this.#wsReconnectTimer = null;
    }
    if (this.#ws) {
      this.#ws.close();
      this.#ws = null;
    }
  }

  dispose(): void {
    void this.disconnect();
    this.#eventHandlers = [];
    this.#status = {
      adapter: "openclaw",
      connected: false,
    };
  }
}

// --- OpenClaw frame types (internal) ---

interface OpenClawFrame {
  readonly type: "req" | "res" | "event" | "invoke";
  readonly id?: string;
  readonly method?: string;
  readonly params?: Record<string, unknown>;
  readonly event?: string;
  readonly payload?: Record<string, unknown>;
  readonly ok?: boolean;
}

interface OpenClawEventFrame {
  readonly type: "event";
  readonly event: string;
  readonly payload: Record<string, unknown>;
}
