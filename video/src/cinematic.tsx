import React, { createContext, useContext, type ReactNode } from 'react';
import { AbsoluteFill, Audio, interpolate, spring, Sequence, useCurrentFrame, useVideoConfig, Easing, staticFile, Img } from 'remotion';
import { C, F } from './theme';
import type { Shot } from './shots';

// ---------------------------------------------------------------------------
// The sound layer
// ---------------------------------------------------------------------------
//
// SFX live in public/sfx/ (the bundled 21-cue library). A cue is written in the
// coordinate space of wherever it sits: inside a scene it is a scene frame, and
// Cue converts it through the enclosing TimeWarp so the same cue lands on the
// same visual beat in the launch film and in the trailers that replay the scene
// at a speed and offset. Inside a primitive that already reads useSceneFrame,
// the cue fires on that primitive's own clock, which is why a click in the
// cursor makes the same sound in all five films without a single hand placed
// cue.
const S = {
  click: staticFile('sfx/click.mp3'),
  clickSoft: staticFile('sfx/click-soft.mp3'),
  whoosh: staticFile('sfx/whoosh.mp3'),
  whooshShort: staticFile('sfx/whoosh-short.mp3'),
  whooshCinematic: staticFile('sfx/whoosh-cinematic.mp3'),
  pop: staticFile('sfx/pop.mp3'),
  chime: staticFile('sfx/chime.mp3'),
  ping: staticFile('sfx/ping.mp3'),
  sparkle: staticFile('sfx/sparkle.mp3'),
  impact1: staticFile('sfx/impact-bass-1.mp3'),
  impact2: staticFile('sfx/impact-bass-2.mp3'),
  typing: staticFile('sfx/typing.mp3'),
  notification: staticFile('sfx/notification.mp3'),
};

/** A scene-frame SFX trigger, warp aware. */
const Cue: React.FC<{ at: number; src: string; volume?: number; maxFrames?: number }> = ({
  at,
  src,
  volume = 0.5,
  maxFrames = 60,
}) => {
  const { offset, speed } = useContext(WarpCtx);
  if (speed === 0) return null;
  const local = (at - offset) / speed;
  if (!Number.isFinite(local) || local < -2 || local > 30000) return null;
  return (
    <Sequence from={Math.max(0, Math.round(local))} durationInFrames={maxFrames}>
      <Audio src={src} volume={volume * SFX_MASTER} />
    </Sequence>
  );
};

// ---------------------------------------------------------------------------
// The camera
// ---------------------------------------------------------------------------
//
// Every shot is a real screenshot with a known CSS pixel size, so the camera
// can be written in the page's own coordinates: "centre on 1044,255 at zoom
// 1.4" is the button the cursor is about to click. A Stage projects those page
// coordinates onto the 1920x1080 canvas, and the cursor, the labels and the
// highlight rings all read the same projection, so they stay glued to the UI
// while the camera moves.

export type CamKey = {
  /** Frame, relative to the scene. */
  f: number;
  /** Page coordinate held at the centre of the device viewport. */
  x: number;
  y: number;
  /** 1 = the page fits the device viewport. Above 1 pushes in. */
  z: number;
  /** Motion blur in canvas pixels, for velocity matched cuts. */
  blur?: number;
  /**
   * How the move INTO this key eases.
   * 'inOut' (default) is the cinematic slow, fast, slow.
   * 'in' accelerates and never settles: use it on the last key before a cut,
   * so the next scene can pick the velocity up.
   * 'out' decelerates from full speed: use it on the first key after a cut.
   */
  ease?: 'inOut' | 'in' | 'out' | 'linear';
};

const EASE: Record<NonNullable<CamKey['ease']>, (p: number) => number> = {
  inOut: (p) => (p < 0.5 ? 8 * p ** 4 : 1 - 8 * (1 - p) ** 4),
  in: (p) => p ** 4,
  out: (p) => 1 - (1 - p) ** 4,
  linear: (p) => p,
};

type Cam = { x: number; y: number; z: number; blur: number };

// ---------------------------------------------------------------------------
// Scene time
// ---------------------------------------------------------------------------
//
// Every scene and every primitive reads its frame through useSceneFrame instead
// of useCurrentFrame. With no warp in scope the two are identical, so the launch
// film is unaffected. Wrapped in a TimeWarp, a scene can be replayed from an
// arbitrary point at an arbitrary speed, which is how the trailers are cut: they
// are the same scenes, entered later and run faster, not reimplementations.

export const WarpCtx = createContext<{ offset: number; speed: number }>({ offset: 0, speed: 1 });

/**
 * Global SFX trim, 0..1. One knob for the whole sound layer: every cue's volume
 * is multiplied by this, so a mix that reads as too busy can be dialled down in
 * one place instead of touching fifty call sites. v2 sits at 0.55 to keep the
 * bed (music) on top and the effects as accents, not hits.
 */
export const SFX_MASTER = 0.55;

export const TimeWarp: React.FC<{ offset?: number; speed?: number; children: ReactNode }> = ({
  offset = 0,
  speed = 1,
  children,
}) => <WarpCtx.Provider value={{ offset, speed }}>{children}</WarpCtx.Provider>;

/**
 * Suppresses a scene's own titling.
 *
 * The reel needs the visual of a scene with none of its captions: it carries one
 * word per shot instead of a kicker, a headline and a payoff pill. Rather than
 * fork the scenes, they ask whether they are being used bare.
 */
type BareMode = { text: boolean; backdrop: boolean };

