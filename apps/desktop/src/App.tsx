// NAIS Desktop App — integrates avatar canvas, agent service, and chat UI.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "./components/AvatarCanvas";

import { createAgentService, type AgentState } from "./services/agent";
import { createAvatarService } from "./services/avatar";
import type { AgentEvent, AgentEventData } from "@nais/agent-adapter";
import type { AvatarState } from "@nais/avatar-runtime";

type AppState = AvatarState | "setup";

const AGENT_TO_AVATAR: Partial<Record<string, AvatarState>> = {
  "session.message":  "idle",
  "agent.thinking":  "thinking",
  "agent.speaking":  "speaking",
  "agent.idle":      "idle",
  "agent.error":     "error",
  "session.ended":   "idle",
};

/** Map agent event kind → mouth openness during speaking. */
function mouthForEvent(kind: string): number {
  if (kind === "agent.speaking") return 0.6;
  return 0;
}

export function App() {
  const agent = useRef(createAgentService());
  const avatar = useRef(createAvatarService());

  const [appState, setAppState]   = useState<AppState>("setup");
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [mouthOpen, setMouthOpen] = useState(0);
  const [agentState, setAgentState] = useState<AgentState>("disconnected");
  const [lastEvent, setLastEvent]   = useState<string>("—");
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [authToken, setAuthToken]   = useState("");
  const [messageLog, setMessageLog] = useState<Array<{ id: number; from: "user" | "nano"; text: string }>>([]);
  const [text, setText] = useState("");
  const msgId = useRef(0);

  // Wire agent events → avatar state.
  useEffect(() => {
    const off = agent.current.onEvent((ev: AgentEvent) => {
      const kind: string = ev.kind;
      setLastEvent(kind);

      // Mouth animation for speaking events.
      if (kind === "agent.speaking") {
        setMouthOpen(0.6);
        // TODO: read actual audio/speech amplitude from event data when adapter emits it.
        setTimeout(() => setMouthOpen(0), 1500);
      }

      // Avatar state from event kind.
      const next: AvatarState = AGENT_TO_AVATAR[kind] ?? "idle";
      setAvatarState(next);

      // Append message to log when agent sends text.
      if (kind === "session.message") {
        const data = ev.data as AgentEventData;
        if (data && "text" in data && typeof data.text === "string") {
          setMessageLog((prev) => [
            ...prev,
            { id: ++msgId.current, from: "nano", text: data.text as string },
          ]);
        }
      }

      // Update agent connection state.
      const status = agent.current.adapter?.getStatus();
      if (status) {
        setAgentState(status.connected ? "connected" : "disconnected");
      }
    });
    return off;
  }, []);

  const handleConnect = useCallback(async () => {
    if (!gatewayUrl.trim()) return;
    setAppState("idle");
    setAgentState("connecting");
    try {
      await agent.current.connect(gatewayUrl.trim(), authToken.trim());
      setAgentState("connected");
      setAvatarState("idle");
    } catch {
      setAgentState("error");
      setAppState("setup");
    }
  }, [gatewayUrl, authToken]);

  const handleSend = useCallback(async (text: string) => {
    setAvatarState("thinking");
    setMessageLog((prev) => [
      ...prev,
      { id: ++msgId.current, from: "user", text },
    ]);
    try {
      await agent.current.send(text);
    } catch {
      setAvatarState("error");
    }
  }, []);

  const handleDisconnect = useCallback(async () => {
    await agent.current.disconnect();
    setAgentState("disconnected");
    setAppState("setup");
    setAvatarState("idle");
  }, []);

  // --- Setup screen ---
  if (appState === "setup") {
    return (
      <main className="shell">
        <section className="assistant-card" aria-label="NAIS setup">
          <div className="orb" data-state="idle" aria-hidden="true">
            <div className="orb-core" />
          </div>
          <div className="content">
            <p className="eyebrow">NAIS Desktop</p>
            <h1>Connect to nano</h1>
            <p className="summary">
              Enter your OpenClaw gateway URL and auth token to connect.
            </p>

            <div className="setup-form">
              <label htmlFor="gateway-url">
                Gateway URL
                <input
                  id="gateway-url"
                  type="url"
                  placeholder="https://your-vps.example.com"
                  value={gatewayUrl}
                  onChange={(e) => setGatewayUrl(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <label htmlFor="auth-token">
                Auth Token
                <input
                  id="auth-token"
                  type="password"
                  placeholder="Bearer token for your gateway"
                  value={authToken}
                  onChange={(e) => setAuthToken(e.target.value)}
                  autoComplete="off"
                />
              </label>
              <button
                type="button"
                className="primary-button"
                onClick={handleConnect}
                disabled={!gatewayUrl.trim()}
              >
                Connect
              </button>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // --- Main app ---
  return (
    <main className="shell app-layout">
      {/* Left: avatar */}
      <section className="avatar-panel" aria-label="NAIS avatar">
        <AvatarCanvas state={avatarState} mouthOpen={mouthOpen} />
        <div className="avatar-state-badge">
          <span className={`agent-dot ${agentState}`} />
          <span>{agentState}</span>
        </div>
        <p className="avatar-event-label">{lastEvent}</p>
        <button
          type="button"
          className="secondary-button"
          onClick={handleDisconnect}
        >
          Disconnect
        </button>
      </section>

      {/* Right: chat */}
      <section className="chat-panel" aria-label="NAIS chat">
        <div className="chat-header">
          <h2>Chat with nano</h2>
          <span className="status-chip" data-state={avatarState}>
            {avatarState}
          </span>
        </div>

        <div className="message-log" aria-label="Message log" role="log">
          {messageLog.length === 0 && (
            <p className="empty-chat">Say something to nano…</p>
          )}
          {messageLog.map((msg) => (
            <div key={msg.id} className={`message message-${msg.from}`}>
              <span className="message-sender">{msg.from === "user" ? "You" : "nano"}</span>
              <p className="message-text">{msg.text}</p>
            </div>
          ))}
        </div>

        <div className="chat-input-row">
          <textarea
            className="chat-textarea"
            placeholder="Send a message to nano…"
            rows={1}
            disabled={agentState !== "connected"}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (text.trim()) { handleSend(text.trim()); setText(""); }
              }
            }}
            value={text}
          />
          <button
            type="button"
            className="send-button"
            disabled={agentState !== "connected" || !text.trim()}
            onClick={() => { if (text.trim()) { handleSend(text.trim()); setText(""); } }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}
