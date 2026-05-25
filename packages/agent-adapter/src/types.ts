// NAIS Agent Adapter Types
// Shared contracts for connecting NAIS desktop app to a gateway brain.

/** Supported gateway backends. */
export type AgentAdapterKind = "openclaw" | string;

/** Severity level for diagnostic/status events. */
export type AgentEventLevel = "debug" | "info" | "warn" | "error";

/** Inbound event kinds from the agent brain. */
export type AgentEventKind =
  | "agent.thinking"
  | "agent.speaking"
  | "agent.idle"
  | "agent.error"
  | "agent.state"
  | "avatar.state"
  | "message"
  | "tool.call"
  | "tool.result"
  | "session.ended";

/** An event emitted by the agent brain. */
export interface AgentEvent {
  readonly kind: AgentEventKind;
  readonly level: AgentEventLevel;
  readonly sessionKey: string;
  readonly data: AgentEventData;
  readonly timestamp: number;
}

export type AgentEventData =
  | AgentThinkingData
  | AgentSpeakingData
  | AgentStateData
  | AvatarStateData
  | MessageData
  | ToolCallData
  | ToolResultData
  | SessionEndedData
  | ErrorData;

export interface AgentThinkingData {
  readonly text?: string;
}
export interface AgentSpeakingData {
  readonly text: string;
}
export interface AgentStateData {
  readonly state: string;
}
export interface AvatarStateData {
  readonly avatarState: string;
}
export interface MessageData {
  readonly text: string;
  readonly sender: "agent" | "user";
}
export interface ToolCallData {
  readonly tool: string;
  readonly args: Record<string, unknown>;
}
export interface ToolResultData {
  readonly tool: string;
  readonly ok: boolean;
  readonly result?: unknown;
  readonly error?: string;
}
export interface SessionEndedData {
  readonly reason: string;
}
export interface ErrorData {
  readonly message: string;
  readonly code?: string;
}

/** Outgoing message from NAIS desktop to the agent. */
export interface AgentMessage {
  /** Target session key. "main" connects to the primary operator session. */
  readonly sessionKey: string;
  readonly text: string;
  readonly context?: Record<string, unknown>;
}

/** Result from sending a message. */
export interface AgentMessageResult {
  readonly ok: true;
  readonly eventId: string;
}

/** Error from the adapter or gateway. */
export class AgentAdapterError extends Error {
  readonly code: string;
  readonly adapter: AgentAdapterKind;
  readonly statusCode?: number;

  constructor(message: string, options: AgentAdapterErrorOptions = {}) {
    super(message, { cause: options.cause });
    this.code = options.code ?? "AGENT_ADAPTER_ERROR";
    this.adapter = options.adapter ?? "unknown";
    this.statusCode = options.statusCode;
  }

  override toString(): string {
    return `${this.name}[${this.code}](${this.adapter}): ${this.message}`;
  }
}

export interface AgentAdapterErrorOptions {
  readonly code?: string;
  readonly adapter?: AgentAdapterKind;
  readonly statusCode?: number;
  readonly cause?: unknown;
}

/** Current adapter connection status. */
export interface AgentAdapterStatus {
  readonly adapter: AgentAdapterKind;
  readonly connected: boolean;
  readonly gatewayUrl?: string;
  readonly lastError?: AgentAdapterError;
  readonly sessionKey?: string;
}

/** Capabilities reported by the gateway. */
export interface AgentAdapterCapabilities {
  readonly adapter: AgentAdapterKind;
  readonly supportsStreaming: boolean;
  readonly supportsToolCalls: boolean;
  readonly supportsSessionManagement: boolean;
  readonly supportsAvatarState: boolean;
}