const BareCtx = createContext<BareMode>({ text: false, backdrop: false });

/**
 * Strips a scene down so another timeline can reframe it.
 *
 * `text` suppresses the scene's own kickers, headlines and payoff pills, so a
 * recut can set its own copy. `hideBackdrop` also suppresses the scene's full
 * frame stage and vignette, which matters in the vertical cuts: the scene is
 * scaled into a band there, and its opaque 1920x1080 backdrop would otherwise
 * paint over the portrait typography sitting above it.
 */
export const Bare: React.FC<{ children: ReactNode; hideBackdrop?: boolean }> = ({ children, hideBackdrop = false }) => (
  <BareCtx.Provider value={{ text: true, backdrop: hideBackdrop }}>{children}</BareCtx.Provider>
);

/** True when the scene's own text beats should be suppressed. */
export const useBare = () => useContext(BareCtx).text;

/** True when the scene's own full frame backdrop should be suppressed. */
export const useBareBackdrop = () => useContext(BareCtx).backdrop;

/** The frame a scene should render, after any enclosing TimeWarp. */
export const useSceneFrame = (): number => {
  const f = useCurrentFrame();
  const { offset, speed } = useContext(WarpCtx);
  return offset + f * speed;
};

/**
 * Interpolates any set of numeric properties across keyframes with the same
 * easing vocabulary as the camera. Used for the window pose (width, position,
 * 3D rotation) so a scene can dolly its device around the canvas while the
 * camera pans inside it.
 */
export const track = <T extends { f: number; ease?: CamKey['ease'] }>(
  keys: T[],
  frame: number,
): Omit<T, 'f' | 'ease'> => {
  const asNums = (k: T) => k as unknown as Record<string, number>;
  if (keys.length === 0) throw new Error('track needs at least one key');
  if (frame <= keys[0].f) return keys[0];
  const last = keys[keys.length - 1];
  if (frame >= last.f) return last;
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].f <= frame) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const raw = b.f === a.f ? 1 : (frame - a.f) / (b.f - a.f);
  const p = EASE[b.ease ?? 'inOut'](Math.max(0, Math.min(1, raw)));
  const out = {} as Record<string, number>;
  for (const k of Object.keys(a)) {
    if (k === 'f' || k === 'ease') continue;
    const av = asNums(a)[k];
    const bv = asNums(b)[k] ?? av;
    out[k] = av + (bv - av) * p;
  }
  return out as Omit<T, 'f' | 'ease'>;
};

export const readCamera = (keys: CamKey[], frame: number): Cam => {
  if (keys.length === 0) return { x: 0, y: 0, z: 1, blur: 0 };
  if (frame <= keys[0].f) {
    const k = keys[0];
    return { x: k.x, y: k.y, z: k.z, blur: k.blur ?? 0 };
  }
  const last = keys[keys.length - 1];
  if (frame >= last.f) return { x: last.x, y: last.y, z: last.z, blur: last.blur ?? 0 };
  let i = 0;
  while (i < keys.length - 1 && keys[i + 1].f <= frame) i++;
  const a = keys[i];
  const b = keys[i + 1];
  const raw = b.f === a.f ? 1 : (frame - a.f) / (b.f - a.f);
  const p = EASE[b.ease ?? 'inOut'](Math.max(0, Math.min(1, raw)));
  const mix = (u: number, v: number) => u + (v - u) * p;
  return {
    x: mix(a.x, b.x),
    y: mix(a.y, b.y),
    z: mix(a.z, b.z),
    blur: mix(a.blur ?? 0, b.blur ?? 0),
  };
};

/**
 * Keeps the viewport inside the page.
 *
 * Without this, a keyframe centred near an edge at high zoom shows the empty
 * ground beyond the screenshot as a grey or white band, which instantly reads as
 * a broken video. Clamping means a keyframe can be written as "look at this
 * element" without also solving for how much page is left around it.
 */
const clampCam = (cam: Cam, page: { cw: number; ch: number }, view: { w: number; h: number }, base: number): Cam => {
  const s = base * cam.z;
  const halfW = view.w / 2 / s;
  const halfH = view.h / 2 / s;
  return {
    ...cam,
    x: page.cw <= halfW * 2 ? page.cw / 2 : Math.min(Math.max(cam.x, halfW), page.cw - halfW),
    y: page.ch <= halfH * 2 ? page.ch / 2 : Math.min(Math.max(cam.y, halfH), page.ch - halfH),
  };
};

// ---------------------------------------------------------------------------
// Stage context: page coordinates -> canvas coordinates
// ---------------------------------------------------------------------------

type Geom = {
  /** The device viewport rect on the 1920x1080 canvas. */
  left: number;
  top: number;
  w: number;
  h: number;
  /** Page CSS pixels to canvas pixels at zoom 1. */
  base: number;
};

const StageCtx = createContext<{ cam: Cam; geom: Geom } | null>(null);

export type Projected = { x: number; y: number; s: number };

/** Projects a page coordinate onto the canvas. Returns null outside a Stage. */
export const useProject = () => {
  const ctx = useContext(StageCtx);
  return (px: number, py: number): Projected => {
    if (!ctx) return { x: px, y: py, s: 1 };
    const { cam, geom } = ctx;
    const s = geom.base * cam.z;
    return {
      x: geom.left + geom.w / 2 + (px - cam.x) * s,
      y: geom.top + geom.h / 2 + (py - cam.y) * s,
      s,
    };
  };
};

