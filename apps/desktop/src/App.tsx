// NAIS Desktop App — integrates avatar canvas, agent service, character packs, and chat UI.

import React, { useCallback, useEffect, useRef, useState } from "react";
import { AvatarCanvas } from "./components/AvatarCanvas";
import { createAgentService, type AgentState } from "./services/agent";
import { createAvatarService } from "./services/avatar";
import {
  listCharacterPacks,
  loadCharacterPack,
  type CharacterPackDetail,
  type CharacterPackSummary,
} from "./services/characters";
import type { AgentEvent, AgentEventData } from "@nais/agent-adapter";
import type { AvatarState } from "@nais/avatar-runtime";

type AppScreen = "setup" | "main";

const AGENT_TO_AVATAR: Partial<Record<string, AvatarState>> = {
  "session.message": "idle",
  "agent.thinking": "thinking",
  "agent.speaking": "speaking",
  "agent.idle":     "idle",
  "agent.error":    "error",
  "session.ended":  "idle",
};

export function App() {
  const agent  = useRef(createAgentService());
  const avatar = useRef(createAvatarService());

  // Screen
  const [screen, setScreen] = useState<AppScreen>("setup");

  // Agent state
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [mouthOpen, setMouthOpen]     = useState(0);
  const [agentState, setAgentState]   = useState<AgentState>("disconnected");
  const [lastEvent, setLastEvent]    = useState<string>("—");

  // Gateway
  const [gatewayUrl, setGatewayUrl] = useState("");
  const [authToken, setAuthToken] = useState("");

  // Characters
  const [packs, setPacks]           = useState<CharacterPackSummary[]>([]);
  const [selectedPack, setSelectedPack] = useState<CharacterPackDetail | null>(null);
  const [currentExpression, setCurrentExpression] = useState<string>("neutral");
  const [packLoadError, setPackLoadError] = useState<string>("");
  const [loadingPacks, setLoadingPacks] = useState(false);
  const [loadingPack, setLoadingPack]   = useState(false);

  // Chat
  const [messageLog, setMessageLog] = useState<
    Array<{ id: number; from: "user" | "nano"; text: string }>
  >([]);
  const [text, setText] = useState("");
  const msgId = useRef(0);

  // Discover character packs on mount.
  useEffect(() => {
    setLoadingPacks(true);
    listCharacterPacks()
      .then((p) => { setPacks(p); setLoadingPacks(false); })
      .catch(() => { setLoadingPacks(false); });
  }, []);

  // Wire agent events → avatar state.
  useEffect(() => {
    const off = agent.current.onEvent((ev: AgentEvent) => {
      const kind: string = ev.kind;
      setLastEvent(kind);

      if (kind === "agent.speaking") {
        setMouthOpen(0.6);
        setTimeout(() => setMouthOpen(0), 1500);
      }

      const next: AvatarState = AGENT_TO_AVATAR[kind] ?? "idle";
      setAvatarState(next);

      // Derive expression from character pack state mapping when pack is loaded.
      if (selectedPack?.states) {
        const mapping = selectedPack.states[next];
        setCurrentExpression(mapping?.expression ?? "neutral");
      } else {
        setCurrentExpression("neutral");
      }

      if (kind === "session.message") {
        const data = ev.data as AgentEventData;
        if (data && "text" in data && typeof data.text === "string") {
          setMessageLog((prev) => [
            ...prev,
            { id: ++msgId.current, from: "nano", text: data.text as string },
          ]);
        }
      }

      const status = agent.current.adapter?.getStatus();
      if (status) {
        setAgentState(status.connected ? "connected" : "disconnected");
      }
    });
    return off;
  }, []);

  // Load selected pack.
  const handleLoadPack = useCallback(async (packPath: string) => {
    setLoadingPack(true);
    setPackLoadError("");
    setSelectedPack(null);
    try {
      const detail = await loadCharacterPack(packPath);
      setSelectedPack(detail);
    } catch (err) {
      setPackLoadError(String(err));
    } finally {
      setLoadingPack(false);
    }
  }, []);

  const handleConnect = useCallback(async () => {
    if (!gatewayUrl.trim()) return;
    setAgentState("connecting");
    try {
      await agent.current.connect(gatewayUrl.trim(), authToken.trim());
      setAgentState("connected");
      setAvatarState("idle");
      setScreen("main");
    } catch {
      setAgentState("error");
    }
  }, [gatewayUrl, authToken]);

  const handleSend = useCallback(
    async (text: string) => {
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
    },
    [],
  );

  const handleDisconnect = useCallback(async () => {
    await agent.current.disconnect();
    setAgentState("disconnected");
    setScreen("setup");
    setAvatarState("idle");
    setMessageLog([]);
  }, []);

  // ── Setup screen ─────────────────────────────────────────────────────────
  if (screen === "setup") {
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
              Select a character pack, then connect to your gateway.
            </p>

            {/* Character selector */}
            <div className="character-selector">
              <label htmlFor="pack-select">Character Pack</label>
              <div className="pack-select-row">
                <select
                  id="pack-select"
                  className="pack-select"
                  disabled={loadingPacks}
                  value=""
                  onChange={(e) => {
                    if (e.target.value) handleLoadPack(e.target.value);
                  }}
                >
                  <option value="" disabled>
                    {loadingPacks ? "Scanning…" : packs.length === 0 ? "No packs found" : "Choose a character…"}
                  </option>
                  {packs.map((p) => (
                    <option key={p.id} value={p.path}>
                      {p.name} {!p.avatar_enabled && "— no avatar"}
                    </option>
                  ))}
                </select>
              </div>

              {loadingPack && <p className="pack-status">Loading…</p>}
              {packLoadError && <p className="pack-error">{packLoadError}</p>}

              {selectedPack && (
                <div className="pack-card">
                  <div className="pack-card-header">
                    <span className="pack-name">{selectedPack.name}</span>
                    <span className={`avatar-badge ${selectedPack.avatar_enabled ? "on" : "off"}`}>
                      {selectedPack.avatar_enabled
                        ? `${selectedPack.default_mode} ready`
                        : "avatar off"}
                    </span>
                  </div>
                  {selectedPack.persona_preview && (
                    <p className="pack-persona">
                      {selectedPack.persona_preview}
                      {selectedPack.persona_preview.length >= 200 ? "…" : ""}
                    </p>
                  )}
                  {selectedPack.live2d_enabled && (
                    <p className="pack-model">
                      <span className="model-label">Live2D</span> {selectedPack.live2d_model}
                    </p>
                  )}
                  {selectedPack.vrm_enabled && (
                    <p className="pack-model">
                      <span className="model-label">VRM</span> {selectedPack.vrm_model}
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* Gateway form */}
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
                disabled={!gatewayUrl.trim() || agentState === "connecting"}
              >
                {agentState === "connecting" ? "Connecting…" : "Connect"}
              </button>
              {agentState === "error" && (
                <p className="pack-error">Connection failed — check URL and token.</p>
              )}
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <main className="shell app-layout">
      {/* Left: avatar + character info */}
      <section className="avatar-panel" aria-label="NAIS avatar">
        {selectedPack && (
          <div className="character-badge">
            <span className="character-name">{selectedPack.name}</span>
          </div>
        )}
        <AvatarCanvas state={avatarState} expression={currentExpression} mouthOpen={mouthOpen} />
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
              <span className="message-sender">
                {msg.from === "user" ? "You" : "nano"}
              </span>
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
                if (text.trim()) {
                  handleSend(text.trim());
                  setText("");
                }
              }
            }}
            value={text}
          />
          <button
            type="button"
            className="send-button"
            disabled={agentState !== "connected" || !text.trim()}
            onClick={() => {
              if (text.trim()) {
                handleSend(text.trim());
                setText("");
              }
            }}
          >
            <svg
              width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          </button>
        </div>
      </section>
    </main>
  );
}
