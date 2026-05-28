// Agent service — wires OpenClaw agent adapter into the NAIS desktop frontend.

import {
  createAgentAdapter,
  type AgentAdapter,
  type AgentEvent,
  type AgentMessage,
} from "@nais/agent-adapter";


export type AgentState = "disconnected" | "connecting" | "connected" | "error";

export interface AgentService {
  readonly state: AgentState;
  readonly adapter: AgentAdapter | null;
  connect(gatewayUrl: string, authToken: string): Promise<void>;
  disconnect(): Promise<void>;
  send(text: string): Promise<void>;
  onEvent(handler: (event: AgentEvent) => void): () => void;
}

let _adapter: AgentAdapter | null = null;
let _state: AgentState = "disconnected";
const _handlers: Array<(event: AgentEvent) => void> = [];

function notifyState(next: AgentService["state"]) {
  _state = next;
}

export function createAgentService(): AgentService {
  return {
    get state() { return _state; },
    get adapter() { return _adapter; },

    async connect(gatewayUrl: string, authToken: string): Promise<void> {
      if (_adapter) {
        await _adapter.disconnect();
        _adapter.dispose();
      }
      notifyState("connecting");
      _adapter = createAgentAdapter({ kind: "openclaw", config: { gatewayUrl, authToken } });

      _adapter.onEvent((event: AgentEvent) => {
        for (const h of _handlers) {
          try { h(event); } catch { /* ignore */ }
        }
      });

      try {
        // connect() takes (gatewayUrl, sessionKey)
        await _adapter.connect(gatewayUrl, "main");
        notifyState("connected");
      } catch (err) {
        notifyState("error");
        throw err;
      }
    },

    async disconnect(): Promise<void> {
      if (_adapter) {
        await _adapter.disconnect();
        _adapter.dispose();
        _adapter = null;
      }
      notifyState("disconnected");
    },

    async send(text: string): Promise<void> {
      if (!_adapter || _state !== "connected") {
        throw new Error("Not connected");
      }
      const msg: AgentMessage = { text, sessionKey: "main" };
      await _adapter.sendMessage(msg);
    },

    onEvent(handler: (event: AgentEvent) => void): () => void {
      _handlers.push(handler);
      return () => {
        const idx = _handlers.indexOf(handler);
        if (idx >= 0) _handlers.splice(idx, 1);
      };
    },
  }
}