// ---------------------------------------------------------------------------
// Seams
// ---------------------------------------------------------------------------

export type Vector = {
  /** Scale the scene holds at the seam. Above 1 = the camera pushed through it,
   *  below 1 = it pulled back away. Both sides of a seam must share the sign. */
  scale?: number;
  /** Lateral travel in canvas pixels at the seam. */
  x?: number;
  y?: number;
  /** Motion blur at the seam, in canvas pixels. Scale it to the moving area:
   *  about 10 for a text beat, 18 to 20 for a full frame move. */
  blur?: number;
  /** Frames the enter or exit takes. */
  dur?: number;
};

/**
 * A scene wrapper that carries velocity across the cut. `enter` states where the
 * scene is coming FROM and `exit` where it is going TO, so the previous scene's
 * exit vector and this scene's enter vector can be written to match: same sign
 * on scale, opposite sign on travel, comparable blur. The film then reads as one
 * continuous camera move rather than a stack of slides.
 */
export const Cut: React.FC<{
  dur: number;
  enter?: Vector;
  exit?: Vector;
  children: ReactNode;
  bg?: string;
}> = ({ dur, enter = {}, exit = {}, children, bg }) => {
  const frame = useCurrentFrame();
  const eDur = Math.max(2, enter.dur ?? 20);
  // A scene that ends the film has nothing to hand over, so it holds instead of
  // exiting. Guard the range too: interpolate needs it strictly increasing.
  const hasExit = exit.scale !== undefined || exit.x !== undefined || exit.y !== undefined || exit.blur !== undefined;
  const xDur = Math.max(2, exit.dur ?? 16);
  const eP = interpolate(frame, [0, eDur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.poly(4)),
  });
  const xP = hasExit
    ? interpolate(frame, [Math.max(1, dur - xDur), dur], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.in(Easing.poly(4)),
      })
    : 0;
  const scale =
    1 + (1 - eP) * ((enter.scale ?? 1) - 1) + xP * ((exit.scale ?? 1) - 1);
  const tx = (1 - eP) * (enter.x ?? 0) + xP * (exit.x ?? 0);
  const ty = (1 - eP) * (enter.y ?? 0) + xP * (exit.y ?? 0);
  const blur = (1 - eP) * (enter.blur ?? 0) + xP * (exit.blur ?? 0);
  // Opacity leads the enter and trails the exit, so the two scenes overlap in
  // motion rather than dissolving through a flat hold.
  const opacity = Math.min(1, eP * 2.1) * (1 - xP);
  return (
    <AbsoluteFill
      style={{
        background: bg ?? C.ink,
        opacity,
        transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
        filter: blur > 0.4 ? `blur(${blur}px)` : undefined,
      }}
    >
      {/* A soft whoosh as the scene enters: every cut reads as a move. */}
      <Cue at={0} src={S.whooshShort} volume={0.16} />
      {children}
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// Device frames
// ---------------------------------------------------------------------------

const CHROME_H = 44;

const BrowserChrome: React.FC<{ w: number; title: string }> = ({ w, title }) => (
  <div
    style={{
      width: w,
      height: CHROME_H,
      display: 'flex',
      alignItems: 'center',
      gap: 8,
      padding: '0 16px',
      background: '#efece6',
      borderBottom: '1px solid #dcd6cc',
      fontFamily: F.sans,
      flexShrink: 0,
    }}
  >
    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#ff5f57' }} />
    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#febc2e' }} />
    <span style={{ width: 11, height: 11, borderRadius: '50%', background: '#28c840' }} />
    <div
      style={{
        marginLeft: 14,
        flex: 1,
        maxWidth: 520,
        height: 24,
        borderRadius: 999,
        background: '#fbfaf8',
        border: '1px solid #dcd6cc',
        display: 'flex',
        alignItems: 'center',
        padding: '0 12px',
        fontSize: 12.5,
        color: '#8a8178',
        letterSpacing: '0.01em',
        overflow: 'hidden',
        whiteSpace: 'nowrap',
      }}
    >
      {title}
    </div>
  </div>
);

/**
 * A screenshot inside a device frame, with a keyframed camera over it.
 *
 * `pageChildren` render inside the camera transform, in page coordinates, so
 * they stay glued to the UI and scale with the zoom: typing overlays, diff
 * cards, highlight rings.
 *
 * `children` render in canvas coordinates on top of everything: the cursor,
 * floating labels, kickers.
 */
export const BrowserStage: React.FC<{
  /** Layer 0 is the page. Later layers swap in on top of it. */
  layers: { shot: Shot; in?: number; dur?: number; mode?: 'fade' | 'wipeDown' | 'wipeUp' }[];
  keys: CamKey[];
  /** Width of the browser window on the canvas. */
  frameW?: number;
  /** Window centre on the canvas. Defaults to the frame centre. */
  cx?: number;
  cy?: number;
  title?: string;
  /** Extra transform applied to the whole window, for the 3D rotate beats. */
  windowStyle?: React.CSSProperties;
  pageChildren?: ReactNode;
  children?: ReactNode;
  /** Dim and blur the page, for when a dialog owns the frame. */
  dim?: number;
  dimBlur?: number;
  /** Cap the browser frame height on the canvas so a tall full-page shot still
   *  shows the whole window (chrome included) instead of being cropped by the
   *  1080 canvas top and bottom. The camera still pans inside the page. */
  maxH?: number;
}> = ({
  layers,
  keys,
  frameW = 1420,
  cx = 960,
  cy = 540,
  title = 'sacarta.azpy.es/dashboard',
  windowStyle,
  pageChildren,
  children,
  dim = 0,
  dimBlur = 0,
  maxH,
}) => {
  const frame = useSceneFrame();
  const page = layers[0].shot;
  let base = frameW / page.cw;
  let frameH = page.ch * base;
  if (maxH) {
    const capped = Math.min(frameH, maxH);
    base = base * (capped / frameH);
    frameH = capped;
  }
  const cam = clampCam(readCamera(keys, frame), page, { w: frameW, h: frameH }, base);
  const geom: Geom = { left: cx - frameW / 2, top: cy - frameH / 2 + CHROME_H / 2, w: frameW, h: frameH, base };

  const s = base * cam.z;
  const tx = geom.w / 2 - cam.x * s;
  const ty = geom.h / 2 - cam.y * s;

  return (
    <StageCtx.Provider value={{ cam, geom }}>
      <div
        style={{
          position: 'absolute',
          left: cx - frameW / 2,
          top: cy - (frameH + CHROME_H) / 2,
          width: frameW,
          borderRadius: 14,
          overflow: 'hidden',
          background: '#efece6',
          boxShadow: '0 40px 120px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.07)',
          ...windowStyle,
        }}
      >
        <BrowserChrome w={frameW} title={title} />
        <div style={{ position: 'relative', width: frameW, height: frameH, overflow: 'hidden', background: '#fbfaf8' }}>
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: page.cw,
              height: page.ch,
              transformOrigin: '0 0',
              transform: `translate(${tx}px, ${ty}px) scale(${s})`,
              filter: cam.blur > 0 || dimBlur > 0 ? `blur(${cam.blur / s + dimBlur}px)` : undefined,
            }}
          >
            {layers.map((l, i) => {
              if (i === 0) return <PageLayer key={i} shot={l.shot} />;
              const start = l.in ?? 0;
              const dur = l.dur ?? 8;
              const p = interpolate(frame, [start, start + dur], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              });
              if (p <= 0) return null;
              const mode = l.mode ?? 'fade';
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: mode === 'fade' ? p : 1,
                    clipPath:
                      mode === 'wipeDown'
                        ? `inset(0 0 ${(1 - p) * 100}% 0)`
                        : mode === 'wipeUp'
                          ? `inset(${(1 - p) * 100}% 0 0 0)`
                          : undefined,
                  }}
                >
                  <PageLayer shot={l.shot} />
                </div>
              );
            })}
            {dim > 0 && <div style={{ position: 'absolute', inset: 0, background: `rgba(12,9,7,${dim})` }} />}
            {pageChildren}
          </div>
        </div>
      </div>
      {children}
    </StageCtx.Provider>
  );
};

