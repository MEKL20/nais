// TTS service using browser Web Speech API
import type { VoiceYaml } from "@nais/character-schema";

export interface TtsOptions {
  voice?: SpeechSynthesisVoice;
  speed?: number; // 0.1 - 10, default 1.0
  pitch?: number; // -20 to 20, default 0
  volume?: number; // 0-2, default 1.0
}

export interface TtsService {
  speak(text: string): void;
  cancel(): void;
  setVoice(voice: SpeechSynthesisVoice | undefined): void;
  setOptions(opts: Partial<TtsOptions>): void;
  setEnabled(enabled: boolean): void;
  getVoices(): SpeechSynthesisVoice[];
  readonly enabled: boolean;
  readonly options: TtsOptions;
}

let cachedVoices: SpeechSynthesisVoice[] = [];
let voicesListenerInstalled = false;
const voiceWaiters = new Set<() => void>();
const handleVoicesChanged = (): void => {
  refreshVoices(true);
};

function getSpeechSynthesis(): SpeechSynthesis | undefined {
  return globalThis.window?.speechSynthesis;
}

function refreshVoices(notify = true): SpeechSynthesisVoice[] {
  const synth = getSpeechSynthesis();
  cachedVoices = synth?.getVoices() ?? [];
  if (notify) voiceWaiters.forEach((listener) => listener());
  return cachedVoices;
}

function ensureVoiceListener(): void {
  const synth = getSpeechSynthesis();
  if (!synth || voicesListenerInstalled) return;

  voicesListenerInstalled = true;
  synth.addEventListener("voiceschanged", handleVoicesChanged);
  refreshVoices(false);
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeLang(lang: string | undefined): string | undefined {
  const trimmed = lang?.trim().toLowerCase();
  return trimmed || undefined;
}

function isEnglishVoice(voice: SpeechSynthesisVoice): boolean {
  return voice.lang.toLowerCase().startsWith("en");
}

export function getBrowserVoices(): SpeechSynthesisVoice[] {
  ensureVoiceListener();
  return cachedVoices.length > 0 ? cachedVoices : refreshVoices(false);
}

export function onBrowserVoicesChanged(listener: () => void): () => void {
  ensureVoiceListener();
  voiceWaiters.add(listener);
  return () => voiceWaiters.delete(listener);
}

export function selectBestVoice(langHint?: string): SpeechSynthesisVoice | undefined {
  const voices = getBrowserVoices();
  const normalizedLang = normalizeLang(langHint);

  if (normalizedLang) {
    const exactLangMatch = voices.find((voice) => voice.lang.toLowerCase() === normalizedLang);
    if (exactLangMatch) return exactLangMatch;

    const languagePrefix = normalizedLang.split("-")[0];
    const prefixMatch = voices.find((voice) =>
      voice.lang.toLowerCase().startsWith(languagePrefix),
    );
    if (prefixMatch) return prefixMatch;
  }

  return voices.find(isEnglishVoice) ?? voices[0];
}

export function selectBrowserVoice(voiceConfig: VoiceYaml): SpeechSynthesisVoice | undefined {
  const voices = getBrowserVoices();
  const voiceId = voiceConfig.voice_id?.trim().toLowerCase();

  if (voiceId) {
    const nameMatch = voices.find((voice) => voice.name.toLowerCase() === voiceId);
    if (nameMatch) return nameMatch;

    const partialNameMatch = voices.find((voice) => voice.name.toLowerCase().includes(voiceId));
    if (partialNameMatch) return partialNameMatch;

    const langMatch = voices.find((voice) => voice.lang.toLowerCase() === voiceId);
    if (langMatch) return langMatch;
  }

  return selectBestVoice(voiceConfig.language);
}

function toWebSpeechPitch(pitch: number | undefined): number {
  const centeredPitch = clamp(pitch ?? 0, -20, 20);
  return clamp(1 + centeredPitch / 20, 0, 2);
}

export function createTtsService(voiceConfig?: VoiceYaml): TtsService {
  ensureVoiceListener();

  let enabled = voiceConfig?.enabled ?? true;
  let options: TtsOptions = {
    voice: voiceConfig ? selectBrowserVoice(voiceConfig) : selectBestVoice("en"),
    speed: voiceConfig?.speed ?? 1.0,
    pitch: voiceConfig?.pitch ?? 0,
    volume: voiceConfig?.volume ?? 1.0,
  };

  return {
    speak(text: string): void {
      const synth = getSpeechSynthesis();
      const trimmed = text.trim();
      if (!enabled || !synth || !trimmed) return;

      const utterance = new SpeechSynthesisUtterance(trimmed);
      utterance.rate = clamp(options.speed ?? 1.0, 0.1, 10);
      utterance.pitch = toWebSpeechPitch(options.pitch);
      utterance.volume = clamp(options.volume ?? 1.0, 0, 1);
      if (options.voice) utterance.voice = options.voice;

      synth.speak(utterance);
    },
    cancel(): void {
      getSpeechSynthesis()?.cancel();
    },
    setVoice(voice: SpeechSynthesisVoice | undefined): void {
      options = { ...options, voice };
    },
    setOptions(opts: Partial<TtsOptions>): void {
      options = { ...options, ...opts };
    },
    setEnabled(nextEnabled: boolean): void {
      enabled = nextEnabled;
      if (!enabled) getSpeechSynthesis()?.cancel();
    },
    getVoices(): SpeechSynthesisVoice[] {
      return getBrowserVoices();
    },
    get enabled(): boolean {
      return enabled;
    },
    get options(): TtsOptions {
      return options;
    },
  };
}
