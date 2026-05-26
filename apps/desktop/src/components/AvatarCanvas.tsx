// AvatarCanvas — stable host for the active avatar renderer.

import type { AvatarState } from "@nais/avatar-runtime";
import React, { useCallback } from "react";

export interface AvatarCanvasProps {
  /** Current avatar semantic state. */
  state?: AvatarState;
  /** Current expression name. */
  expression?: string;
  /** Current mouth openness 0..1. */
  mouthOpen?: number;
  /** Whether the runtime has an active model loaded. */
  modelLoaded?: boolean;
  /** Runtime load/render error, if any. */
  error?: string;
  /** Called with the host element that runtime adapters append canvases into. */
  onContainerRef?: (_el: globalThis.HTMLDivElement | null) => void;
}

const STATE_COLORS: Record<AvatarState, string> = {
  idle: "#4a5568",
  listening: "#2b6cb0",
  thinking: "#6b46c1",
  speaking: "#2f855a",
  success: "#276749",
  warning: "#b7791f",
  error: "#9b2335",
};

function OrbPlaceholder({ state, error }: { state: AvatarState; error?: string }) {
  const color = STATE_COLORS[state] ?? STATE_COLORS.idle;

  return (
    <div className="avatar-placeholder" style={{ "--avatar-color": color } as React.CSSProperties}>
      <div className="avatar-placeholder-core" />
      <p>{error ? "Avatar model unavailable" : "No model loaded"}</p>
      {error && <span>{error}</span>}
    </div>
  );
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  state = "idle",
  expression = "neutral",
  mouthOpen = 0,
  modelLoaded = false,
  error,
  onContainerRef,
}) => {
  const setHostRef = useCallback(
    (el: globalThis.HTMLDivElement | null) => {
      onContainerRef?.(el);
    },
    [onContainerRef],
  );

  return (
    <div
      className="avatar-stage"
      aria-label={`NAIS avatar: ${state} / ${expression}`}
      data-state={state}
      data-mouth-open={mouthOpen > 0.01 ? "true" : "false"}
    >
      <div ref={setHostRef} className="avatar-render-host" aria-hidden={!modelLoaded} />
      {!modelLoaded && <OrbPlaceholder state={state} error={error} />}
    </div>
  );
};