const PageLayer: React.FC<{ shot: Shot }> = ({ shot }) => (
  <Img
    src={shot.src}
    style={{ position: 'absolute', left: 0, top: 0, width: shot.cw, height: shot.ch, display: 'block' }}
  />
);

/** The public menu on a phone, with the same camera and projection contract. */
export const PhoneStage: React.FC<{
  layers: { shot: Shot; in?: number; dur?: number; mode?: 'fade' | 'wipeDown' | 'wipeUp' }[];
  keys: CamKey[];
  /** Phone screen height on the canvas. */
  screenH?: number;
  /** Screen centre on the canvas. The frame positions itself around it. */
  cx?: number;
  cy?: number;
  bezel?: number;
  /** Degrees of in plane rotation, for fanned stacks of phones. */
  rotate?: number;
  opacity?: number;
  windowStyle?: React.CSSProperties;
  pageChildren?: ReactNode;
  children?: ReactNode;
}> = ({
  layers,
  keys,
  screenH = 820,
  cx = 960,
  cy = 540,
  bezel = 12,
  rotate = 0,
  opacity = 1,
  windowStyle,
  pageChildren,
  children,
}) => {
  const frame = useSceneFrame();
  const page = layers[0].shot;
  // The phone screen shows one viewport worth of the page (430x932 CSS).
  const viewCh = 932;
  const base = screenH / viewCh;
  const screenW = 430 * base;
  const cam = clampCam(readCamera(keys, frame), page, { w: screenW, h: screenH }, base);
  const geom: Geom = { left: cx - screenW / 2, top: cy - screenH / 2, w: screenW, h: screenH, base };
  const s = base * cam.z;
  const tx = geom.w / 2 - cam.x * s;
  const ty = geom.h / 2 - cam.y * s;

  return (
    <StageCtx.Provider value={{ cam, geom }}>
      <div
        style={{
          position: 'absolute',
          left: cx - screenW / 2 - bezel,
          top: cy - screenH / 2 - bezel,
          width: screenW + bezel * 2,
          height: screenH + bezel * 2,
          borderRadius: 46 * base + bezel,
          background: 'linear-gradient(150deg, #2a2422, #0c0a09 40%, #1a1614)',
          boxShadow: '0 40px 120px rgba(0,0,0,0.65), 0 0 0 1px rgba(255,255,255,0.10)',
          padding: bezel,
          transform: rotate ? `rotate(${rotate}deg)` : undefined,
          opacity,
          ...windowStyle,
        }}
      >
        <div
          style={{
            position: 'relative',
            width: screenW,
            height: screenH,
            overflow: 'hidden',
            borderRadius: 46 * base,
            background: '#fbfaf8',
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: 0,
              top: 0,
              width: page.cw,
              height: page.ch,
              transformOrigin: '0 0',
              transform: `translate(${tx}px, ${ty}px) scale(${s})`,
              filter: cam.blur > 0 ? `blur(${cam.blur / s}px)` : undefined,
            }}
          >
            {layers.map((l, i) => {
              if (i === 0) return <PageLayer key={i} shot={l.shot} />;
              const start = l.in ?? 0;
              const dur = l.dur ?? 8;
              const p = interpolate(frame, [start, start + dur], [0, 1], {
                extrapolateLeft: 'clamp',
                extrapolateRight: 'clamp',
                easing: Easing.out(Easing.cubic),
              });
              if (p <= 0) return null;
              const mode = l.mode ?? 'fade';
              return (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    inset: 0,
                    opacity: mode === 'fade' ? p : 1,
                    clipPath:
                      mode === 'wipeDown'
                        ? `inset(0 0 ${(1 - p) * 100}% 0)`
                        : mode === 'wipeUp'
                          ? `inset(${(1 - p) * 100}% 0 0 0)`
                          : undefined,
                  }}
                >
                  <PageLayer shot={l.shot} />
                </div>
              );
            })}
            {pageChildren}
          </div>
        </div>
        {/* The dynamic island, so the phone reads as a phone at any size. */}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: bezel + 9 * base,
            transform: 'translateX(-50%)',
            width: 92 * base,
            height: 26 * base,
            borderRadius: 999,
            background: '#0c0a09',
          }}
        />
      </div>
      {children}
    </StageCtx.Provider>
  );
};

