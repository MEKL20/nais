/// <reference types="vite/client" />

interface Window {
  __NAIS_SMOKE_BYPASS_CONNECT__?: boolean;
  __NAIS_SMOKE_PACK_ID__?: string;
  __TAURI_INTERNALS__?: {
    invoke<T>(cmd: string, args?: Record<string, unknown>, options?: unknown): Promise<T>;
    convertFileSrc(filePath: string, protocol?: string): string;
  };
}
