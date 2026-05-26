// Settings panel component - slide-in from right
// Tabs: Voice | Avatar | About

import React, { useEffect, useMemo, useState } from "react";

import type { CharacterPackDetail } from "../services/characters";
import { onBrowserVoicesChanged, type TtsService } from "../services/tts";

type SettingsTab = "voice" | "avatar" | "about";

export interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  pack: CharacterPackDetail | null;
  tts: TtsService;
  avatarState?: string;
  expression?: string;
  autoLipSync?: boolean;
}

function voiceKey(voice: SpeechSynthesisVoice): string {
  return `${voice.name}::${voice.lang}`;
}

export function SettingsPanel({
  isOpen,
  onClose,
  pack,
  tts,
  avatarState = "idle",
  expression = "neutral",
  autoLipSync = true,
}: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("voice");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => tts.getVoices());
  const [enabled, setEnabled] = useState(tts.enabled);
  const [speed, setSpeed] = useState(tts.options.speed ?? 1.0);
  const [pitch, setPitch] = useState(tts.options.pitch ?? 0);
  const [volume, setVolume] = useState(tts.options.volume ?? 1.0);
  const [selectedVoiceKey, setSelectedVoiceKey] = useState(
    tts.options.voice ? voiceKey(tts.options.voice) : "",
  );

  useEffect(() => {
    const refresh = () => setVoices(tts.getVoices());
    refresh();
    return onBrowserVoicesChanged(refresh);
  }, [tts]);

  useEffect(() => {
    setEnabled(tts.enabled);
    setSpeed(tts.options.speed ?? 1.0);
    setPitch(tts.options.pitch ?? 0);
    setVolume(tts.options.volume ?? 1.0);
    setSelectedVoiceKey(tts.options.voice ? voiceKey(tts.options.voice) : "");
  }, [pack, tts]);

  const filteredVoices = useMemo(() => {
    const language = pack?.voice?.language?.trim().toLowerCase();
    if (!language) return voices;

    const languagePrefix = language.split("-")[0];
    const matchingVoices = voices.filter((voice) =>
      voice.lang.toLowerCase().startsWith(languagePrefix),
    );
    return matchingVoices.length > 0 ? matchingVoices : voices;
  }, [pack?.voice?.language, voices]);

  const selectedVoice = filteredVoices.find((voice) => voiceKey(voice) === selectedVoiceKey);

  const handleEnabledChange = (nextEnabled: boolean) => {
    setEnabled(nextEnabled);
    tts.setEnabled(nextEnabled);
  };

  const handleVoiceChange = (key: string) => {
    setSelectedVoiceKey(key);
    const nextVoice = voices.find((voice) => voiceKey(voice) === key);
    tts.setVoice(nextVoice);
  };

  const handleSpeedChange = (nextSpeed: number) => {
    setSpeed(nextSpeed);
    tts.setOptions({ speed: nextSpeed });
  };

  const handlePitchChange = (nextPitch: number) => {
    setPitch(nextPitch);
    tts.setOptions({ pitch: nextPitch });
  };

  const handleVolumeChange = (nextVolume: number) => {
    setVolume(nextVolume);
    tts.setOptions({ volume: nextVolume });
  };

  return (
    <aside className={`settings-panel ${isOpen ? "open" : ""}`} aria-label="Settings panel">
      <div className="settings-header">
        <h3>Settings</h3>
        <button type="button" className="settings-close" onClick={onClose} aria-label="Close settings">
          X
        </button>
      </div>

      <div className="settings-tabs" role="tablist" aria-label="Settings tabs">
        {(["voice", "avatar", "about"] as const).map((tab) => (
          <button
            key={tab}
            type="button"
            role="tab"
            className={`settings-tab ${activeTab === tab ? "active" : ""}`}
            aria-selected={activeTab === tab}
            onClick={() => setActiveTab(tab)}
          >
            {tab[0].toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      <div className="settings-body">
        {activeTab === "voice" && (
          <>
            <section className="settings-section">
              <div className="settings-row">
                <div>
                  <label htmlFor="tts-enabled">Enable TTS</label>
                  <p className="hint">Use browser speech synthesis for agent replies.</p>
                </div>
                <label className="toggle-switch" htmlFor="tts-enabled">
                  <input
                    id="tts-enabled"
                    type="checkbox"
                    checked={enabled}
                    onChange={(event) => handleEnabledChange(event.target.checked)}
                  />
                  <span className="toggle-slider" />
                </label>
              </div>
            </section>

            <section className="settings-section">
              <p className="settings-section-title">Voice</p>
              <select
                className="settings-select"
                value={selectedVoiceKey}
                onChange={(event) => handleVoiceChange(event.target.value)}
              >
                <option value="">Auto select voice</option>
                {filteredVoices.map((voice) => (
                  <option key={voiceKey(voice)} value={voiceKey(voice)}>
                    {voice.name} ({voice.lang})
                  </option>
                ))}
              </select>
              <p className="hint">
                {selectedVoice ? `Selected: ${selectedVoice.name}` : "Fallback uses English or first available voice."}
              </p>
            </section>

            <section className="settings-section settings-slider-row">
              <div className="settings-slider-label">
                <span>Speed</span>
                <span>{speed.toFixed(1)}</span>
              </div>
              <input
                className="settings-slider"
                type="range"
                min="0.5"
                max="2"
                step="0.1"
                value={speed}
                onChange={(event) => handleSpeedChange(Number(event.target.value))}
              />
            </section>

            <section className="settings-section settings-slider-row">
              <div className="settings-slider-label">
                <span>Pitch</span>
                <span>{pitch.toFixed(0)}</span>
              </div>
              <input
                className="settings-slider"
                type="range"
                min="-10"
                max="10"
                step="1"
                value={pitch}
                onChange={(event) => handlePitchChange(Number(event.target.value))}
              />
            </section>

            <section className="settings-section settings-slider-row">
              <div className="settings-slider-label">
                <span>Volume</span>
                <span>{volume.toFixed(1)}</span>
              </div>
              <input
                className="settings-slider"
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(event) => handleVolumeChange(Number(event.target.value))}
              />
            </section>

            <button
              type="button"
              className="test-voice-btn"
              onClick={() => tts.speak("Hi, I am nano. This is a voice test.")}
            >
              Test
            </button>
          </>
        )}

        {activeTab === "avatar" && (
          <>
            <section className="settings-section">
              <p className="settings-section-title">Character</p>
              <div className="settings-row">
                <label>Pack</label>
                <span className="hint">{pack?.name ?? "No pack selected"}</span>
              </div>
              <div className="settings-row">
                <label>Expression</label>
                <span className="hint">{expression}</span>
              </div>
              <div className="settings-row">
                <label>State</label>
                <span className="hint">{avatarState}</span>
              </div>
            </section>

            <section className="settings-section">
              <div className="settings-row">
                <div>
                  <label htmlFor="auto-lip-sync">AutoLipSync</label>
                  <p className="hint">Current state only.</p>
                </div>
                <label className="toggle-switch" htmlFor="auto-lip-sync">
                  <input id="auto-lip-sync" type="checkbox" checked={autoLipSync} readOnly />
                  <span className="toggle-slider" />
                </label>
              </div>
            </section>
          </>
        )}

        {activeTab === "about" && (
          <>
            <section className="settings-section">
              <p className="settings-section-title">NAIS Desktop</p>
              <div className="settings-row">
                <label>Version</label>
                <span className="hint">0.1.0</span>
              </div>
            </section>

            <section className="settings-section">
              <p className="settings-section-title">Character Pack</p>
              <div className="settings-row">
                <label>Name</label>
                <span className="hint">{pack?.name ?? "None"}</span>
              </div>
              <div className="settings-row">
                <label>ID</label>
                <span className="hint">{pack?.id ?? "-"}</span>
              </div>
              <div className="settings-row">
                <label>Voice</label>
                <span className="hint">{pack?.voice?.enabled ? "Enabled" : "Disabled"}</span>
              </div>
            </section>
          </>
        )}
      </div>
    </aside>
  );
}