// ---------------------------------------------------------------------------
// The cursor
// ---------------------------------------------------------------------------

export type CursorKey = {
  f: number;
  /** Page coordinate to point at. */
  x: number;
  y: number;
  /** Curve the travel INTO this key by this many canvas pixels, perpendicular. */
  arc?: number;
  /** Land a click on this key's frame. */
  click?: boolean;
  /** Enter from outside the canvas: the key's x,y are read as canvas offsets. */
  offscreen?: boolean;
};

const POINTER_PATH = 'M1.5 1.5 L1.5 22.9 L7.2 17.6 L11.3 26.4 L14.9 24.7 L10.8 16.2 L18.2 15.9 Z';

/**
 * The oversized macOS pointer. It enters from off frame, arcs to its target,
 * and clicks. A click is the film's metronome: whatever happens next in the
 * scene is timed off the frame the click lands on.
 */
export const Cursor: React.FC<{
  keys: CursorKey[];
  size?: number;
  /** Hide after this frame. */
  until?: number;
}> = ({ keys, size = 74, until }) => {
  const frame = useSceneFrame();
  const project = useProject();
  if (keys.length === 0) return null;
  if (until !== undefined && frame > until) return null;

  const at = (k: CursorKey): Projected =>
    k.offscreen ? { x: k.x, y: k.y, s: 1 } : project(k.x, k.y);

  let pos: { x: number; y: number };
  if (frame <= keys[0].f) {
    pos = at(keys[0]);
  } else if (frame >= keys[keys.length - 1].f) {
    pos = at(keys[keys.length - 1]);
  } else {
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].f <= frame) i++;
    const a = at(keys[i]);
    const b = at(keys[i + 1]);
    const kb = keys[i + 1];
    const raw = (frame - keys[i].f) / (keys[i + 1].f - keys[i].f);
    const p = EASE.inOut(Math.max(0, Math.min(1, raw)));
    // Quadratic bezier: the control point sits perpendicular to the travel, so
    // the pointer sweeps rather than sliding on a rail.
    const arc = kb.arc ?? 90;
    const mx = (a.x + b.x) / 2;
    const my = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const ctrl = { x: mx + (-dy / len) * arc, y: my + (dx / len) * arc };
    const q = 1 - p;
    pos = {
      x: q * q * a.x + 2 * q * p * ctrl.x + p * p * b.x,
      y: q * q * a.y + 2 * q * p * ctrl.y + p * p * b.y,
    };
  }

  // The click: a short dip on the pointer plus one expanding ring.
  const clicks = keys.filter((k) => k.click);
  let dip = 1;
  for (const k of clicks) {
    const d = frame - k.f;
    if (d >= -2 && d <= 6) {
      dip = Math.min(dip, interpolate(Math.abs(d - 2), [0, 4], [0.84, 1], { extrapolateRight: 'clamp' }));
    }
  }

  return (
    <>
      {clicks.map((k) => (
        <Cue key={`c${k.f}`} at={k.f} src={S.click} volume={0.55} />
      ))}
      {clicks.map((k, i) => {
        const d = frame - k.f;
        if (d < 0 || d > 20) return null;
        const p = d / 20;
        const r = interpolate(p, [0, 1], [6, 54], { easing: Easing.out(Easing.cubic) });
        const o = interpolate(p, [0, 1], [0.75, 0]);
        const at2 = at(k);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: at2.x - r,
              top: at2.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `${Math.max(1.5, 4 * (1 - p))}px solid ${C.terracotta2}`,
              opacity: o,
            }}
          />
        );
      })}
      <svg
        width={size}
        height={size * (28 / 20)}
        viewBox="0 0 20 28"
        style={{
          position: 'absolute',
          left: pos.x,
          top: pos.y,
          transform: `scale(${dip})`,
          transformOrigin: '8% 6%',
          filter: 'drop-shadow(0 6px 14px rgba(0,0,0,0.55))',
        }}
      >
        <path d={POINTER_PATH} fill="#0c0a09" stroke="#ffffff" strokeWidth={1.7} strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** The finger equivalent, for the phone beats. */
