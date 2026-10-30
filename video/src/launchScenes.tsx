import React from 'react';
import { AbsoluteFill, interpolate, spring, useVideoConfig, Easing, staticFile, Img } from 'remotion';
import { C, F } from './theme';
import { SHOTS } from './shots';
import TARGETS from './targets.json';
import {
  BrowserStage,
  PhoneStage,
  Cursor,
  TouchRing,
  TypeOn,
  Ring,
  Shimmer,
  Callout,
  CountUp,
  Cascade,
  ContactShadow,
  ShotCrop,
  Vignette,
  Stage,
  DiningRoom,
  track,
  useSceneFrame,
  useBare,
  type CamKey,
} from './cinematic';
import { KineticText, FadeIn, PillBadge } from './components';
import { Cue, Sfx } from './sfx';

// The brand mark and the topology diagram come from public/, not from the data
// URI bundle: logo-alpha.png is logo.png with its black matte keyed out, so the
// mark sits on the dark stage without a box around it.
const logo = staticFile('logo-alpha.png');
const architecture = staticFile('architecture.png');

// ---------------------------------------------------------------------------
// Shared furniture
// ---------------------------------------------------------------------------

type Box = { x: number; y: number; w: number; h: number; cx: number; cy: number };
const T = (name: keyof typeof TARGETS): Box => TARGETS[name] as Box;

/**
 * The two window poses every product scene alternates between.
 *
 * `aside` is the text beat: the window dollies across and shrinks, opening a
 * third of the frame for a headline. `full` is the action beat: the window fills
 * the frame and the only overlays left are a kicker and a payoff pill. Moving
 * between them IS a camera move, which is why a headline never has to be pasted
 * on top of the UI where it cannot be read.
 */
const POSE = {
  full: { w: 1400, cx: 960, cy: 566 },
  aside: { w: 1010, cx: 1372, cy: 566 },
  asideLeft: { w: 1010, cx: 548, cy: 566 },
};

const Stagelight: React.FC<{ warm?: boolean }> = ({ warm }) => <Stage variant={warm ? 'stage-warm' : 'stage'} />;

const Kick: React.FC<{ children: React.ReactNode; delay?: number; x?: number; y?: number; fade?: number }> = ({
  children,
  delay = 4,
  x = 108,
  y = 62,
  fade,
}) => {
  const frame = useSceneFrame();
  const bare = useBare();
  const p = interpolate(frame, [delay, delay + 14], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 14], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (bare) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        opacity: p * out,
        transform: `translateX(${(1 - p) * -18}px)`,
        fontFamily: F.sans,
        fontSize: 19,
        letterSpacing: '0.30em',
        textTransform: 'uppercase',
        color: C.terracotta2,
        fontWeight: 600,
      }}
    >
      {children}
    </div>
  );
};

