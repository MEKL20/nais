// @nais/agent-adapter — Public API

export { type AgentAdapter } from "./adapter.js";
export { createAgentAdapter, type CreateAgentAdapterOptions } from "./factory.js";
export {
  type AgentAdapterCapabilities,
  type AgentAdapterErrorOptions,
  type AgentAdapterKind,
  type AgentAdapterStatus,
  type AgentEvent,
  type AgentEventData,
  type AgentEventKind,
  type AgentEventLevel,
  type MessageData,
  type AgentMessage,
  type AgentMessageResult,
  AgentAdapterError,
} from "./types.js";
export {
  OPENCLAW_CAPABILITIES,
  OpenClawAgentAdapter,
  type OpenClawAdapterConfig,
  type OpenClawAdapterOptions,
} from "./adapters/openclaw.js";