export const TouchRing: React.FC<{ keys: CursorKey[]; size?: number }> = ({ keys, size = 74 }) => {
  const frame = useSceneFrame();
  const project = useProject();
  if (keys.length === 0) return null;
  const at = (k: CursorKey) => (k.offscreen ? { x: k.x, y: k.y } : project(k.x, k.y));
  let pos: { x: number; y: number };
  if (frame <= keys[0].f) pos = at(keys[0]);
  else if (frame >= keys[keys.length - 1].f) pos = at(keys[keys.length - 1]);
  else {
    let i = 0;
    while (i < keys.length - 1 && keys[i + 1].f <= frame) i++;
    const a = at(keys[i]);
    const b = at(keys[i + 1]);
    const p = EASE.inOut((frame - keys[i].f) / (keys[i + 1].f - keys[i].f));
    pos = { x: a.x + (b.x - a.x) * p, y: a.y + (b.y - a.y) * p };
  }
  const taps = keys.filter((k) => k.click);
  let press = 1;
  for (const k of taps) {
    const d = frame - k.f;
    if (d >= 0 && d <= 8) press = Math.min(press, interpolate(Math.abs(d - 3), [0, 4], [0.7, 1], { extrapolateRight: 'clamp' }));
  }
  return (
    <>
      {taps.map((k) => (
        <Cue key={`t${k.f}`} at={k.f} src={S.clickSoft} volume={0.45} />
      ))}
      {taps.map((k, i) => {
        const d = frame - k.f;
        if (d < 0 || d > 22) return null;
        const p = d / 22;
        const r = interpolate(p, [0, 1], [size / 2, size * 1.4], { easing: Easing.out(Easing.cubic) });
        const a2 = at(k);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: a2.x - r,
              top: a2.y - r,
              width: r * 2,
              height: r * 2,
              borderRadius: '50%',
              border: `3px solid ${C.terracotta2}`,
              opacity: (1 - p) * 0.7,
            }}
          />
        );
      })}
      <div
        style={{
          position: 'absolute',
          left: pos.x - size / 2,
          top: pos.y - size / 2,
          width: size,
          height: size,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.20)',
          border: '2.5px solid rgba(255,255,255,0.85)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
          transform: `scale(${press})`,
        }}
      />
    </>
  );
};

// ---------------------------------------------------------------------------
// In page overlays
// ---------------------------------------------------------------------------

/** Types text into a real field, in page coordinates, with a caret. */
export const TypeOn: React.FC<{
  text: string;
  box: { x: number; y: number; w: number; h: number };
  /** Frame the first character lands on. */
  start: number;
  /** Characters per frame. */
  cps?: number;
  fontSize?: number;
  color?: string;
  lineHeight?: number;
  padding?: string;
  font?: string;
  align?: 'left' | 'center';
  caret?: boolean;
  /**
   * Paint the field's own background under the text. Required on any real input,
   * because the screenshot underneath still shows its placeholder and the two
   * would render on top of each other.
   */
  cover?: string;
  radius?: number;
}> = ({
  text,
  box,
  start,
  cps = 2.2,
  fontSize = 15,
  color = '#241d19',
  lineHeight = 1.5,
  padding = '10px 13px',
  font = F.sans,
  align = 'left',
  caret = true,
  cover = '#ffffff',
  radius = 7,
}) => {
  const frame = useSceneFrame();
  const n = Math.max(0, Math.min(text.length, Math.floor((frame - start) * cps)));
  if (frame < start) return null;
  const shown = text.slice(0, n);
  // A single soft typing burst while the field fills: the cue fires on start,
  // and the sound itself is a ~1.5 s burst of keys.
  const typingCue = frame < start + 46 ? <Cue at={start} src={S.typing} volume={0.2} /> : null;
  const done = n >= text.length;
  const blink = Math.floor(frame / 8) % 2 === 0;
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x,
        top: box.y,
        width: box.w,
        height: box.h,
        padding,
        fontFamily: font,
        fontSize,
        lineHeight,
        color,
        textAlign: align,
        overflow: 'hidden',
        background: cover,
        borderRadius: radius,
      }}
    >
      {typingCue}
      {shown}
      {caret && (!done || blink) && (
        <span
          style={{
            display: 'inline-block',
            width: 2,
            height: fontSize * 1.05,
            background: C.terracotta,
            marginLeft: 1.5,
            verticalAlign: 'text-bottom',
            opacity: done && !blink ? 0 : 1,
          }}
        />
      )}
    </div>
  );
};

/** A ring drawn around a UI element, in page coordinates. */
export const Ring: React.FC<{
  box: { x: number; y: number; w: number; h: number };
  start: number;
  dur?: number;
  radius?: number;
  color?: string;
  width?: number;
  pad?: number;
  fade?: number;
}> = ({ box, start, dur = 14, radius = 10, color = C.terracotta, width = 2.5, pad = 4, fade }) => {
  const frame = useSceneFrame();
  const p = interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  if (p <= 0) return null;
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: box.x - pad,
        top: box.y - pad,
        width: box.w + pad * 2,
        height: box.h + pad * 2,
        border: `${width}px solid ${color}`,
        borderRadius: radius,
        opacity: p * out,
        transform: `scale(${interpolate(p, [0, 1], [1.06, 1])})`,
        boxShadow: `0 0 0 6px ${color}1f`,
      }}
    />
  );
};

