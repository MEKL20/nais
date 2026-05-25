// AvatarCanvas — renders the reactive orb/avatar state in NAIS desktop.

import React, { useEffect, useRef } from "react";
import type { AvatarState } from "@nais/avatar-runtime";

export interface AvatarCanvasProps {
  state: AvatarState;
  expression?: string;
  mouthOpen?: number;
}

/** Map avatar state → base color theme. */
const STATE_THEMES: Record<AvatarState, { core: string; glow: string; accent: string }> = {
  idle:      { core: "#4a5568", glow: "#718096", accent: "#a0aec0" },
  listening: { core: "#2b6cb0", glow: "#3182ce", accent: "#63b3ed" },
  thinking:  { core: "#6b46c1", glow: "#805ad5", accent: "#b794f4" },
  speaking:  { core: "#2f855a", glow: "#38a169", accent: "#68d391" },
  success:   { core: "#276749", glow: "#2f855a", accent: "#48bb78" },
  warning:   { core: "#b7791f", glow: "#d69e2e", accent: "#ecc94b" },
  error:     { core: "#9b2335", glow: "#c53030", accent: "#fc8181" },
};

/** Expression name → hue shift (degrees). Applied on top of state theme. */
const EXPRESSION_HUE: Record<string, number> = {
  neutral:   0,
  happy:     20,
  focused:  -10,
  thinking: -30,
  alert:    40,
  confused: 180,
  sad:     200,
  angry:   350,
};

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  h = ((h % 360) + 360) % 360;
  s = Math.max(0, Math.min(100, s)) / 100;
  l = Math.max(0, Math.min(100, l)) / 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function shiftTheme(
  base: { core: string; glow: string; accent: string },
  hueShift: number,
): { core: string; glow: string; accent: string } {
  if (hueShift === 0) return base;
  const shift = (hex: string) => {
    const [h, s, l] = hexToHsl(hex);
    return hslToHex(h + hueShift, s, l);
  };
  return {
    core:   shift(base.core),
    glow:   shift(base.glow),
    accent: shift(base.accent),
  };
}

export const AvatarCanvas: React.FC<AvatarCanvasProps> = ({
  state = "idle",
  expression,
  mouthOpen = 0,
}) => {
  const baseTheme = STATE_THEMES[state] ?? STATE_THEMES.idle;
  const hue = expression ? (EXPRESSION_HUE[expression] ?? 0) : 0;
  const theme = shiftTheme(baseTheme, hue);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Animated orb render loop.
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
      const glow = ctx.createRadialGradient(cx, cy, r * 0.6, cx, cy, r * 1.6);
      glow.addColorStop(0, theme.glow + "cc");
      glow.addColorStop(1, theme.glow + "00");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.6, 0, Math.PI * 2);
      ctx.fill();

      // Core orb with specular highlight.
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

      // Mouth.
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
      aria-label={`NAIS avatar: ${state}${expression ? ` / ${expression}` : ""}`}
    />
  );
};
