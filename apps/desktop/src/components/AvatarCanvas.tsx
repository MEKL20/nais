// AvatarCanvas — renders the reactive orb/avatar state in NAIS desktop.

import React, { useEffect, useRef } from "react";
import type { AvatarState, AvatarExpression } from "@nais/avatar-runtime";

export interface AvatarCanvasProps {
  state: AvatarState;
  expression?: AvatarExpression;
  mouthOpen?: number;
}

/** Map avatar state → CSS color theme. */
const STATE_THEMES: Record<AvatarState, { core: string; glow: string; accent: string }> = {
  idle:      { core: "#4a5568", glow: "#718096", accent: "#a0aec0" },
  listening: { core: "#2b6cb0", glow: "#3182ce", accent: "#63b3ed" },
  thinking:  { core: "#6b46c1", glow: "#805ad5", accent: "#b794f4" },
  speaking:  { core: "#2f855a", glow: "#38a169", accent: "#68d391" },
  success:   { core: "#276749", glow: "#2f855a", accent: "#48bb78" },
  warning:   { core: "#b7791f", glow: "#d69e2e", accent: "#ecc94b" },
  error:     { core: "#9b2335", glow: "#c53030", accent: "#fc8181" },
};

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  state = "idle",
  mouthOpen = 0,
}) => {
  const theme = STATE_THEMES[state] ?? STATE_THEMES.idle;
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Simple animated orb — a pulsing circle on canvas.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let raf: number;
    let phase = 0;

    const draw = () => {
      const { width: w, height: h } = canvas;
      const cx = w / 2;
      const cy = h / 2;
      const baseR = Math.min(w, h) * 0.35;
      const pulse = Math.sin(phase) * baseR * 0.04;
      const r = baseR + pulse;

      ctx.clearRect(0, 0, w, h);

      // Outer glow.
      const grad = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6);
      grad.addColorStop(0, theme.glow + "cc");
      grad.addColorStop(1, theme.glow + "00");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Core orb.
      const coreGrad = ctx.createRadialGradient(
        cx - r * 0.2, cy - r * 0.2, r * 0.05,
        cx, cy, r,
      );
      coreGrad.addColorStop(0, theme.accent);
      coreGrad.addColorStop(1, theme.core);
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();

      // Mouth — small ellipse at bottom third.
      if (mouthOpen > 0.01) {
        const mouthY = cy + r * 0.38;
        const mouthW = r * 0.28;
        const mouthH = r * mouthOpen * 0.45;
        ctx.fillStyle = theme.core;
        ctx.beginPath();
        ctx.ellipse(cx, mouthY, mouthW, mouthH, 0, 0, Math.PI * 2);
        ctx.fill();
      }

      phase += 0.05;
      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [state, mouthOpen, theme]);

  return (
    <canvas
      ref={canvasRef}
      width={320}
      height={320}
      style={{ display: "block", margin: "0 auto", borderRadius: "50%" }}
      aria-label={`NAIS avatar state: ${state}`}
    />
  );
};
