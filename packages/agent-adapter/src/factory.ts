// Agent adapter factory.

import type { AgentAdapter } from "./adapter.js";
import { OpenClawAgentAdapter, type OpenClawAdapterConfig } from "./adapters/openclaw.js";
import { AgentAdapterError, type AgentAdapterKind } from "./types.js";

export interface CreateAgentAdapterOptions {
  readonly kind: AgentAdapterKind;
  readonly config?: OpenClawAdapterConfig;
}

/** Create an agent adapter for the selected gateway backend. */
export function createAgentAdapter(options: CreateAgentAdapterOptions): AgentAdapter {
  switch (options.kind) {
    case "openclaw":
      return new OpenClawAgentAdapter({ config: options.config });
    default:
      throw new AgentAdapterError(`Unsupported agent adapter: ${String(options.kind)}`, {
        code: "AGENT_ADAPTER_UNSUPPORTED_KIND",
        adapter: options.kind,
      });
  }
}