/** A payoff pill that lands on the canvas once a beat has resolved. */
const Payoff: React.FC<{ children: React.ReactNode; start: number; fade?: number; y?: number; x?: number }> = ({
  children,
  start,
  fade,
  y = 986,
  x = 960,
}) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const bare = useBare();
  const s = spring({ frame: frame - start, fps, config: { damping: 200, stiffness: 130 } });
  if (bare || frame < start) return null;
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) translateY(${(1 - s) * 18}px)`,
        opacity: s * out,
      }}
    >
      <Cue at={start} src={Sfx.chime} volume={0.4} />
      <PillBadge
        style={{
          fontSize: 21,
          padding: '11px 26px',
          background: 'rgba(20,15,12,0.94)',
          border: `1px solid ${C.terracotta}66`,
        }}
      >
        {children}
      </PillBadge>
    </div>
  );
};

/** The headline used on every text beat, sized for the open third of the frame. */
const Beat: React.FC<{
  lines: [string, string?];
  start?: number;
  x?: number;
  y?: number;
  width?: number;
  size?: number;
  sub?: string;
  align?: 'left' | 'center';
  fade?: number;
}> = ({ lines, start = 6, x = 110, y = 330, width = 700, size = 66, sub, align = 'left', fade }) => {
  const frame = useSceneFrame();
  const bare = useBare();
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  if (bare || out <= 0) return null;
  return (
    <div style={{ position: 'absolute', left: x, top: y, width, opacity: out, textAlign: align }}>
      <KineticText
        text={lines[0]}
        delay={start}
        stagger={2.6}
        style={{
          fontSize: size,
          lineHeight: 1.05,
          color: C.cream,
          fontFamily: F.serif,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          justifyContent: align === 'center' ? 'center' : 'flex-start',
        }}
      />
      {lines[1] && (
        <KineticText
          text={lines[1]}
          delay={start + 12}
          stagger={2.6}
          gradient
          accentFrom={0}
          style={{
            fontSize: size,
            lineHeight: 1.05,
            color: C.cream,
            fontFamily: F.serif,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            justifyContent: align === 'center' ? 'center' : 'flex-start',
          }}
        />
      )}
      {sub && (
        <FadeIn delay={start + 26}>
          <p style={{ fontFamily: F.sans, fontSize: 22, color: C.muted, marginTop: 24, lineHeight: 1.5 }}>{sub}</p>
        </FadeIn>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 1 · COLD OPEN: the dead menu
// ---------------------------------------------------------------------------

const PaperMenu: React.FC = () => (
  <div
    style={{
      width: 620,
      height: 830,
      background: 'linear-gradient(168deg, #f6f1e6 0%, #eee7d8 55%, #e4dcc9 100%)',
      borderRadius: 3,
      padding: '64px 58px',
      fontFamily: F.serif,
      color: '#2b2419',
      boxShadow: '0 60px 120px rgba(0,0,0,0.75), 0 2px 0 rgba(255,255,255,0.4) inset',
    }}
  >
    <div style={{ textAlign: 'center', fontSize: 15, letterSpacing: '0.44em', textTransform: 'uppercase', color: '#8a7d63', fontFamily: F.sans }}>
      Restaurante
    </div>
    <div style={{ textAlign: 'center', fontSize: 52, marginTop: 14, fontWeight: 600, letterSpacing: '-0.01em' }}>Carta</div>
    <div style={{ height: 1, background: '#c9bda1', margin: '30px 0 34px' }} />
    {[
      ['Pan con tomate', '6,50'],
      ['Croquetas de jamón', '9,00'],
      ['Ensalada mallorquina', '8,90'],
      ['Pulpo a la brasa', '18,00'],
      ['Arroz de bogavante', '26,00'],
      ['Dorada a la plancha', '22,50'],
      ['Cordero al horno', '24,00'],
      ['Flan de la casa', '5,50'],
    ].map(([n, p], i) => (
      <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 10, marginBottom: 26, fontSize: 25 }}>
        <span>{n}</span>
        <span style={{ flex: 1, borderBottom: '1px dotted #b9ac8e', transform: 'translateY(-5px)' }} />
        <span style={{ color: '#5c5241' }}>{p}</span>
      </div>
    ))}
  </div>
);

export const ColdOpenScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();

  const rise = spring({ frame: frame - 6, fps, config: { damping: 200, stiffness: 26 } });
  const fall = interpolate(frame, [228, 268], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });
  const push = interpolate(frame, [0, 270], [1.14, 1.0], { easing: Easing.out(Easing.poly(3)), extrapolateRight: 'clamp' });
  const grey = interpolate(frame, [128, 172], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const lightR = interpolate(frame, [230, 270], [1, 0.06], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.in(Easing.cubic),
  });

  return (
    <AbsoluteFill style={{ background: '#090706' }}>
      {/* The single top light. It collapses to a point that becomes the logo glow. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          width: 1500 * lightR,
          height: 1500 * lightR,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.amber}2b 0%, ${C.terracotta}14 34%, transparent 66%)`,
        }}
      />
      <AbsoluteFill style={{ perspective: 1800, alignItems: 'center', justifyContent: 'center' }}>
        <div
          style={{
            transform: `scale(${push}) translateY(${(1 - rise) * 120 + fall * 260}px) rotateX(${58 - rise * 6 + fall * 22}deg) rotateZ(${-3 + fall * 5}deg)`,
            transformStyle: 'preserve-3d',
            opacity: rise * (1 - fall),
            filter: `saturate(${1 - grey * 0.85}) brightness(${1 - grey * 0.28})`,
          }}
        >
          <PaperMenu />
        </div>
      </AbsoluteFill>

      <div style={{ position: 'absolute', left: 0, right: 0, top: 286, textAlign: 'center' }}>
        <div style={{ opacity: interpolate(frame, [122, 148], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <KineticText
            text="Every restaurant has a menu."
            delay={58}
            stagger={3.2}
            style={{
              fontSize: 76,
              justifyContent: 'center',
              color: C.cream,
              fontFamily: F.serif,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              textShadow: '0 8px 40px rgba(0,0,0,0.85)',
            }}
          />
        </div>
      </div>
      <div style={{ position: 'absolute', left: 0, right: 0, top: 286, textAlign: 'center' }}>
        <div style={{ opacity: interpolate(frame, [224, 244], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <KineticText
            text="Almost none of them work."
            delay={166}
            stagger={3.2}
            gradient
            accentFrom={1}
            style={{
              fontSize: 76,
              justifyContent: 'center',
              color: C.cream,
              fontFamily: F.serif,
              fontWeight: 600,
              letterSpacing: '-0.02em',
              textShadow: '0 8px 40px rgba(0,0,0,0.85)',
            }}
          />
        </div>
      </div>

      {frame >= 138 && (
        <div
          style={{
            position: 'absolute',
            left: 1240,
            top: 766,
            transform: `rotate(-8deg) scale(${interpolate(frame, [138, 150], [1.4, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) })})`,
            opacity: interpolate(frame, [138, 150, 220, 240], [0, 0.92, 0.92, 0]),
            border: `2.5px solid ${C.terracotta}`,
            color: C.terracotta2,
            fontFamily: F.sans,
            fontSize: 19,
            fontWeight: 700,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            padding: '11px 18px',
            borderRadius: 6,
          }}
        >
          PDF · last updated 14 months ago
        </div>
      )}
      <Cue at={8} src={Sfx.whooshShort} volume={0.22} />
      <Cue at={140} src={Sfx.impact2} volume={0.4} />
      <Cue at={232} src={Sfx.whoosh} volume={0.26} />
      <Vignette strength="deep" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 2 · BRAND
// ---------------------------------------------------------------------------

export const BrandScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 2, fps, config: { damping: 13, stiffness: 84, mass: 0.9 } });
  const bloom = interpolate(frame, [0, 34], [0.2, 1], { extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <AbsoluteFill>
      <Stage variant="stage-brand" />
      {/* The cold open's collapsing light, blooming back out. */}
      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '40%',
          width: 1500 * bloom,
          height: 1500 * bloom,
          transform: 'translate(-50%, -50%)',
          borderRadius: '50%',
          background: `radial-gradient(circle, ${C.terracotta}22 0%, transparent 62%)`,
          opacity: 1 - bloom * 0.4,
        }}
      />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <FadeIn delay={44} rise={10}>
          <PillBadge style={{ marginBottom: 38 }}>
            <span style={{ fontSize: 21, lineHeight: 1 }}>✦</span>
            The AI employee for restaurants
          </PillBadge>
        </FadeIn>
        <div
          style={{
            width: 250,
            height: 250,
            opacity: interpolate(frame, [0, 14], [0, 1], { extrapolateRight: 'clamp' }),
            transform: `scale(${interpolate(logoIn, [0, 1], [0.5, 1])})`,
            marginBottom: 26,
          }}
        >
          <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Cue at={2} src={Sfx.sparkle} volume={0.4} />
        <Cue at={24} src={Sfx.chime} volume={0.34} />
        <KineticText
          text="One menu. Run by AI."
          delay={22}
          stagger={3.4}
          gradient
          accentFrom={2}
          style={{
            fontSize: 104,
            justifyContent: 'center',
            color: C.cream,
            fontFamily: F.serif,
            fontWeight: 600,
            letterSpacing: '-0.025em',
          }}
        />
        <FadeIn delay={62}>
          <p style={{ marginTop: 28, fontFamily: F.sans, fontSize: 25, color: C.muted, textAlign: 'center', maxWidth: 900 }}>
            SaCarta builds it, writes it, translates it, and keeps it selling.
          </p>
        </FadeIn>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 3 · THE COST
// ---------------------------------------------------------------------------

export const CostScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  // A slow lateral truck, so the scene is already travelling right at the cut.
  const truck = interpolate(frame, [70, 285], [70, -110], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.poly(3)),
  });

  const stats: { num: React.ReactNode; label: string }[] = [
    {
      num: (
        <>
          <CountUp to={6} start={92} dur={26} gradient style={{ fontFamily: F.serif, fontWeight: 700 }} />
          <span style={{ fontSize: 54, color: C.terracotta2 }}> h</span>
        </>
      ),
      label: 'per week on manual menu updates',
    },
    { num: <CountUp to={0} start={104} dur={2} gradient style={{ fontFamily: F.serif, fontWeight: 700 }} />, label: 'languages on the average PDF menu' },
    { num: <CountUp to={0} start={116} dur={2} gradient style={{ fontFamily: F.serif, fontWeight: 700 }} />, label: 'idea what guests actually look at' },
  ];

  return (
    <AbsoluteFill>
      <Stage variant="stage-warm" />
      <div style={{ position: 'absolute', inset: 0, transform: `translateX(${truck}px)` }}>
        <Kick delay={2}>01 · The cost of a static menu</Kick>
        <Beat lines={['Your menu is costing you', 'more than you think.']} start={10} x={140} y={186} width={1400} size={88} />
        <div style={{ position: 'absolute', left: 140, top: 526, display: 'flex', gap: 40, width: 1640 }}>
          {stats.map((s, i) => {
            const p = spring({ frame: frame - 74 - i * 9, fps, config: { damping: 200, stiffness: 110 } });
            return (
              <div
                key={i}
                style={{
                  position: 'relative',
                  flex: 1,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 34}px)`,
                  background: C.card,
                  border: `1px solid ${C.line}`,
                  borderRadius: 22,
                  padding: '38px 32px',
                  textAlign: 'center',
                }}
              >
                <Cue at={74 + i * 9} src={Sfx.pop} volume={0.4} />
                <div style={{ fontSize: 108, lineHeight: 1, fontFamily: F.serif }}>{s.num}</div>
                <div style={{ marginTop: 16, fontFamily: F.sans, fontSize: 20, color: C.muted, lineHeight: 1.4 }}>{s.label}</div>
              </div>
            );
          })}
        </div>
      </div>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 4 · ARRIVAL: into the dashboard
// ---------------------------------------------------------------------------

export const ArrivalScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const editorNav = T('sidebar.editor');

  const pose = track(
    [
      { f: 0, w: POSE.full.w * 0.92, cx: POSE.full.cx, cy: POSE.full.cy + 22 },
      { f: 48, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy, ease: 'out' },
    ],
    frame,
  );
  const keys: CamKey[] = [
    { f: 0, x: 720, y: 430, z: 1.0, blur: 12 },
    { f: 42, x: 720, y: 430, z: 1.0, blur: 0, ease: 'out' },
    { f: 130, x: 640, y: 400, z: 1.07 },
    { f: 205, x: editorNav.cx + 220, y: editorNav.cy + 90, z: 1.16, ease: 'in' },
  ];

  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[{ shot: SHOTS.dashboard }]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        title="sacarta.azpy.es/dashboard"
      >
        <Kick delay={24}>02 · Meet your dashboard</Kick>
        {/* One callout only: a second one collided with the greeting line. */}
        <Callout at={{ x: T('dash.score').x, y: T('dash.score').cy }} label="Restaurant Health 88" start={56} side="left" dist={120} fade={160} />
        <Cursor
          keys={[
            { f: 104, x: 2180, y: 1240, offscreen: true },
            { f: 162, x: editorNav.cx + 10, y: editorNav.cy, arc: 150 },
            { f: 190, x: editorNav.cx + 10, y: editorNav.cy, click: true },
          ]}
        />
      </BrowserStage>
      {/* A light sweep across the glass as the window settles. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(105deg, transparent 42%, rgba(255,255,255,0.07) 50%, transparent 58%)',
          transform: `translateX(${interpolate(frame, [6, 56], [-1900, 1900], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' })}px)`,
          pointerEvents: 'none',
        }}
      />
      <Cue at={4} src={Sfx.whooshCinematic} volume={0.24} />
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 5 · IMPORT
// ---------------------------------------------------------------------------

// The real progress stages the import writes, in the order it writes them
// (api/ai-import-step.ts). They are hardcoded Spanish in the product even though
// the rest of the UI is translated, so they appear here as the product shows
// them: inventing English ones would have made the panel a mock up.
const STAGE_AT = (p: number): string => {
  if (p < 0.1) return 'Preparando la importación';
  if (p < 0.22) return 'Texto preparado · 4 bloques por analizar';
  if (p < 0.6) return `Analizando bloque ${Math.min(4, 1 + Math.floor((p - 0.22) / 0.095))} de 4`;
  if (p < 0.72) return 'Preparando traducciones';
  if (p < 0.88) return 'Traduciendo al idioma en';
  return 'Preparando el resultado para revisión';
};

export const ImportScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const imp = T('editor.importWithAi');
  const pdfTab = T('import.tabPdf');
  const chooseFile = T('import.chooseFile');
  const analyze = T('import.analyze');

  const pose = track(
    [
      { f: 0, w: POSE.aside.w * 1.06, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 30, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, ease: 'out' },
      { f: 108, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 160, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 570, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
    ],
    frame,
  );

  const keys: CamKey[] = [
    { f: 0, x: 720, y: 430, z: 1.0, blur: 12 },
    { f: 26, x: 720, y: 430, z: 1.0, blur: 0, ease: 'out' },
    { f: 160, x: imp.cx - 120, y: imp.cy + 50, z: 1.16 },
    { f: 230, x: 720, y: 450, z: 1.14 },
    { f: 350, x: 720, y: 450, z: 1.12 },
    { f: 406, x: 720, y: 430, z: 1.0 },
    { f: 478, x: 700, y: T('expanded.chevron').cy + 40, z: 1.2 },
    { f: 545, x: T('expanded.dish0').cx + 60, y: T('expanded.dish0').cy - 30, z: 1.38 },
    { f: 570, x: T('expanded.dish0').cx + 60, y: T('expanded.dish0').cy - 30, z: 1.38, ease: 'in' },
  ];

  const parseP = interpolate(frame, [278, 372], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.cubic),
  });

  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[
          { shot: SHOTS.editor },
          { shot: SHOTS.importEmpty, in: 188, dur: 4 },
          { shot: SHOTS.importPdf, in: 214, dur: 3 },
          { shot: SHOTS.editorExpanded, in: 378, dur: 8 },
        ]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        title="sacarta.azpy.es/dashboard/editor"
        pageChildren={
          <>
            {/* The file lands on the file input and the label becomes its name. */}
            <Cue at={100} src={Sfx.pop} volume={0.42} />
            <Cue at={230} src={Sfx.whooshShort} volume={0.3} />
            <Cue at={280} src={Sfx.ping} volume={0.32} />
            <Cue at={388} src={Sfx.pop} volume={0.38} />
            {frame >= 226 && frame < 284 && <PdfCard box={chooseFile} start={230} />}
            {frame >= 244 && frame < 278 && (
              <div
                style={{
                  position: 'absolute',
                  left: chooseFile.x + 132,
                  top: chooseFile.y + 7,
                  fontFamily: F.sans,
                  fontSize: 13.5,
                  color: '#1c1714',
                  background: '#fbfaf8',
                  padding: '2px 8px',
                }}
              >
                menu.pdf
              </div>
            )}
            {frame >= 228 && frame < 278 && <Ring box={chooseFile} start={232} radius={8} fade={264} />}
            {/* The parse, which no screenshot can show. */}
            {frame >= 276 && frame < 378 && <ParsePanel box={T('import.dialogPdf')} start={278} p={parseP} />}
            {/* The category rows flash as they arrive. */}
            {frame >= 382 &&
              (['Entrantes', 'Principales', 'Postres', 'Bebidas'] as const).map((c, i) => {
                const b = T(`editor.cat.${c}` as keyof typeof TARGETS);
                if (frame < 386 + i * 6) return null;
                const s = spring({ frame: frame - 386 - i * 6, fps, config: { damping: 200, stiffness: 120 } });
                return (
                  <div
                    key={c}
                    style={{
                      position: 'absolute',
                      left: b.x - 24,
                      top: b.y - 12,
                      width: 1096,
                      height: b.h + 24,
                      border: `1.5px solid ${C.terracotta}`,
                      borderRadius: 8,
                      opacity: interpolate(s, [0, 1], [0.9, 0]),
                    }}
                  />
                );
              })}
            {frame >= 492 && <Ring box={T('expanded.dish0')} start={496} pad={8} radius={8} fade={560} />}
          </>
        }
      >
        <Kick delay={20} fade={360}>03 · Import</Kick>
        <Beat lines={['Start from what', 'you already have.']} start={20} x={110} y={356} width={660} size={62} fade={116} />
        <Cursor
          keys={[
            { f: 150, x: -160, y: 980, offscreen: true },
            { f: 180, x: imp.cx, y: imp.cy, arc: -120 },
            { f: 188, x: imp.cx, y: imp.cy, click: true },
            { f: 208, x: pdfTab.cx, y: pdfTab.cy, arc: 40 },
            { f: 214, x: pdfTab.cx, y: pdfTab.cy, click: true },
            { f: 262, x: analyze.cx, y: analyze.cy, arc: -50 },
            { f: 272, x: analyze.cx, y: analyze.cy, click: true },
            { f: 356, x: 2100, y: 300, offscreen: true, arc: 200 },
            { f: 472, x: T('expanded.chevron').x + 8, y: T('expanded.chevron').cy, arc: -180 },
            { f: 488, x: T('expanded.chevron').x + 8, y: T('expanded.chevron').cy, click: true },
          ]}
        />
        <Payoff start={408} fade={478}>14 dishes · 4 categories · 38 seconds</Payoff>
      </BrowserStage>
      <Vignette />
    </AbsoluteFill>
  );
};

/** The menu.pdf card that flies in and lands on the file input. */
const PdfCard: React.FC<{ box: Box; start: number }> = ({ box, start }) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 15, stiffness: 70 } });
  const x = interpolate(s, [0, 1], [-340, 0]);
  const y = interpolate(s, [0, 1], [-280, 0]);
  const rot = interpolate(s, [0, 1], [-16, 0]);
  const fade = interpolate(frame, [start + 22, start + 32], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x + 40 + x,
        top: box.y - 46 + y,
        width: 190,
        transform: `rotate(${rot}deg)`,
        opacity: interpolate(frame, [start, start + 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) * fade,
        background: '#ffffff',
        border: `1px solid ${C.terracotta}55`,
        borderRadius: 10,
        padding: '11px 13px',
        boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
        fontFamily: F.sans,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div
          style={{
            width: 22,
            height: 26,
            borderRadius: 3,
            background: C.terracotta,
            color: '#fff',
            fontSize: 8,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          PDF
        </div>
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: '#1c1714' }}>menu.pdf</div>
          <div style={{ fontSize: 10, color: '#8a8178' }}>2.1 MB · ready</div>
        </div>
      </div>
    </div>
  );
};

/**
 * The import's processing screen.
 *
 * A screenshot cannot animate a progress bar, so this is rebuilt, but it is
 * rebuilt as what the product actually renders (AiImportDialog.tsx): a spinner,
 * the translated title, the current stage line, a "Real work progress" bar with a
 * percentage, and the note under it. Nothing invented, including the stage
 * strings.
 */
const ParsePanel: React.FC<{ box: Box; start: number; p: number }> = ({ box, start, p }) => {
  const frame = useSceneFrame();
  const pct = Math.max(1, Math.min(99, Math.round(p * 99)));
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y - 70,
        width: box.w,
        height: 360,
        background: '#fbfaf8',
        borderRadius: 12,
        border: '1px solid #e2ddd4',
        padding: '40px 38px',
        fontFamily: F.sans,
        textAlign: 'center',
        opacity: interpolate(frame, [start, start + 6], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          margin: '0 auto',
          borderRadius: '50%',
          border: `3px solid ${C.terracotta}33`,
          borderTopColor: C.terracotta,
          transform: `rotate(${frame * 14}deg)`,
        }}
      />
      <div style={{ marginTop: 18, fontSize: 15, fontWeight: 600, color: '#1c1714' }}>Importing your menu with AI...</div>
      <div style={{ marginTop: 5, fontSize: 13, color: '#8a8178' }}>{STAGE_AT(p)}</div>
      <div style={{ margin: '26px auto 0', maxWidth: 420, textAlign: 'left' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#8a8178' }}>
          <span>Real work progress</span>
          <span style={{ fontWeight: 600, color: '#1c1714' }}>{pct}%</span>
        </div>
        <div style={{ height: 8, background: '#eae5dc', borderRadius: 999, marginTop: 7, overflow: 'hidden' }}>
          <div style={{ width: `${pct}%`, height: '100%', background: C.terracotta }} />
        </div>
      </div>
      <div style={{ marginTop: 22, fontSize: 12.5, color: '#8a8178', lineHeight: 1.45, maxWidth: 430, margin: '22px auto 0' }}>
        You can leave this window open. Progress updates as each block and translation finishes.
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// 6 · WRITE
// ---------------------------------------------------------------------------

const DESC_ES = 'Pan payés tostado, tomate maduro rallado, aceite de oliva virgen extra y jamón ibérico.';

export const WriteScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const pen = T('expanded.dish0Pen');
  const desc = T('dish.desc');
  const gen = T('dish.generate');

  // Full frame for the click and the typing, then the window moves left so the
  // rest of the menu can write itself in the open right third.
  const pose = track(
    [
      { f: 0, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 250, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 306, w: POSE.asideLeft.w, cx: 620, cy: POSE.asideLeft.cy },
      { f: 480, w: POSE.asideLeft.w, cx: 620, cy: POSE.asideLeft.cy },
    ],
    frame,
  );

  const keys: CamKey[] = [
    { f: 0, x: T('expanded.dish0').cx + 60, y: T('expanded.dish0').cy, z: 1.46, blur: 10 },
    { f: 20, x: pen.cx - 140, y: pen.cy, z: 1.34, blur: 0, ease: 'out' },
    { f: 66, x: 720, y: 520, z: 1.0 },
    { f: 108, x: desc.cx, y: desc.cy - 10, z: 1.38 },
    { f: 236, x: desc.cx, y: desc.cy, z: 1.32 },
    { f: 306, x: 720, y: 540, z: 1.0 },
    { f: 420, x: T('dish.tabEn').cx, y: T('dish.tabEn').cy + 50, z: 1.2 },
    { f: 480, x: T('dish.tabEn').cx + 30, y: T('dish.tabEn').cy + 40, z: 1.26, ease: 'in' },
  ];

  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[{ shot: SHOTS.editorExpanded }, { shot: SHOTS.dishEmpty, in: 42, dur: 7 }]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        title="sacarta.azpy.es/dashboard/editor"
        pageChildren={
          <>
            {frame >= 48 && frame < 134 && <Ring box={desc} start={66} radius={8} fade={116} />}
            <Shimmer box={desc} start={98} end={130} />
            {frame >= 100 && (
              <TypeOn text={DESC_ES} box={desc} start={104} cps={1.9} fontSize={14} padding="8px 13px" color="#1c1714" />
            )}
            {/* The button holds a spinner while the agent works. */}
            {frame >= 96 && frame < 158 && (
              <div
                style={{
                  position: 'absolute',
                  left: gen.x,
                  top: gen.y,
                  width: gen.w,
                  height: gen.h,
                  borderRadius: 7,
                  background: C.terracotta,
                  color: '#fff',
                  fontFamily: F.sans,
                  fontSize: 12.5,
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 7,
                }}
              >
                <span
                  style={{
                    width: 11,
                    height: 11,
                    borderRadius: '50%',
                    border: '2px solid rgba(255,255,255,0.4)',
                    borderTopColor: '#fff',
                    transform: `rotate(${frame * 22}deg)`,
                  }}
                />
                Generating
              </div>
            )}
            {frame >= 202 && (
              <div
                style={{
                  position: 'absolute',
                  left: desc.x + desc.w + 12,
                  top: desc.cy - 13,
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: '#1f9d55',
                  color: '#fff',
                  fontSize: 14,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: `scale(${spring({ frame: frame - 202, fps: 30, config: { damping: 12, stiffness: 140 } })})`,
                }}
              >
                ✓
              </div>
            )}
          </>
        }
      >
        <Kick delay={54} fade={430}>04 · Write</Kick>
        {frame >= 298 && <BulkWrite start={304} />}
        {frame >= 298 && (
          <Beat lines={['Descriptions that sell,', 'written for you.']} start={302} x={1180} y={196} width={640} size={50} />
        )}
        <Cursor
          keys={[
            { f: 8, x: 2100, y: 1180, offscreen: true },
            { f: 36, x: pen.cx, y: pen.cy, arc: 130 },
            { f: 42, x: pen.cx, y: pen.cy, click: true },
            { f: 88, x: gen.cx, y: gen.cy, arc: -140 },
            { f: 96, x: gen.cx, y: gen.cy, click: true },
            { f: 250, x: gen.cx + 40, y: gen.cy + 80, arc: 40 },
          ]}
          until={292}
        />
        <Payoff start={396}>14 descriptions · one pass</Payoff>
      </BrowserStage>
      <Vignette />
    </AbsoluteFill>
  );
};

const BULK = [
  ['Ensalada mallorquina', 'Lechuga, tomate, cebolla, aceitunas y atún de la isla.'],
  ['Croquetas caseras de cocido', 'Croquetas cremosas de cocido con bechamel artesana.'],
  ['Gazpacho andaluz', 'Sopa fría de tomate, pepino y pimiento con un chorro de AOVE.'],
];

const BulkWrite: React.FC<{ start: number }> = ({ start }) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: 'absolute', left: 1180, top: 420, width: 640 }}>
      {BULK.map(([name, desc], i) => {
        const s = spring({ frame: frame - start - i * 12, fps, config: { damping: 200, stiffness: 120 } });
        const n = Math.max(0, Math.floor((frame - start - i * 12 - 8) * 3.2));
        return (
          <div
            key={i}
            style={{
              opacity: s,
              transform: `translateX(${(1 - s) * 30}px)`,
              background: 'rgba(36,29,25,0.92)',
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: '16px 20px',
              marginBottom: 14,
              fontFamily: F.sans,
            }}
          >
            <div style={{ fontSize: 18, color: C.cream, fontWeight: 600 }}>{name}</div>
            <div style={{ fontSize: 15.5, color: C.muted, marginTop: 6, minHeight: 44, lineHeight: 1.4 }}>
              {desc.slice(0, n)}
              {n < desc.length && n > 0 && <span style={{ color: C.terracotta2 }}>▍</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 7 · TRANSLATE
// ---------------------------------------------------------------------------

const DESC_EN = 'Toasted country bread, grated ripe tomato, extra virgin olive oil and Iberian ham.';
const LANGS = [
  { code: 'es', name: 'Español', dish: 'Pan con tomate con jamón ibérico' },
  { code: 'en', name: 'English', dish: 'Tomato bread with Iberian ham' },
  { code: 'ca', name: 'Català', dish: 'Pa amb tomàtiga amb pernil ibèric' },
  { code: 'de', name: 'Deutsch', dish: 'Tomatenbrot mit Iberico Schinken' },
  { code: 'fr', name: 'Français', dish: 'Pain à la tomate au jambon ibérique' },
  { code: 'it', name: 'Italiano', dish: 'Pane al pomodoro con prosciutto iberico' },
  { code: 'pt', name: 'Português', dish: 'Pão com tomate e presunto ibérico' },
];

export const TranslateScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const tabEn = T('dish.tabEn');
  const descEn = T('dish.descEn');
  const trEn = T('dish.translateEn');

  const pose = track(
    [
      { f: 0, w: POSE.asideLeft.w * 1.03, cx: 620, cy: POSE.asideLeft.cy },
      { f: 40, w: POSE.asideLeft.w, cx: 620, cy: POSE.asideLeft.cy, ease: 'out' },
      { f: 110, w: POSE.asideLeft.w, cx: 620, cy: POSE.asideLeft.cy },
      { f: 162, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 286, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 340, w: POSE.full.w * 0.58, cx: POSE.full.cx, cy: 292 },
      { f: 390, w: POSE.full.w * 0.56, cx: POSE.full.cx, cy: 288 },
    ],
    frame,
  );

  const keys: CamKey[] = [
    { f: 0, x: tabEn.cx, y: tabEn.cy + 40, z: 1.24, blur: 9 },
    { f: 24, x: tabEn.cx, y: tabEn.cy + 60, z: 1.2, blur: 0, ease: 'out' },
    { f: 162, x: 720, y: 560, z: 1.2 },
    { f: 200, x: descEn.cx, y: descEn.cy - 10, z: 1.32 },
    { f: 286, x: 720, y: 520, z: 1.0 },
    { f: 340, x: 720, y: 450, z: 1.0 },
    { f: 390, x: 720, y: 450, z: 1.0 },
  ];

  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[{ shot: SHOTS.dishEmpty }, { shot: SHOTS.dishEnEmpty, in: 180, dur: 5, mode: 'wipeDown' }]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        title="sacarta.azpy.es/dashboard/editor"
        pageChildren={
          <>
            {frame >= 178 && frame < 212 && <Ring box={tabEn} start={178} radius={6} pad={2} fade={200} />}
            <Shimmer box={descEn} start={210} end={238} />
            {frame >= 212 && (
              <TypeOn text={DESC_EN} box={descEn} start={214} cps={2.6} fontSize={14} padding="8px 13px" color="#1c1714" />
            )}
            {frame >= 250 && frame < 290 && <Ring box={descEn} start={252} radius={8} fade={276} />}
          </>
        }
      >
        <Kick delay={10} fade={300}>05 · Translate</Kick>
        <Beat lines={['Every dish.', 'Every language.']} start={14} x={1180} y={330} width={620} size={62} fade={116} />
        <Cursor
          keys={[
            { f: 150, x: 2060, y: 1120, offscreen: true },
            { f: 172, x: tabEn.cx, y: tabEn.cy, arc: 140 },
            { f: 178, x: tabEn.cx, y: tabEn.cy, click: true },
            { f: 204, x: trEn.cx, y: trEn.cy, arc: -70 },
            { f: 212, x: trEn.cx, y: trEn.cy, click: true },
            { f: 268, x: 2060, y: 1120, offscreen: true, arc: 220 },
          ]}
          until={272}
        />
        {/* The pull back turns one dish into every language the product speaks. */}
        <Cue at={300} src={Sfx.whooshCinematic} volume={0.32} />
        {frame >= 300 && <LanguageWall start={306} />}
        <Payoff start={352} y={1002}>7 languages · every dish · automatic</Payoff>
      </BrowserStage>
      <Vignette />
    </AbsoluteFill>
  );
};

const LanguageWall: React.FC<{ start: number }> = ({ start }) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  return (
    <div
      style={{
        position: 'absolute',
        left: 150,
        top: 596,
        width: 1620,
        display: 'flex',
        flexWrap: 'wrap',
        gap: 14,
        justifyContent: 'center',
      }}
    >
      {LANGS.map((l, i) => {
        const s = spring({ frame: frame - start - i * 5, fps, config: { damping: 18, stiffness: 92 } });
        const dir = i % 2 === 0 ? 1 : -1;
        return (
          <div
            key={l.code}
            style={{
              width: 386,
              opacity: s,
              transform: `translate(${(1 - s) * 80 * dir}px, ${(1 - s) * 34}px) scale(${interpolate(s, [0, 1], [0.88, 1])})`,
              background: 'rgba(30,24,20,0.95)',
              border: `1px solid ${C.line}`,
              borderRadius: 14,
              padding: '14px 18px',
              fontFamily: F.sans,
              boxShadow: '0 18px 44px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ fontSize: 12, letterSpacing: '0.24em', textTransform: 'uppercase', color: C.terracotta2, fontWeight: 600 }}>
              {l.name}
            </div>
            <div style={{ fontFamily: F.serif, fontSize: 21, color: C.cream, marginTop: 6, lineHeight: 1.2 }}>{l.dish}</div>
          </div>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------------------
// 8 · PUBLISH: the QR lands on a phone
// ---------------------------------------------------------------------------

export const PublishScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const qrBox = T('qr.code');
  const qrNav = T('sidebar.qr');

  // Text beat, full frame for the QR, then the window swings away in 3D as the
  // phone arrives and takes the code.
  const pose = track(
    [
      { f: 0, w: POSE.aside.w * 0.94, cx: POSE.aside.cx, cy: POSE.aside.cy, rotY: 0 },
      { f: 34, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, rotY: 0, ease: 'out' },
      { f: 104, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, rotY: 0 },
      { f: 156, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy, rotY: 0 },
      { f: 244, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy, rotY: 0 },
      { f: 318, w: 1080, cx: 610, cy: 566, rotY: -26 },
      { f: 420, w: 1050, cx: 580, cy: 566, rotY: -30 },
    ],
    frame,
  );

  const keys: CamKey[] = [
    { f: 0, x: 720, y: 430, z: 1.0, blur: 10 },
    { f: 30, x: 720, y: 430, z: 1.0, blur: 0, ease: 'out' },
    { f: 176, x: qrBox.cx, y: qrBox.cy + 40, z: 1.2 },
    { f: 244, x: qrBox.cx, y: qrBox.cy + 130, z: 1.02 },
    { f: 318, x: 760, y: 450, z: 0.9 },
    { f: 420, x: 760, y: 450, z: 0.9 },
  ];

  const phone = spring({ frame: frame - 262, fps, config: { damping: 16, stiffness: 52 } });
  const fly = interpolate(frame, [300, 356], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.inOut(Easing.poly(3)),
  });

  return (
    <AbsoluteFill>
      <Stagelight warm />
      <div style={{ perspective: 2400 }}>
        <BrowserStage
          layers={[{ shot: SHOTS.editorExpanded }, { shot: SHOTS.qrTall, in: 174, dur: 1 }]}
          keys={keys}
          frameW={pose.w}
          cx={pose.cx}
          cy={pose.cy}
          title="sacarta.azpy.es/dashboard/qr"
          windowStyle={{ transform: `rotateY(${pose.rotY}deg)`, transformStyle: 'preserve-3d' }}
          pageChildren={<>{frame >= 176 && frame < 320 && <QrDraw box={qrBox} start={180} />}</>}
        >
          <Kick delay={8} fade={300}>06 · Publish</Kick>
          <Beat lines={['One code', 'on the table.']} start={12} x={110} y={356} width={600} size={66} fade={112} />
          <Cue at={222} src={Sfx.impact1} volume={0.4} />
          <Cue at={300} src={Sfx.whooshCinematic} volume={0.34} />
          <Cursor
            keys={[
              { f: 130, x: -140, y: 1000, offscreen: true },
              { f: 162, x: qrNav.cx + 10, y: qrNav.cy, arc: -130 },
              { f: 174, x: qrNav.cx + 10, y: qrNav.cy, click: true },
              { f: 220, x: qrBox.cx, y: qrBox.y + qrBox.h + 40, arc: 110 },
              { f: 260, x: -220, y: 1050, offscreen: true, arc: 200 },
            ]}
            until={266}
          />
        </BrowserStage>
      </div>

      {/* The phone rises from the bottom right and takes the code. */}
      {frame >= 262 && (
        <>
          <ContactShadow cx={1430} cy={952} w={420} opacity={0.5 * phone} />
          <PhoneStage
            layers={[{ shot: SHOTS.menuEs }]}
            keys={[{ f: 0, x: 215, y: 466, z: 1 }]}
            screenH={620}
            cx={1430}
            cy={560 + (1 - phone) * 620}
            bezel={10}
            opacity={phone}
          />
        </>
      )}

      {/* The real code detaches from the page and lands on the phone screen. */}
      {frame >= 298 && frame < 370 && (
        <div
          style={{
            position: 'absolute',
            left: interpolate(fly, [0, 1], [600, 1430]),
            top: interpolate(fly, [0, 1], [520, 430]),
            transform: `translate(-50%, -50%) scale(${interpolate(fly, [0, 0.5, 1], [1, 1.45, 0.6])}) rotate(${interpolate(fly, [0, 1], [0, 12])}deg)`,
            opacity: interpolate(fly, [0, 0.08, 0.88, 1], [0, 1, 1, 0]),
            background: '#fff',
            padding: 12,
            borderRadius: 12,
            boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
          }}
        >
          <ShotCrop shot={SHOTS.qrTall} box={qrBox} width={168} />
        </div>
      )}

      <Payoff start={364} y={1002}>Scan, and the menu is on their phone</Payoff>
      <Vignette strength="strong" />
    </AbsoluteFill>
  );
};

/** The QR modules appearing in a radial stagger over the real code. */
const QrDraw: React.FC<{ box: Box; start: number }> = ({ box, start }) => {
  const frame = useSceneFrame();
  const p = interpolate(frame, [start, start + 44], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  if (p >= 1) return null;
  const N = 13;
  const cell = box.w / N;
  const cells = [];
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const d = Math.hypot(r - (N - 1) / 2, c - (N - 1) / 2) / ((N - 1) / 2);
      if (d <= p * 1.25) continue;
      cells.push(
        <div
          key={`${r}-${c}`}
          style={{
            position: 'absolute',
            left: box.x + c * cell,
            top: box.y + r * cell,
            width: cell + 0.5,
            height: cell + 0.5,
            background: '#ffffff',
          }}
        />,
      );
    }
  }
  return <>{cells}</>;
};

// ---------------------------------------------------------------------------
// 9 · THE GUEST
// ---------------------------------------------------------------------------

export const GuestScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();

  const keys: CamKey[] = [
    { f: 0, x: 215, y: 400, z: 1.16, blur: 10 },
    { f: 22, x: 215, y: 466, z: 1.0, blur: 0, ease: 'out' },
    { f: 48, x: 215, y: 466, z: 1.0 },
    { f: 104, x: 215, y: 1180, z: 1.0 },
    { f: 148, x: 215, y: 700, z: 1.0 },
    { f: 200, x: 215, y: 466, z: 1.0 },
    // A push into the answer, because at 1:1 the assistant's reply is real text
    // at real size and nobody can read 13 px on a phone frame.
    { f: 244, x: 215, y: 590, z: 1.42 },
    { f: 306, x: 215, y: 610, z: 1.38 },
    { f: 356, x: 215, y: 466, z: 1.0 },
    { f: 480, x: 215, y: 466, z: 1.0 },
  ];

  // The hero phone holds centre, then pulls back and up so the fan of tables and
  // the closing line each get their own band of the frame.
  const pose = track(
    [
      { f: 0, h: 900, cx: 960, cy: 540 },
      { f: 340, h: 900, cx: 960, cy: 540 },
      { f: 412, h: 580, cx: 700, cy: 452 },
      { f: 480, h: 560, cx: 680, cy: 446 },
    ],
    frame,
  );

  return (
    <AbsoluteFill>
      <DiningRoom />

      {/* Three more tables, each reading the same menu in another language. */}
      {frame >= 346 &&
        [
          { shot: SHOTS.menuEn, dx: 300, rot: 8, delay: 0, scale: 0.9 },
          { shot: SHOTS.menuEs, dx: 570, rot: 15, delay: 9, scale: 0.82 },
          { shot: SHOTS.menuEn, dx: 810, rot: 22, delay: 18, scale: 0.74 },
        ].map((p, i) => {
          const s = spring({ frame: frame - 346 - p.delay, fps, config: { damping: 200, stiffness: 40 } });
          return (
            <PhoneStage
              key={i}
              layers={[{ shot: p.shot }]}
              keys={[
                { f: 0, x: 215, y: 500 + i * 160, z: 1 },
                { f: 180, x: 215, y: 1100 + i * 260, z: 1 },
              ]}
              screenH={pose.h * p.scale}
              cx={pose.cx + p.dx * s}
              cy={pose.cy}
              bezel={9}
              rotate={p.rot * s}
              opacity={s * 0.94}
            />
          );
        })}

      {/* The hero phone. It opens on the SPANISH menu so the language switch is
          something the viewer can actually see happen. */}
      <PhoneStage
        layers={[
          { shot: SHOTS.menuFullEs },
          { shot: SHOTS.menuFull, in: 116, dur: 14, mode: 'wipeDown' },
          { shot: SHOTS.assistantOpen, in: 162, dur: 10, mode: 'wipeUp' },
          { shot: SHOTS.assistantAnswer, in: 226, dur: 8 },
        ]}
        keys={keys}
        screenH={pose.h}
        cx={pose.cx}
        cy={pose.cy}
        bezel={12}
        pageChildren={
          <>
            {/* Each dish title wipes from Spanish to English, row by row. */}
            {frame >= 116 && frame < 162 &&
              [0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    left: 24,
                    top: 470 + i * 148,
                    width: 300,
                    height: 22,
                    background: `linear-gradient(90deg, ${C.terracotta}26, transparent)`,
                    opacity: interpolate(frame, [116 + i * 8, 124 + i * 8, 138 + i * 8], [0, 1, 0], {
                      extrapolateLeft: 'clamp',
                      extrapolateRight: 'clamp',
                    }),
                  }}
                />
              ))}
            {/* The guest question typed into the real assistant input. Asked in
                English; the assistant answers in the guest's language (lang param
                passed to the AI backend). */}
            {frame >= 186 && frame < 234 && (
              <TypeOn
                text="I'm coeliac, what can I eat?"
                box={T('assistant.input')}
                start={188}
                cps={1.6}
                fontSize={13}
                padding="10px 14px"
                color="#1c1714"
                radius={999}
              />
            )}
          </>
        }
      >
        <TouchRing
          keys={[
            { f: 34, x: 215, y: 1000 },
            { f: 66, x: 215, y: 700 },
            { f: 100, x: 215, y: 520 },
            { f: 116, x: T('menu.langSwitch').cx, y: T('menu.langSwitch').cy, click: true },
            { f: 162, x: T('menu.assistantLauncher').cx, y: T('menu.assistantLauncher').cy, click: true },
            { f: 186, x: T('assistant.input').cx, y: T('assistant.input').cy },
            { f: 220, x: T('assistant.send').cx, y: T('assistant.send').cy, click: true },
            { f: 252, x: T('assistant.send').cx, y: T('assistant.send').cy + 60 },
          ]}
          size={62}
        />
      </PhoneStage>

      <Cue at={226} src={Sfx.notification} volume={0.4} />
      <Cue at={348} src={Sfx.whoosh} volume={0.26} />
      <Kick delay={10} fade={330}>07 · Your guests</Kick>
      <Beat lines={['In their language,', 'instantly.']} start={112} x={1240} y={330} width={560} size={54} fade={152} />
      {frame >= 306 && frame < 346 && (
        <Payoff start={308} fade={334} y={1010}>
          Allergen aware · grounded in your menu · no invented dishes
        </Payoff>
      )}
      {frame >= 388 && (
        <Beat lines={['Every table. Every language.', 'No reprints.']} start={392} x={360} y={846} width={1200} size={62} align="center" />
      )}
      <Vignette strength="strong" />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 10 · COPILOT
// ---------------------------------------------------------------------------

const DIFF = [
  ['Pan con tomate con jamón ibérico', 6.5],
  ['Ensalada mallorquina', 8.9],
  ['Croquetas caseras de cocido', 7.5],
  ['Gazpacho andaluz', 5.9],
  ['Tabla de quesos mallorquines', 12.0],
  ['Pulpo a la brasa', 18.0],
  ['Berenjena rellena', 9.5],
  ['Pan de cristal con AOVE', 4.5],
] as const;

export const CopilotScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const input = T('copilot.input');
  const send = T('copilot.send');

  const pose = track(
    [
      { f: 0, w: POSE.aside.w * 0.96, cx: POSE.aside.cx, cy: POSE.aside.cy, op: 1 },
      { f: 30, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, op: 1, ease: 'out' },
      { f: 74, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, op: 1 },
      { f: 122, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy, op: 1 },
      { f: 330, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy, op: 1 },
      { f: 374, w: POSE.full.w * 1.06, cx: POSE.full.cx - 240, cy: POSE.full.cy, op: 0, ease: 'in' },
    ],
    frame,
  );

  const keys: CamKey[] = [
    { f: 0, x: 900, y: 420, z: 1.0, blur: 9 },
    { f: 26, x: 900, y: 440, z: 1.0, blur: 0, ease: 'out' },
    { f: 126, x: input.cx, y: input.cy - 30, z: 1.26 },
    { f: 196, x: 950, y: 430, z: 1.06 },
    // On the preview. Eight rows of a real diff are the point of the scene, and
    // at page zoom they are 11 px tall and unreadable.
    { f: 244, x: 948, y: 330, z: 1.28 },
    { f: 300, x: 948, y: 350, z: 1.24 },
    { f: 330, x: 950, y: 430, z: 1.08 },
  ];

  return (
    <AbsoluteFill>
      <Stagelight />
      {pose.op > 0.02 && (
        <div style={{ opacity: pose.op }}>
          <BrowserStage
            layers={[{ shot: SHOTS.copilotEmpty }]}
            keys={keys}
            frameW={pose.w}
            cx={pose.cx}
            cy={pose.cy}
            title="sacarta.azpy.es/dashboard/ai-copilot"
            pageChildren={
              <>
                {frame >= 130 && frame < 182 && (
                  <TypeOn
                    text="Increase the price of all Entrantes dishes by 10%"
                    box={input}
                    start={134}
                    cps={1.9}
                    fontSize={14}
                    padding="12px 14px"
                    color="#1c1714"
                  />
                )}
                {frame >= 180 && <CopilotThread start={184} />}
              </>
            }
          >
            <Kick delay={8} fade={340}>08 · Copilot</Kick>
            <Beat lines={['Stop editing.', 'Just ask.']} start={10} x={110} y={356} width={540} size={64} fade={82} />
            <Cursor
              keys={[
                { f: 104, x: 2080, y: 1140, offscreen: true },
                { f: 126, x: input.x + 60, y: input.cy, arc: 150 },
                { f: 132, x: input.x + 60, y: input.cy, click: true },
                { f: 174, x: send.cx, y: send.cy, arc: -60 },
                { f: 180, x: send.cx, y: send.cy, click: true },
                { f: 296, x: CONFIRM.x, y: CONFIRM.y, arc: 120 },
                { f: 306, x: CONFIRM.x, y: CONFIRM.y, click: true },
                { f: 340, x: 2080, y: 1140, offscreen: true, arc: 220 },
              ]}
              until={350}
            />
            <Payoff start={232} fade={290}>Nothing changes until you confirm</Payoff>
          </BrowserStage>
        </div>
      )}

      {/* The proof: the prices are already updated in the editor. */}
      {frame >= 344 && (
        <div style={{ opacity: interpolate(frame, [344, 360], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) }}>
          <BrowserStage
            layers={[{ shot: SHOTS.editorExpanded }]}
            keys={[
              { f: 344, x: 1000, y: 380, z: 1.26, blur: 10 },
              { f: 380, x: 1040, y: 470, z: 1.3, blur: 0, ease: 'out' },
              { f: 448, x: 1060, y: 600, z: 1.32 },
              { f: 480, x: 1060, y: 620, z: 1.3 },
            ]}
            frameW={POSE.full.w}
            cx={POSE.full.cx}
            cy={POSE.full.cy}
            title="sacarta.azpy.es/dashboard/editor"
            pageChildren={
              <>
                {[0, 1, 2, 3].map((i) => {
                  const b = T(`expanded.price${i}` as keyof typeof TARGETS);
                  const at = 382 + i * 22;
                  if (frame < at) return null;
                  const s = spring({ frame: frame - at, fps: 30, config: { damping: 12, stiffness: 150 } });
                  return (
                    <div key={i}>
                      <Cue at={at} src={Sfx.pop} volume={0.3} />
                      <div
                        style={{
                          position: 'absolute',
                          left: b.x - 8,
                          top: b.y - 5,
                          width: b.w + 16,
                          height: b.h + 10,
                          background: '#ffffff',
                          borderRadius: 6,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          paddingRight: 8,
                          fontFamily: F.sans,
                          fontSize: 16,
                          fontWeight: 600,
                          color: C.terracotta,
                          transform: `scale(${interpolate(s, [0, 0.5, 1], [1, 1.26, 1])})`,
                        }}
                      >
                        {(DIFF[i][1] * 1.1).toFixed(2)}
                      </div>
                      <Ring box={b} start={at} pad={7} radius={7} width={2} fade={at + 32} />
                    </div>
                  );
                })}
              </>
            }
          >
            <Payoff start={462}>8 prices, applied in one sentence</Payoff>
          </BrowserStage>
        </div>
      )}
      <Vignette />
    </AbsoluteFill>
  );
};

// The preview card's geometry in page coordinates. The confirm button is placed
// from these numbers and the cursor aims at them, so the click can never land
// next to the button it is supposed to press.
const THREAD = { x: 549, y: 140, w: 798 };
const CARD = { top: 54, h: 372 };
const CONFIRM = { x: THREAD.x + 56, y: THREAD.y + CARD.top + CARD.h - 20 };

/**
 * The copilot thread.
 *
 * Rebuilt because it animates, but rebuilt as the product's real thread
 * (AiCopilot.tsx): the sent bubble, the "working" spinner, and the preview card
 * with its shield icon, its summary, its "N element(s) affected" line, its
 * changes grouped per dish, and Confirm / Cancel. The first draft of this scene
 * had three tool call chips ticking, which looked good and does not exist in the
 * product, so they are gone.
 */
const CopilotThread: React.FC<{ start: number }> = ({ start }) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const t = frame - start;
  const bubble = spring({ frame: t, fps, config: { damping: 16, stiffness: 110 } });
  const confirmed = t >= 124;
  const working = t >= 10 && t < 46;

  return (
    <div style={{ position: 'absolute', left: 549, top: 140, width: 798, fontFamily: F.sans, color: '#1c1714' }}>
      {/* Cover the empty state the screenshot still shows underneath. */}
      <div style={{ position: 'absolute', left: -6, top: -6, width: 810, height: 430, background: '#fbfaf8' }} />

      <div
        style={{
          position: 'relative',
          display: 'flex',
          justifyContent: 'flex-end',
          opacity: bubble,
          transform: `translateY(${(1 - bubble) * 22}px)`,
        }}
      >
        <div style={{ background: C.terracotta, color: '#fff', borderRadius: 12, padding: '9px 14px', fontSize: 13.5, maxWidth: 420 }}>
          Increase the price of all Entrantes dishes by 10%
        </div>
      </div>

      {working && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 8, marginTop: 14, fontSize: 13, color: '#8a8178' }}>
          <span
            style={{
              width: 15,
              height: 15,
              borderRadius: '50%',
              border: '2px solid #d6cfc4',
              borderTopColor: C.terracotta,
              transform: `rotate(${frame * 16}deg)`,
            }}
          />
          The Copilot is working...
        </div>
      )}

      {t >= 44 && !confirmed && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            top: CARD.top,
            width: THREAD.w,
            height: CARD.h,
            background: `${C.terracotta}0d`,
            border: `1px solid ${C.terracotta}4d`,
            borderRadius: 10,
            padding: '11px 12px',
            opacity: interpolate(t, [44, 52], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(t, [44, 56], [14, 0], { extrapolateRight: 'clamp' })}px)`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ShieldGlyph />
            <span style={{ fontSize: 13, fontWeight: 600 }}>
              Adjust prices of 8 dish(es) in categories containing "Entrantes".
            </span>
          </div>
          <div style={{ fontSize: 11.5, color: '#8a8178', marginTop: 5 }}>8 element(s) affected</div>

          <div style={{ marginTop: 7 }}>
            {DIFF.map(([name, from], i) => {
              const at = 48 + i * 2;
              if (t < at) return null;
              const sp = spring({ frame: t - at, fps, config: { damping: 200, stiffness: 160 } });
              return (
                <div
                  key={name}
                  style={{
                    background: 'rgba(255,255,255,0.62)',
                    borderRadius: 5,
                    padding: '3px 7px',
                    marginBottom: 2,
                    opacity: sp,
                    transform: `translateX(${(1 - sp) * 10}px)`,
                  }}
                >
                  <div style={{ fontSize: 10.5, fontWeight: 700 }}>{name}</div>
                  <div style={{ fontSize: 10.5, color: '#8a8178', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontWeight: 600, color: '#1c1714' }}>Price</span>
                    <span style={{ textDecoration: 'line-through' }}>{from}</span>
                    <span>→</span>
                    <span style={{ fontWeight: 600, color: '#1c1714' }}>{Number((from * 1.1).toFixed(2))}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div style={{ position: 'absolute', left: 12, top: CARD.h - 34, display: 'flex', gap: 7 }}>
            <div
              style={{
                background: C.terracotta,
                color: '#fff',
                borderRadius: 7,
                padding: '5px 14px',
                fontSize: 12,
                fontWeight: 600,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              ✓ Confirm
            </div>
            <div
              style={{
                border: '1px solid #ddd7cd',
                color: '#5c5347',
                borderRadius: 7,
                padding: '5px 13px',
                fontSize: 12,
                display: 'flex',
                alignItems: 'center',
                gap: 5,
              }}
            >
              ✕ Cancel
            </div>
          </div>
        </div>
      )}

      {confirmed && (
        <div
          style={{
            position: 'relative',
            marginTop: 14,
            display: 'flex',
            alignItems: 'center',
            gap: 9,
            opacity: interpolate(t, [124, 134], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
            transform: `translateY(${interpolate(t, [124, 138], [-10, 0], { extrapolateRight: 'clamp' })}px)`,
          }}
        >
          <div
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              background: `${C.terracotta}1f`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: C.terracotta,
              fontSize: 12,
              flexShrink: 0,
            }}
          >
            ✓
          </div>
          <div style={{ background: '#f3efe8', borderRadius: 12, padding: '9px 14px', fontSize: 13 }}>
            Adjust prices of 8 dish(es) in categories containing "Entrantes". · Applied (8 changes)
          </div>
        </div>
      )}
    </div>
  );
};

/** The lucide shield-alert the real preview card leads with. */
const ShieldGlyph: React.FC = () => (
  <svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke="#8a8178" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="M12 8v4" />
    <path d="M12 16h.01" />
  </svg>
);

// ---------------------------------------------------------------------------
// 11 · IMPROVE
// ---------------------------------------------------------------------------

export const ImproveScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const score = T('dash.score');
  const optNav = T('sidebar.optimizer');

  const pose = track(
    [
      { f: 0, w: POSE.aside.w * 0.96, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 34, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, ease: 'out' },
      { f: 96, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 148, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 330, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
    ],
    frame,
  );

  // Two pages in one scene: the dashboard's health score, then the click that
  // opens the AI Optimizer, whose eight scored dimensions the camera reveals by
  // pulling back. Nothing is drawn over the optimizer: every number and every
  // line of analysis on it is the agent's real output.
  const keys: CamKey[] = [
    { f: 0, x: 660, y: 300, z: 1.1, blur: 9 },
    { f: 26, x: 660, y: 300, z: 1.06, blur: 0, ease: 'out' },
    { f: 130, x: 620, y: 300, z: 1.14 },
    { f: 166, x: optNav.cx + 180, y: optNav.cy + 40, z: 1.2 },
    { f: 186, x: 470, y: 250, z: 1.46, blur: 7 },
    { f: 212, x: 470, y: 250, z: 1.42, blur: 0, ease: 'out' },
    { f: 268, x: 848, y: 520, z: 1.0 },
    { f: 330, x: 880, y: 560, z: 0.98, ease: 'in' },
  ];

  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[{ shot: SHOTS.dashboardTall }, { shot: SHOTS.optimizerTall, in: 180, dur: 4 }]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        maxH={1000}
        title={frame < 180 ? 'sacarta.azpy.es/dashboard' : 'sacarta.azpy.es/dashboard/ai-optimizer'}
        pageChildren={
          <>
            {/* The health score counts up to the number the dashboard really
                shows. It is the one overlay in the scene, and it covers the real
                digits with the same digits. */}
            {frame < 178 && (
              <div
                style={{
                  position: 'absolute',
                  left: score.x - 8,
                  top: score.y - 8,
                  width: score.w + 26,
                  height: score.h + 16,
                  background: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  fontFamily: F.serif,
                  fontSize: 44,
                  fontWeight: 700,
                  color: '#1f9d55',
                }}
              >
                <CountUp to={88} from={0} start={40} dur={68} />
              </div>
            )}
          </>
        }
      >
        <Kick delay={8} fade={300}>09 · Improve</Kick>
        <Beat lines={['It grades your menu.', 'Every day.']} start={10} x={110} y={356} width={620} size={56} fade={104} />
        <Cursor
          keys={[
            { f: 128, x: -140, y: 1040, offscreen: true },
            { f: 160, x: optNav.cx + 10, y: optNav.cy, arc: -140 },
            { f: 178, x: optNav.cx + 10, y: optNav.cy, click: true },
            { f: 196, x: optNav.cx + 10, y: optNav.cy },
            // Leave briskly. A long exit leaves the pointer visibly drifting
            // across the frame with nothing to do, which reads as a bug.
            { f: 214, x: -180, y: 1060, offscreen: true, arc: 180 },
          ]}
          until={218}
        />
        <Callout at={{ x: 470, y: 200 }} label="Overall score 82" start={222} side="right" dist={150} fade={280} />
        <Cue at={108} src={Sfx.impact1} volume={0.38} />
        <Cue at={196} src={Sfx.whooshShort} volume={0.26} />
        <Payoff start={286}>Eight dimensions, scored and explained</Payoff>
      </BrowserStage>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 12 · PROOF: analytics
// ---------------------------------------------------------------------------

export const ProofScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const pose = track(
    [
      { f: 0, w: POSE.aside.w * 0.96, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 26, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy, ease: 'out' },
      { f: 62, w: POSE.aside.w, cx: POSE.aside.cx, cy: POSE.aside.cy },
      { f: 108, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
      { f: 225, w: POSE.full.w, cx: POSE.full.cx, cy: POSE.full.cy },
    ],
    frame,
  );
  // One continuous move down the analytics page, accelerating out.
  const keys: CamKey[] = [
    { f: 0, x: 820, y: 300, z: 1.02, blur: 12 },
    { f: 26, x: 820, y: 300, z: 1.0, blur: 0, ease: 'out' },
    { f: 150, x: 780, y: 900, z: 1.0 },
    { f: 225, x: 760, y: 1400, z: 1.0, blur: 6, ease: 'in' },
  ];
  return (
    <AbsoluteFill>
      <Stagelight />
      <BrowserStage
        layers={[{ shot: SHOTS.analyticsTall }]}
        keys={keys}
        frameW={pose.w}
        cx={pose.cx}
        cy={pose.cy}
        maxH={1000}
        title="sacarta.azpy.es/dashboard/analytics"
      >
        <Kick delay={6}>10 · Proof</Kick>
        <Beat lines={['See what guests', 'actually look at.']} start={8} x={110} y={356} width={620} size={54} fade={68} />
        <Callout at={{ x: 700, y: 620 }} label="Views over time" start={122} side="up" dist={80} fade={166} />
        <Callout at={{ x: 560, y: 1060 }} label="By language" start={156} side="up" dist={70} fade={200} />
      </BrowserStage>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 13 · UNDER THE HOOD
// ---------------------------------------------------------------------------

export const HoodScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const card = spring({ frame: frame - 18, fps, config: { damping: 200, stiffness: 44 } });
  const bullets = [
    '7 agents, Zod validated at every boundary',
    '21 Postgres tables, RLS on every row',
    'LLM gateway with key rotation and a fallback chain',
  ];
  return (
    <AbsoluteFill>
      <Stagelight />
      <Kick delay={4}>11 · Under the hood</Kick>
      <Beat lines={['One AI layer.', 'Seven agents.']} start={8} x={110} y={286} width={620} size={70} />
      <div style={{ position: 'absolute', left: 110, top: 606, width: 640 }}>
        <Cascade start={64} stagger={9}>
          {bullets.map((b, bi) => (
            <div
              key={b}
              style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 14, marginBottom: 18, fontFamily: F.sans, fontSize: 21, color: C.cream }}
            >
              <Cue at={64 + bi * 9} src={Sfx.pop} volume={0.3} />
              <span
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: 8,
                  background: `${C.terracotta}33`,
                  border: `1px solid ${C.terracotta}66`,
                  color: C.terracotta2,
                  fontSize: 14,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                }}
              >
                +
              </span>
              {b}
            </div>
          ))}
        </Cascade>
      </div>
      <div
        style={{
          position: 'absolute',
          left: 830,
          top: 540,
          transform: `translateY(-50%) scale(${interpolate(card, [0, 1], [0.88, 1])})`,
          opacity: card,
        }}
      >
        <div style={{ background: '#F5F3EE', borderRadius: 20, padding: 28, boxShadow: '0 40px 110px rgba(0,0,0,0.6)' }}>
          <Img src={architecture} style={{ width: 900, height: 'auto', display: 'block', borderRadius: 10 }} />
        </div>
      </div>
      <Vignette />
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// 14 · CLOSE
// ---------------------------------------------------------------------------

export const CloseScene: React.FC<{ durationInFrames: number }> = () => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 78 } });
  const push = interpolate(frame, [0, 375], [1, 1.05], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Stage variant="stage-brand" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: `scale(${push})` }}>
        <div style={{ width: 220, height: 220, opacity: logoIn, transform: `scale(${interpolate(logoIn, [0, 1], [0.55, 1])})`, marginBottom: 24 }}>
          <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <Cue at={4} src={Sfx.sparkle} volume={0.42} />
        <Cue at={64} src={Sfx.chime} volume={0.4} />
        <KineticText
          text="One menu. Run by AI."
          delay={20}
          stagger={3.4}
          gradient
          accentFrom={2}
          style={{ fontSize: 98, justifyContent: 'center', color: C.cream, fontFamily: F.serif, fontWeight: 600, letterSpacing: '-0.025em' }}
        />
        <FadeIn delay={62}>
          <div
            style={{
              marginTop: 42,
              background: C.terracotta,
              color: '#fff',
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 26,
              padding: '16px 38px',
              borderRadius: 999,
              boxShadow: `0 20px 60px ${C.terracotta}44`,
            }}
          >
            sacarta.azpy.es
          </div>
        </FadeIn>
        <FadeIn delay={84}>
          <div style={{ marginTop: 24, fontFamily: F.sans, fontSize: 18, color: C.muted, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            Built in Mallorca for hospitality · free tier included
          </div>
        </FadeIn>
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};
