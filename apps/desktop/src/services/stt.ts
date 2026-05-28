// STT service using browser Web Speech API (SpeechRecognition)
export interface SttOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
}

export interface SttService {
  start(onResult: (transcript: string, isFinal: boolean) => void): boolean;
  stop(): void;
  abort(): void;
  readonly listening: boolean;
}

const SPEECHREC_KEY =
  typeof window !== "undefined" ? "SpeechRecognition" : "webkitSpeechRecognition";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSpeechRec(): any {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (globalThis as any)[SPEECHREC_KEY];
}

export function isSttSupported(): boolean {
  const sr = getSpeechRec();
  return typeof sr !== "undefined";
}

export function createSttService(opts: SttOptions = {}): SttService {
  const { lang = "en-US", continuous = false, interimResults = true } = opts;
  let listening = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let recognition: InstanceType<any> | null = null;

  if (isSttSupported()) {
    const SR = getSpeechRec();
    recognition = new SR();
    recognition.lang = lang;
    recognition.continuous = continuous;
    recognition.interimResults = interimResults;
    recognition.maxAlternatives = 1;
  }

  return {
    get listening() { return listening; },

    start(onResult) {
      if (!recognition) return false;
      if (listening) return true;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onresult = (event: any) => {
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            onResult(result[0].transcript.trim(), true);
          } else if (interimResults) {
            onResult(result[0].transcript.trim(), false);
          }
        }
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      recognition.onerror = (event: any) => {
        if (event.error === "no-speech") return;
        if (event.error === "aborted") return;
        console.warn("[STT] recognition error:", event.error);
        listening = false;
      };
      recognition.onend = () => { listening = false; };

      try {
        recognition.start();
        listening = true;
      } catch {
        listening = false;
      }
      return listening;
    },

    stop() {
      if (recognition !== null && listening) {
        recognition.stop();
        listening = false;
      }
    },

    abort() {
      if (recognition) {
        recognition.abort();
        listening = false;
      }
    },
  };
}