/** A field's own shimmer, for the moment an agent is working on it. */
export const Shimmer: React.FC<{
  box: { x: number; y: number; w: number; h: number };
  start: number;
  end: number;
  radius?: number;
}> = ({ box, start, end, radius = 8 }) => {
  const frame = useSceneFrame();
  if (frame < start || frame > end) return null;
  const p = ((frame - start) % 24) / 24;
  return (
    <div style={{ position: 'absolute', left: box.x, top: box.y, width: box.w, height: box.h, borderRadius: radius, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          bottom: 0,
          left: `${-40 + p * 160}%`,
          width: '40%',
          background: `linear-gradient(90deg, transparent, ${C.terracotta}2e, transparent)`,
        }}
      />
    </div>
  );
};

// ---------------------------------------------------------------------------
// Canvas overlays
// ---------------------------------------------------------------------------

/** A chip on the canvas with a leader line down to a page element. */
export const Callout: React.FC<{
  at: { x: number; y: number };
  label: string;
  start: number;
  /** Which side the chip sits on. */
  side?: 'up' | 'down' | 'left' | 'right';
  dist?: number;
  fade?: number;
}> = ({ at, label, start, side = 'up', dist = 96, fade }) => {
  const frame = useSceneFrame();
  const project = useProject();
  const p = spring({ frame: frame - start, fps: 30, config: { damping: 200, stiffness: 120 } });
  if (frame < start) return null;
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 12], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const t = project(at.x, at.y);
  const dir = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] }[side];
  const ex = t.x + dir[0] * dist * p;
  const ey = t.y + dir[1] * dist * p;
  return (
    <>
      <svg style={{ position: 'absolute', inset: 0, width: 1920, height: 1080, pointerEvents: 'none' }}>
        <line x1={t.x} y1={t.y} x2={ex} y2={ey} stroke={C.terracotta} strokeWidth={1.5} opacity={0.55 * p * out} />
        <circle cx={t.x} cy={t.y} r={3.5} fill={C.terracotta} opacity={p * out} />
      </svg>
      <div
        style={{
          position: 'absolute',
          left: ex,
          top: ey,
          transform: `translate(${side === 'left' ? '-100%' : side === 'right' ? '0' : '-50%'}, ${side === 'up' ? '-100%' : side === 'down' ? '0' : '-50%'})`,
          opacity: p * out,
          background: 'rgba(24,19,16,0.86)',
          border: `1px solid ${C.terracotta}66`,
          color: C.cream,
          fontFamily: F.sans,
          fontSize: 19,
          fontWeight: 600,
          padding: '9px 18px',
          borderRadius: 999,
          whiteSpace: 'nowrap',

        }}
      >
        {label}
      </div>
    </>
  );
};

/** A number that counts up and lands. */
export const CountUp: React.FC<{
  to: number;
  from?: number;
  start: number;
  dur?: number;
  suffix?: string;
  style?: React.CSSProperties;
  gradient?: boolean;
}> = ({ to, from = 0, start, dur = 55, suffix = '', style, gradient }) => {
  const frame = useSceneFrame();
  const v = Math.round(
    interpolate(frame, [start, start + dur], [from, to], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
      easing: Easing.out(Easing.cubic),
    }),
  );
  // A 2 px settle on the frame the number lands, so it reads as an impact.
  const d = frame - (start + dur);
  const kick = d >= 0 && d < 8 ? interpolate(d, [0, 7], [1.06, 1]) : 1;
  return (
    <span
      style={{
        position: 'relative',
        display: 'inline-block',
        transform: `scale(${kick})`,
        ...(gradient
          ? {
              backgroundImage: `linear-gradient(90deg, ${C.terracotta}, ${C.terracotta2}, ${C.amber})`,
              WebkitBackgroundClip: 'text',
              backgroundClip: 'text',
              color: 'transparent',
            }
          : null),
        ...style,
      }}
    >
      <Cue at={start + dur} src={to > 0 ? S.impact1 : S.impact2} volume={to > 0 ? 0.34 : 0.44} />
      {v}
      {suffix}
    </span>
  );
};

/**
 * A staggered arrival cascade. Elements land heaviest last, each one carrying
 * the previous one's momentum, so a group reads as one gesture.
 */
export const Cascade: React.FC<{
  start: number;
  stagger?: number;
  rise?: number;
  children: ReactNode[];
  style?: React.CSSProperties;
  itemStyle?: React.CSSProperties;
}> = ({ start, stagger = 7, rise = 26, children, style, itemStyle }) => {
  const frame = useSceneFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={style}>
      {children.map((c, i) => {
        const s = spring({ frame: frame - start - i * stagger, fps, config: { damping: 200, stiffness: 110 } });
        return (
          <div
            key={i}
            style={{
              opacity: s,
              transform: `translateY(${(1 - s) * rise}px)`,
              ...itemStyle,
            }}
          >
            {c}
          </div>
        );
      })}
    </div>
  );
};

/**
 * A rectangle of a real screenshot, drawn at an arbitrary size on the canvas.
 * Used when an element has to leave its page and travel across the frame: the
 * QR code flying onto the phone is the real code from the real page, not a
 * lookalike drawn in CSS.
 */
