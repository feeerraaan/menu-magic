import React, { type ReactNode } from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, Img } from 'remotion';
import { C, F, FONT_FACE } from './theme';

// Global font-face + base resets, rendered once at the top of each composition.
export const GlobalStyle: React.FC = () => (
  <style>{`
    * { box-sizing: border-box; margin: 0; padding: 0; }
    html, body, #root { background: ${C.ink}; }
    ${FONT_FACE}
  `}</style>
);

// Cinematic scene wrapper: velocity-matched zoom-through entry/exit.
// dir='in'  -> the scene pushes in from behind (scale down into place).
// dir='out' -> the scene pulls back (scale up) into place, for contrast beats.
export const Scene: React.FC<{
  durationInFrames: number;
  children: ReactNode;
  bg?: string;
  dir?: 'in' | 'out' | 'none';
  driftX?: number;
  driftY?: number;
}> = ({ durationInFrames, children, bg, dir = 'in', driftX = 0, driftY = 0 }) => {
  const frame = useCurrentFrame();
  const ENTER = 20;
  const EXIT = 15;
  const enterScale = dir === 'out' ? 0.93 : dir === 'none' ? 1 : 1.08;
  const enter = interpolate(frame, [0, ENTER], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.exp),
  });
  const exit = interpolate(frame, [durationInFrames - EXIT, durationInFrames - 1], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.quad),
  });
  const opacity = Math.min(1, enter * 1.6) * (1 - exit);
  const scale = 1 + (1 - enter) * (enterScale - 1) + exit * 0.1;
  const tx = (1 - enter) * driftX;
  const ty = (1 - enter) * driftY;
  return (
    <AbsoluteFill style={{ background: bg ?? C.ink, opacity, transform: `scale(${scale}) translate(${tx}px, ${ty}px)` }}>
      {children}
    </AbsoluteFill>
  );
};

// Word-by-word kinetic reveal. Accent words render on the web's brand gradient.
export const KineticText: React.FC<{
  text: string;
  style?: React.CSSProperties;
  wordStyle?: React.CSSProperties;
  stagger?: number;
  delay?: number;
  accentFrom?: number;
  accentColor?: string;
  gradient?: boolean;
  font?: string;
}> = ({
  text,
  style,
  wordStyle,
  stagger = 2.2,
  delay = 0,
  accentFrom = -1,
  accentColor = C.terracotta2,
  gradient = false,
  font = F.display,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const words = text.split(' ');
  return (
    <div style={{ fontFamily: font, display: 'flex', flexWrap: 'wrap', ...style }}>
      {words.map((w, i) => {
        const s = spring({
          frame: frame - delay - i * stagger,
          fps,
          config: { damping: 200, stiffness: 110 },
        });
        const opacity = s;
        const translateY = interpolate(s, [0, 1], [26, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        const accent = accentFrom >= 0 && i >= accentFrom;
        const g = gradient && accent;
        return (
          <span
            key={i}
            style={{
              opacity,
              transform: `translateY(${translateY}px)`,
              display: 'inline-block',
              marginRight: '0.24em',
              color: g ? 'transparent' : accent ? accentColor : undefined,
              backgroundImage: g
                ? `linear-gradient(90deg, ${C.terracotta}, ${C.terracotta2}, ${C.amber})`
                : undefined,
              WebkitBackgroundClip: g ? 'text' : undefined,
              backgroundClip: g ? 'text' : undefined,
              ...wordStyle,
            }}
          >
            {w}
          </span>
        );
      })}
    </div>
  );
};

// Simple fade+rise in.
export const FadeIn: React.FC<{
  children: ReactNode;
  delay?: number;
  duration?: number;
  rise?: number;
  style?: React.CSSProperties;
}> = ({ children, delay = 0, duration = 20, rise = 22, style }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  return (
    <div style={{ opacity: p, transform: `translateY(${(1 - p) * rise}px)`, ...style }}>{children}</div>
  );
};

// Radial terracotta glow behind content.
export const Glow: React.FC<{ color?: string; size?: number; x?: string | number; y?: string | number }> = ({
  color = C.terracotta,
  size = 900,
  x = '50%',
  y = '40%',
}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: size,
      height: size,
      transform: 'translate(-50%, -50%)',
      borderRadius: '50%',
      // No blur filter: a radial gradient is already smooth, and blurring a
      // 1300 px layer every frame is one of the most expensive things a
      // software renderer can be asked to do.
      background: `radial-gradient(circle, ${color}33 0%, ${color}14 38%, transparent 62%)`,
    }}
  />
);

// Subtle film grain overlay (static).
//
// This used to be an inline SVG feTurbulence tile composited with
// mix-blend-mode: overlay. On a box rendering through software GL that cost
// about 0.6 s per frame, because a full frame blend mode forces the whole layer
// stack to be composited every frame. A pre-baked noise tile at plain opacity
// looks the same and is effectively free.
const NOISE = 'data:image/png;base64,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';

export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.045 }) => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      opacity,
      backgroundImage: `url(${NOISE})`,
      backgroundRepeat: 'repeat',
      pointerEvents: 'none',
    }}
  />
);

