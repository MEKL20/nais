// NAIS Agent Adapter Contract

import type {
  AgentAdapterCapabilities,
  AgentAdapterStatus,
  AgentEvent,
  AgentMessage,
  AgentMessageResult,
} from "./types.js";

/**
 * Common interface for all agent gateway adapters.
 *
 * NAIS desktop app uses this contract to talk to its "brain" without coupling
 * to a specific gateway implementation.
 */
export interface AgentAdapter {
  /** Human-readable adapter name. */
  readonly name: string;

  /** What this adapter can do. */
  getCapabilities(): AgentAdapterCapabilities;

  /** Current connection status snapshot. */
  getStatus(): AgentAdapterStatus;

  /**
   * Connect to the gateway.
   *
   * Subclasses decide the URL/auth strategy. The URL is typically stored in
   * character pack config or app settings.
   */
  connect(_gatewayUrl: string, _sessionKey: string): Promise<void>;

  /** Disconnect from the gateway and clean up resources. */
  disconnect(): Promise<void>;

  /**
   * Send a text message to the agent brain.
   *
   * On the OpenClaw adapter this POSTs to the sessions tool API.
   */
  sendMessage(_message: AgentMessage): Promise<AgentMessageResult>;

  /**
   * Subscribe to agent events.
   *
   * The returned unsubscribe function should be called to clean up the listener.
   */
  onEvent(_handler: (_event: AgentEvent) => void): () => void;

  /**
   * Dispose the adapter and release all resources.
   */
  dispose(): void;
}