export const ShotCrop: React.FC<{
  shot: Shot;
  box: { x: number; y: number; w: number; h: number };
  /** Rendered width on the canvas. Height follows the crop's aspect. */
  width: number;
  style?: React.CSSProperties;
}> = ({ shot, box, width, style }) => {
  const s = width / box.w;
  return (
    <div style={{ position: 'relative', width, height: box.h * s, overflow: 'hidden', ...style }}>
      <Img
        src={shot.src}
        style={{
          position: 'absolute',
          left: -box.x * s,
          top: -box.y * s,
          width: shot.cw * s,
          height: shot.ch * s,
          display: 'block',
        }}
      />
    </div>
  );
};

/**
 * Warm out of focus lights, for the guest scenes. No stock footage.
 *
 * Baked by scripts/bake-backdrops.mjs: nine blurred layers is nine expensive
 * paints per frame for something that never moves.
 */
export const DiningRoom: React.FC = () => <Backdrop src="bg/stage-dining.png" />;

/** The runtime version, kept for one off compositions that need a seed. */
export const Bokeh: React.FC<{ seed?: number; count?: number; opacity?: number }> = ({
  seed = 1,
  count = 9,
  opacity = 0.5,
}) => {
  const dots = Array.from({ length: count }, (_, i) => {
    const r = Math.sin((i + 1) * 12.9898 * seed) * 43758.5453;
    const rr = r - Math.floor(r);
    const r2 = Math.sin((i + 1) * 78.233 * seed) * 43758.5453;
    const rr2 = r2 - Math.floor(r2);
    return {
      x: rr * 1920,
      y: rr2 * 1080,
      size: 120 + rr2 * 260,
      color: i % 3 === 0 ? C.amber : i % 3 === 1 ? C.terracotta : '#c9a227',
      o: 0.10 + rr * 0.16,
    };
  });
  return (
    <div style={{ position: 'absolute', inset: 0, opacity }}>
      {dots.map((d, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: d.x - d.size / 2,
            top: d.y - d.size / 2,
            width: d.size,
            height: d.size,
            borderRadius: '50%',
            background: d.color,
            opacity: d.o,
            filter: 'blur(42px)',
          }}
        />
      ))}
    </div>
  );
};

/** The stage floor: a soft contact shadow under a device. */
export const ContactShadow: React.FC<{ cx: number; cy: number; w: number; opacity?: number }> = ({
  cx,
  cy,
  w,
  opacity = 0.55,
}) => (
  <div
    style={{
      position: 'absolute',
      left: cx - w / 2,
      top: cy,
      width: w,
      height: w * 0.16,
      borderRadius: '50%',
      background: 'radial-gradient(ellipse at center, rgba(0,0,0,0.75), transparent 70%)',
      opacity,
      filter: 'blur(18px)',
    }}
  />
);

/**
 * The dark stage, baked by scripts/bake-backdrops.mjs.
 *
 * These layers never animate, so painting them as CSS gradients on every frame
 * was pure waste: at 1920x1080 a software rasterizer spent more time on the
 * five full frame background paints than on the actual scene. One image blit
 * looks identical and costs a fraction.
 */
/**
 * A baked full frame layer, sized to whatever canvas it lands in.
 *
 * The backdrops are baked at 1920x1080, so on the 1080x1920 vertical canvas they
 * are covered rather than letterboxed: the stage is lighting, not content, and
 * cropping its gradients costs nothing.
 */
const Backdrop: React.FC<{ src: string; opacity?: number }> = ({ src, opacity }) => {
  const { width, height } = useVideoConfig();
  if (useBareBackdrop()) return null;
  return (
    <Img
      src={staticFile(src)}
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width,
        height,
        objectFit: 'cover',
        display: 'block',
        opacity,
        pointerEvents: 'none',
      }}
    />
  );
};

export const Stage: React.FC<{ variant?: 'stage' | 'stage-warm' | 'stage-brand' }> = ({ variant = 'stage' }) => (
  <Backdrop src={`bg/${variant}.png`} />
);

/** Edge darkening, so the eye stays on the acting area. Also baked. */
export const Vignette: React.FC<{ strength?: 'soft' | 'strong' | 'deep' }> = ({ strength = 'soft' }) => (
  <Backdrop
    src={strength === 'deep' ? 'bg/vignette-deep.png' : strength === 'strong' ? 'bg/vignette-strong.png' : 'bg/vignette.png'}
  />
);

// ---------------------------------------------------------------------------
// Portrait framing
// ---------------------------------------------------------------------------

/**
 * Frames a 1920x1080 scene inside a 1080x1920 canvas.
 *
 * A vertical cut is not a crop of the wide one. There is not enough height in a
 * 16:9 frame to fill a 9:16 one, so the scene is scaled to a band and the frame's
 * own top and bottom bands carry portrait native typography, which is why the
 * scenes are played through `Bare`: their 16:9 text beats are suppressed and the
 * vertical timeline sets its own.
 *
 * `fill` is the fraction of the scene's 1920 width that fills the canvas width,
 * so 1 shows the whole scene and 0.34 pushes into a phone until it is the frame.
 */
export const PortraitStage: React.FC<{
  /** The point of the scene held at (canvas centre x, holdY). */
  fx?: number;
  fy?: number;
  fill?: number;
  holdY?: number;
  children: ReactNode;
}> = ({ fx = 960, fy = 540, fill = 0.78, holdY, children }) => {
  const { width, height } = useVideoConfig();
  const s = width / (1920 * fill);
  const y = holdY ?? height / 2;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: 1920,
        height: 1080,
        transformOrigin: '0 0',
        transform: `translate(${width / 2 - fx * s}px, ${y - fy * s}px) scale(${s})`,
      }}
    >
      {children}
    </div>
  );
};