// Fine grid backdrop, matching the landing hero.
export const GridLines: React.FC = () => (
  <div
    style={{
      position: 'absolute',
      inset: 0,
      backgroundImage:
        'linear-gradient(to right, rgba(128,128,128,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(128,128,128,0.07) 1px, transparent 1px)',
      backgroundSize: '48px 48px',
    }}
  />
);

// Web-style brand gradient text (terracotta -> orange -> amber).
export const GradientText: React.FC<{
  children: ReactNode;
  style?: React.CSSProperties;
}> = ({ children, style }) => (
  <span
    style={{
      backgroundImage: `linear-gradient(90deg, ${C.terracotta}, ${C.terracotta2}, ${C.amber})`,
      WebkitBackgroundClip: 'text',
      backgroundClip: 'text',
      color: 'transparent',
      ...style,
    }}
  >
    {children}
  </span>
);

// Hero-style pill badge.
export const PillBadge: React.FC<{ children: ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 10,
      border: `1px solid ${C.terracotta}4d`,
      background: `${C.terracotta}14`,
      color: C.terracotta2,
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: 20,
      padding: '8px 22px',
      borderRadius: 999,
      ...style,
    }}
  >
    {children}
  </div>
);

// A browser window frame around a screenshot, with Ken Burns pan/zoom.
export const BrowserFrame: React.FC<{
  src: string;
  width?: number;
  title?: string;
  scale?: number;
  panX?: number;
  panY?: number;
  kb?: { from: number; to: number; x0: number; x1: number; y0: number; y1: number };
  style?: React.CSSProperties;
}> = ({ src, width = 980, title = 'SaCarta', scale = 1, panX = 0, panY = 0, kb, style }) => {
  const frame = useCurrentFrame();
  const fx = kb ? interpolate(frame, [kb.from, kb.to], [kb.x0, kb.x1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : panX;
  const fy = kb ? interpolate(frame, [kb.from, kb.to], [kb.y0, kb.y1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : panY;
  const fz = kb ? interpolate(frame, [kb.from, kb.to], [1, 1.06], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) : 1;
  return (
    <div
      style={{
        width,
        borderRadius: 14,
        overflow: 'hidden',
        background: C.card,
        border: `1px solid ${C.line}`,
        boxShadow: `0 30px 90px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)`,
        fontFamily: F.sans,
        transform: `scale(${scale})`,
        ...style,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 16px', background: C.ink2, borderBottom: `1px solid ${C.line}` }}>
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
        <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
        <span style={{ marginLeft: 10, fontSize: 13, color: C.muted }}>{title}</span>
      </div>
      <div style={{ width, height: width * 0.62, overflow: 'hidden', background: '#fff' }}>
        <img
          src={src}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: `${fx}% ${fy}%`,
            transform: `scale(${fz})`,
            display: 'block',
          }}
        />
      </div>
    </div>
  );
};

// A phone frame around a screenshot.
export const PhoneFrame: React.FC<{ src: string; height?: number; style?: React.CSSProperties }> = ({
  src,
  height = 640,
  style,
}) => (
  <div
    style={{
      height,
      aspectRatio: '9 / 19.5',
      borderRadius: 34,
      overflow: 'hidden',
      border: `6px solid #0c0a09`,
      boxShadow: `0 30px 90px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.08)`,
      background: '#fff',
      ...style,
    }}
  >
    <Img src={src} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
  </div>
);

// Big Playfair headline helper.
export const Headline: React.FC<{ children: ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: F.serif,
      fontSize: 108,
      lineHeight: 1.02,
      color: C.cream,
      fontWeight: 600,
      letterSpacing: '-0.02em',
      ...style,
    }}
  >
    {children}
  </div>
);

// Small overline label.
export const Kicker: React.FC<{ children: ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      fontFamily: F.sans,
      fontSize: 22,
      letterSpacing: '0.32em',
      textTransform: 'uppercase',
      color: C.terracotta2,
      fontWeight: 600,
      ...style,
    }}
  >
    {children}
  </div>
);
