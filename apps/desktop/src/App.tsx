// NAIS Desktop App — integrates avatar canvas, agent service, character packs, and chat UI.

import type { AgentEvent, AgentEventData, MessageData } from "@nais/agent-adapter";
import type { AvatarModelSource, AvatarRuntimeKind, AvatarState } from "@nais/avatar-runtime";
import React, { useCallback, useEffect, useRef, useState } from "react";

import { AvatarCanvas } from "./components/AvatarCanvas";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { SettingsPanel } from "./components/SettingsPanel";
import { renderMarkdown } from "./services/markdown";
import { createAgentService, type AgentState } from "./services/agent";
import { createAvatarService } from "./services/avatar";
import { createTtsService, onBrowserVoicesChanged, selectBrowserVoice } from "./services/tts";
import { createSttService, isSttSupported } from "./services/stt";
import {
  characterAssetUrl,
  listCharacterPacks,
  loadCharacterPack,
  type CharacterPackDetail,
  type CharacterPackSummary,
} from "./services/characters";

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
  const tts = useRef(createTtsService());
  const avatarHostRef = useRef<globalThis.HTMLDivElement | null>(null);

  // Screen
  const [screen, setScreen] = useState<AppScreen>("setup");

  // Agent state
  const [avatarState, setAvatarState] = useState<AvatarState>("idle");
  const [mouthOpen, setMouthOpen]     = useState(0);
  const [avatarModelLoaded, setAvatarModelLoaded] = useState(false);
  const [avatarLoadError, setAvatarLoadError] = useState("");
  const [agentState, setAgentState]   = useState<AgentState>("disconnected");
  const [lastEvent, setLastEvent]    = useState<string>("—");
  const [showSettings, setShowSettings] = useState(false);

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
    Array<{ id: number; from: "user" | "nano"; text: string; time?: Date }>
  >([]);
  const [text, setText] = useState("");
  const [nanoTyping, setNanoTyping] = useState(false);
  const msgId = useRef(0);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const stt = useRef(createSttService());
  const [sttListening, setSttListening] = useState(false);
  const [sttSupported] = useState(isSttSupported);

  // Auto-scroll to bottom when new messages arrive.
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messageLog, nanoTyping]);


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

      if (kind === "agent.thinking") {
        setNanoTyping(true);
        tts.current.cancel();
      }

      if (kind === "agent.speaking") {
        setNanoTyping(false);
        setMouthOpen(0.6);
        setTimeout(() => setMouthOpen(0), 1500);

        const data = ev.data as AgentEventData;
        if (data && "text" in data && typeof data.text === "string") {
          const spokenText = data.text;
          setMessageLog((prev) => [
            ...prev,
            { id: ++msgId.current, from: "nano", text: spokenText, time: new Date() },
          ]);
          tts.current.speak(spokenText);
        }
      }

      if (kind === "message") {
        setNanoTyping(false);
      }

      if (kind === "agent.idle") {
        setNanoTyping(false);
        tts.current.cancel();
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

      if (kind === "message") {
        const data = ev.data as MessageData;
        if (data?.sender === "agent" && typeof data.text === "string") {
          setMessageLog((prev) => [
            ...prev,
            { id: ++msgId.current, from: "nano", text: data.text, time: new Date() },
          ]);
        }
      }

      const status = agent.current.adapter?.getStatus();
      if (status) {
        setAgentState(status.connected ? "connected" : "disconnected");
      }
    });
    return off;
  }, [selectedPack]);

  const resolveModelSource = useCallback((pack: CharacterPackDetail): AvatarModelSource | null => {
    const preferred = pack.default_mode as AvatarRuntimeKind;
    const live2dAvailable = Boolean(pack.live2d_enabled && pack.live2d_model);
    const vrmAvailable = Boolean(pack.vrm_enabled && pack.vrm_model);
    const kind: AvatarRuntimeKind | null =
      preferred === "live2d" && live2dAvailable
        ? "live2d"
        : preferred === "vrm" && vrmAvailable
          ? "vrm"
          : live2dAvailable
            ? "live2d"
            : vrmAvailable
              ? "vrm"
              : null;

    if (!kind) return null;
    const modelPath = kind === "live2d" ? pack.live2d_model : pack.vrm_model;
    if (!modelPath) return null;

    const absoluteModelPath = decodeURIComponent(
      new URL(modelPath, `file://${pack.path}/`).pathname,
    );

    return {
      kind,
      path: characterAssetUrl(absoluteModelPath),
      name: `${pack.name} ${kind.toUpperCase()}`,
    };
  }, []);

  const loadAvatarForPack = useCallback(async (pack: CharacterPackDetail) => {
    const host = avatarHostRef.current;
    const source = resolveModelSource(pack);

    setAvatarModelLoaded(false);
    setAvatarLoadError("");

    if (!source) {
      await avatar.current.unload();
      return;
    }

    if (!host) {
      setAvatarLoadError("Avatar host is not ready yet.");
      return;
    }

    try {
      await avatar.current.load(source.kind, source, {
        container: host,
        initialState: avatarState,
        initialExpression: currentExpression,
      });
      setAvatarModelLoaded(true);
    } catch (err) {
      setAvatarLoadError(err instanceof Error ? err.message : String(err));
      setAvatarModelLoaded(false);
    }
  }, [avatarState, currentExpression, resolveModelSource]);

  // Load selected pack metadata. The actual model loads after the main screen
  // renders, because runtime adapters need a DOM host element.
  const handleLoadPack = useCallback(async (packPath: string) => {
    setLoadingPack(true);
    setPackLoadError("");
    setSelectedPack(null);
    setAvatarModelLoaded(false);
    setAvatarLoadError("");
    await avatar.current.unload();

    try {
      const detail = await loadCharacterPack(packPath);
      if (detail.voice) {
        tts.current.setEnabled(detail.voice.enabled);
        tts.current.setOptions({
          speed: detail.voice.speed,
          pitch: detail.voice.pitch,
          volume: detail.voice.volume ?? 1.0,
        });
        tts.current.setVoice(selectBrowserVoice(detail.voice));
      } else {
        tts.current.setEnabled(detail.voice_enabled);
      }
      setSelectedPack(detail);
    } catch (err) {
      setPackLoadError(String(err));
    } finally {
      setLoadingPack(false);
    }
  }, []);

  // Browser-only smoke preview: auto-select a real pack and enter main screen.
  useEffect(() => {
    if (!globalThis.window?.__NAIS_SMOKE_BYPASS_CONNECT__) return;
    if (selectedPack || loadingPack || packs.length === 0) return;

    const smokePackId = globalThis.window.__NAIS_SMOKE_PACK_ID__ ?? "pixiv-vrm-sample";
    const smokePack = packs.find((p) => p.id === smokePackId) ?? packs[0];
    void handleLoadPack(smokePack.path);
  }, [handleLoadPack, loadingPack, packs, selectedPack]);

  useEffect(() => {
    if (!globalThis.window?.__NAIS_SMOKE_BYPASS_CONNECT__) return;
    if (!selectedPack || screen !== "setup") return;

    setGatewayUrl("smoke://local");
    setAgentState("connected");
    setAvatarState("idle");
    setScreen("main");
  }, [screen, selectedPack]);

  useEffect(() => {
    avatar.current.setState(avatarState);
  }, [avatarState]);

  useEffect(() => {
    avatar.current.setExpression(currentExpression);
  }, [currentExpression]);

  useEffect(() => {
    avatar.current.setMouthOpen(mouthOpen);
  }, [mouthOpen]);

  useEffect(() => {
    if (!selectedPack?.voice) return undefined;

    const syncPackVoice = () => {
      if (!selectedPack.voice) return;
      tts.current.setVoice(selectBrowserVoice(selectedPack.voice));
    };

    syncPackVoice();
    return onBrowserVoicesChanged(syncPackVoice);
  }, [selectedPack]);


  const handleConnect = useCallback(async () => {
    if (!gatewayUrl.trim()) return;
    setAgentState("connecting");
    try {
      if (!globalThis.window?.__NAIS_SMOKE_BYPASS_CONNECT__) {
        await agent.current.connect(gatewayUrl.trim(), authToken.trim());
      }
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
        { id: ++msgId.current, from: "user", text, time: new Date() },
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
    setNanoTyping(false);
    tts.current.cancel();
    setMessageLog([]);
    setAvatarModelLoaded(false);
    setAvatarLoadError("");
    await avatar.current.unload();
  }, []);

  // ── Setup screen ─────────────────────────────────────────────────────────
  if (screen === "setup") {
    return (
      <ErrorBoundary>
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
      </ErrorBoundary>
    );
  }

  // ── Main screen ───────────────────────────────────────────────────────────
  return (
    <ErrorBoundary>
    <main className="shell app-layout">
      {/* Left: avatar + character info */}
      <section className="avatar-panel" aria-label="NAIS avatar">
        {selectedPack && (
          <div className="character-badge">
            <span className="character-name">{selectedPack.name}</span>
          </div>
        )}
        <AvatarCanvas
          state={avatarState}
          expression={currentExpression}
          mouthOpen={mouthOpen}
          modelLoaded={avatarModelLoaded}
          error={avatarLoadError}
          onContainerRef={(el) => {
            avatarHostRef.current = el;
            if (el && selectedPack && !avatarModelLoaded && !avatarLoadError) {
              void loadAvatarForPack(selectedPack);
            }
          }}
        />
        <div className="avatar-state-badge">
          <span className={`agent-dot ${agentState}`} />
          <span>{avatarModelLoaded ? `${agentState} · avatar live` : agentState}</span>
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
          <div className="chat-header-actions">
            <span className="status-chip" data-state={avatarState}>
              {avatarState}
            </span>
            <button
              type="button"
              className="icon-button"
              onClick={() => setShowSettings(true)}
              aria-label="Settings"
              title="Settings"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </button>
          </div>
        </div>

        <div className="message-log" aria-label="Message log" role="log">
          {messageLog.length === 0 && (
            <p className="empty-chat">Say something to nano…</p>
          )}
          {nanoTyping && (
            <div className="typing-indicator" aria-label="nano is typing">
              <div className="typing-indicator-dot" />
              <div className="typing-indicator-dot" />
              <div className="typing-indicator-dot" />
            </div>
          )}
          {messageLog.map((msg) => (
            <div key={msg.id} className={`message message-${msg.from}`}>
              <div className="message-meta">
                <span className="message-sender">
                  {msg.from === "user" ? "You" : "nano"}
                </span>
                {msg.time && (
                  <span className="message-timestamp">
                    {msg.time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <button
                  type="button"
                  className="copy-btn"
                  aria-label="Copy message"
                  title="Copy"
                  /* eslint-disable-next-line no-undef */
                  onClick={() => { navigator.clipboard.writeText(msg.text); }}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                </button>
              </div>
              <div
                className="message-text"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.text) }}
              />
            </div>
          ))}
          <div ref={messageEndRef} />
        </div>

        <div className="chat-input-row">
          {sttSupported && (
            <button
              type="button"
              className={`mic-button ${sttListening ? "listening" : ""}`}
              aria-label={sttListening ? "Stop recording" : "Start voice input"}
              title={sttListening ? "Stop recording" : "Hold to speak"}
              disabled={agentState !== "connected"}
              onClick={() => {
                if (sttListening) {
                  stt.current.stop();
                  setSttListening(false);
                } else {
                  setText("");
                  const started = stt.current.start((transcript, isFinal) => {
                    if (isFinal) {
                      setText(transcript);
                      setSttListening(false);
                    }
                  });
                  setSttListening(started);
                }
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                <line x1="12" y1="19" x2="12" y2="23"/>
                <line x1="8" y1="23" x2="16" y2="23"/>
              </svg>
            </button>
          )}
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
      <SettingsPanel
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        pack={selectedPack}
        tts={tts.current}
        avatarState={avatarState}
        expression={currentExpression}
        autoLipSync
      />
    </main>
    </ErrorBoundary>
      );
  }
