import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Easing, staticFile } from 'remotion';
import { GlobalStyle, KineticText, FadeIn, PillBadge } from './components';
import { Cut, TimeWarp, Bare, PortraitStage, Stage, DiningRoom, Vignette } from './cinematic';
import { Cue, Sfx } from './sfx';
import { C, F } from './theme';
import bgm from './bgm.mp3';
import { CUTS, TOUR_DURATION } from './Tour';
import { TIMELINE, REEL_DURATION } from './Reel';

// ---------------------------------------------------------------------------
// The vertical cuts
// ---------------------------------------------------------------------------
//
// A 9:16 cut is not a crop of the 16:9 one: a 1920x1080 frame does not contain
// enough height to fill a 1080x1920 one, so cropping to fit would show a 607 px
// wide slice of the film. Instead each scene is played through `Bare`, which
// suppresses its wide text beats, and framed into a band by `PortraitStage`.
// The frame's own top and bottom bands then carry portrait native typography.
//
// One table per timeline, indexed against the wide cut, so the two exports stay
// in sync: same shots, same cut points, same music, different layout.

const logo = staticFile('logo-alpha.png');

/** How a wide scene is framed into the vertical frame. */
type Frame = {
  /** Fraction of the scene's 1920 width that fills the 1080 canvas width. */
  fill: number;
  /** The scene point held at the canvas centre line. */
  fx?: number;
  fy?: number;
  /** Where that point sits vertically on the 1920 tall canvas. */
  holdY?: number;
  /** Which baked backdrop the vertical frame paints behind the scene. */
  bg?: 'stage' | 'stage-warm' | 'stage-brand' | 'dining';
};

// A browser at fill 0.8 fits the whole window in the 1080 wide frame, and then
// the page inside renders at 0.68 canvas pixels per CSS pixel, which puts real
// 13 px UI text under 9 px on screen: legible in 16:9, illegible in 9:16. So the
// vertical crops into the window instead of fitting it, trading the window's
// edges for a page that can actually be read.
const BROWSER: Frame = { fill: 0.55, fx: 960, fy: 566, holdY: 1020 };
const PHONE: Frame = { fill: 0.42, fx: 960, fy: 540, holdY: 1120, bg: 'dining' };

// ---------------------------------------------------------------------------
// Portrait furniture
// ---------------------------------------------------------------------------

const Backdrop: React.FC<{ bg?: Frame['bg'] }> = ({ bg }) =>
  bg === 'dining' ? <DiningRoom /> : <Stage variant={bg ?? 'stage'} />;

const VKick: React.FC<{ children: React.ReactNode; delay?: number; fade?: number }> = ({ children, delay = 4, fade }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [delay, delay + 12], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  const out = fade === undefined ? 1 : interpolate(frame, [fade, fade + 9], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 120,
        textAlign: 'center',
        opacity: p * out,
        fontFamily: F.sans,
        fontSize: 26,
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

/** The headline, set for the open band above the device. */
const VBeat: React.FC<{ lines: [string, string?]; start?: number; size?: number; top?: number }> = ({
  lines,
  start = 8,
  size = 76,
  top = 240,
}) => (
  <div style={{ position: 'absolute', left: 70, right: 70, top, textAlign: 'center' }}>
    <KineticText
      text={lines[0]}
      delay={start}
      stagger={2.4}
      style={{
        fontSize: size,
        lineHeight: 1.06,
        color: C.cream,
        fontFamily: F.serif,
        fontWeight: 600,
        letterSpacing: '-0.02em',
        justifyContent: 'center',
      }}
    />
    {lines[1] && (
      <KineticText
        text={lines[1]}
        delay={start + 10}
        stagger={2.4}
        gradient
        accentFrom={0}
        style={{
          fontSize: size,
          lineHeight: 1.06,
          color: C.cream,
          fontFamily: F.serif,
          fontWeight: 600,
          letterSpacing: '-0.02em',
          justifyContent: 'center',
        }}
      />
    )}
  </div>
);

const VPayoff: React.FC<{ children: React.ReactNode; start: number; y?: number }> = ({ children, start, y = 1720 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const s = spring({ frame: frame - start, fps, config: { damping: 200, stiffness: 130 } });
  if (frame < start) return null;
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, display: 'flex', justifyContent: 'center', opacity: s }}>
      <PillBadge
        style={{
          fontSize: 26,
          padding: '14px 30px',
          background: 'rgba(20,15,12,0.94)',
          border: `1px solid ${C.terracotta}66`,
          transform: `translateY(${(1 - s) * 18}px)`,
          maxWidth: 940,
          textAlign: 'center',
          display: 'block',
        }}
      >
        {children}
      </PillBadge>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Trailer A, vertical
// ---------------------------------------------------------------------------

/** Portrait title card: its own layout, not the wide one squeezed. */
const VTourTitle: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 90 } });
  const lift = interpolate(frame, [96, 126], [0, -260], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Stage variant="stage-brand" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: `translateY(${lift}px)` }}>
        <div style={{ width: 210, height: 210, opacity: logoIn, transform: `scale(${interpolate(logoIn, [0, 1], [0.6, 1])})`, marginBottom: 34 }}>
          <img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ padding: '0 60px' }}>
          <KineticText
            text="One menu. Run by AI."
            delay={10}
            stagger={3}
            gradient
            accentFrom={2}
            style={{
              fontSize: 96,
              justifyContent: 'center',
              color: C.cream,
              fontFamily: F.serif,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          />
        </div>
        <FadeIn delay={44}>
          <div style={{ marginTop: 40, fontFamily: F.sans, fontSize: 26, letterSpacing: '0.34em', textTransform: 'uppercase', color: C.terracotta2 }}>
            a 60 second tour
          </div>
        </FadeIn>
        <Cue at={4} src={Sfx.sparkle} volume={0.42} />
        <Cue at={14} src={Sfx.chime} volume={0.32} />
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

/**
 * Per cut vertical framing and copy, indexed against Tour's CUTS. The wide cut
 * owns the timing; this table owns the layout.
 */
const TOUR_V: ({ frame: Frame; kick?: string; lines?: [string, string?]; payoff?: string; payoffAt?: number } | null)[] = [
  null, // 0 the title card has its own portrait layout
  { frame: BROWSER, kick: '01 · Import', lines: ['Start from the PDF', 'you already have.'], payoff: '14 dishes · 38 seconds', payoffAt: 250 },
  { frame: { ...BROWSER, fill: 0.46, fy: 600 }, kick: '02 · Write', lines: ['Descriptions', 'that sell.'] },
  { frame: { ...BROWSER, fill: 0.48, fy: 600 }, kick: '03 · Translate', lines: ['Every dish.', 'Every language.'], payoff: '7 languages, automatic', payoffAt: 130 },
  // Publish has to hold the browser and the arriving phone in one frame, so it
  // is the one shot that stays wide.
  { frame: { fill: 0.9, fx: 1010, fy: 566, holdY: 1020, bg: 'stage-warm' }, kick: '04 · Publish', lines: ['One code', 'on the table.'] },
  { frame: PHONE, kick: '05 · Your guests', lines: ['Grounded in your menu.'], payoff: 'No invented dishes', payoffAt: 170 },
  { frame: { ...BROWSER, fill: 0.5, fy: 480 }, kick: '06 · Copilot', lines: ['Stop editing.', 'Just ask.'], payoff: 'Nothing changes until you confirm', payoffAt: 150 },
  null, // 7 the close card lays itself out
];

/** The close, portrait native. */
const VClose: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 4, fps, config: { damping: 14, stiffness: 78 } });
  return (
    <AbsoluteFill>
      <Stage variant="stage-brand" />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ width: 240, height: 240, opacity: logoIn, transform: `scale(${interpolate(logoIn, [0, 1], [0.55, 1])})`, marginBottom: 34 }}>
          <img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <div style={{ padding: '0 60px' }}>
          <KineticText
            text="One menu. Run by AI."
            delay={16}
            stagger={3.2}
            gradient
            accentFrom={2}
            style={{
              fontSize: 92,
              justifyContent: 'center',
              color: C.cream,
              fontFamily: F.serif,
              fontWeight: 600,
              letterSpacing: '-0.025em',
              lineHeight: 1.05,
            }}
          />
        </div>
        <FadeIn delay={46}>
          <div
            style={{
              marginTop: 52,
              background: C.terracotta,
              color: '#fff',
              fontFamily: F.sans,
              fontWeight: 700,
              fontSize: 32,
              padding: '18px 44px',
              borderRadius: 999,
              boxShadow: `0 20px 60px ${C.terracotta}44`,
            }}
          >
            sacarta.azpy.es
          </div>
        </FadeIn>
        <FadeIn delay={68}>
          <div style={{ marginTop: 30, fontFamily: F.sans, fontSize: 22, color: C.muted, letterSpacing: '0.22em', textTransform: 'uppercase' }}>
            free tier included
          </div>
        </FadeIn>
        <Cue at={4} src={Sfx.sparkle} volume={0.42} />
        <Cue at={48} src={Sfx.chime} volume={0.4} />
      </AbsoluteFill>
      <Vignette />
    </AbsoluteFill>
  );
};

const TourScore: React.FC = () => (
  <Sequence from={0} durationInFrames={TOUR_DURATION}>
    <Audio
      src={bgm}
      startFrom={360}
      volume={(f) =>
        interpolate(f, [0, 24, TOUR_DURATION - 90, TOUR_DURATION - 1], [0, 0.44, 0.44, 0], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        })
      }
    />
  </Sequence>
);

export const TourVerticalVideo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <GlobalStyle />
    <TourScore />
    {CUTS.map((c, i) => {
      const v = TOUR_V[i];
      return (
        <Sequence key={c.from} from={c.from} durationInFrames={c.dur}>
          <Cut dur={c.dur} enter={c.enter} exit={c.exit}>
            <Backdrop bg={v?.frame.bg} />
            {v === null ? (
              i === 0 ? (
                <VTourTitle />
              ) : (
                <VClose />
              )
            ) : (
              <>
                <PortraitStage fill={v.frame.fill} fx={v.frame.fx} fy={v.frame.fy} holdY={v.frame.holdY}>
                  <Bare hideBackdrop>
                    <TimeWarp offset={c.at} speed={c.speed}>
                      <c.Comp durationInFrames={c.dur} />
                    </TimeWarp>
                  </Bare>
                </PortraitStage>
                {v.kick && <VKick>{v.kick}</VKick>}
                {v.lines && <VBeat lines={v.lines} size={v.lines[1] ? 74 : 62} />}
                {v.payoff && <VPayoff start={v.payoffAt ?? 120}>{v.payoff}</VPayoff>}
                <Vignette />
              </>
            )}
          </Cut>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);

// ---------------------------------------------------------------------------
// Trailer B, vertical
// ---------------------------------------------------------------------------

/** The reel's single word, in the portrait upper third where it has room. */
const VWord: React.FC<{ text: string; size?: number }> = ({ text, size = 104 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.poly(4)) });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: 250, textAlign: 'center' }}>
      {/* The same scrim the wide reel uses: several of these shots put the word
          over a light product page, where cream type on a shadow reads muddy. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -110,
          height: size + 230,
          background: 'linear-gradient(to bottom, rgba(9,7,6,0.72), rgba(9,7,6,0.66) 55%, transparent)',
          opacity: p,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          padding: '0 50px',
          transform: `scale(${interpolate(p, [0, 1], [1.2, 1])})`,
          opacity: p,
          fontFamily: F.serif,
          fontSize: size,
          fontWeight: 700,
          color: C.cream,
          lineHeight: 1.04,
          textShadow: '0 10px 44px rgba(0,0,0,0.9)',
        }}
      >
        {text}
      </div>
    </div>
  );
};

/**
 * Vertical framing per reel shot, indexed against Reel's TIMELINE. A shot that is
 * a card of its own (the breaths, the stat slams, the flicker) needs no entry:
 * those components are centred flex and lay themselves out in any canvas.
 */
const REEL_V: (Frame | null)[] = [
  { fill: 1.0, fy: 560, holdY: 1120 }, // the paper falling
  { fill: 1.0, holdY: 960, bg: 'stage-brand' }, // brand hit
  { ...BROWSER, fill: 0.5 }, // upload
  { ...BROWSER, fill: 0.5 }, // read
  BROWSER, // structure
  { ...BROWSER, fill: 0.42, fy: 620 }, // write, tight on the field
  { ...BROWSER, fill: 0.44, fy: 620 }, // translate
  { fill: 0.86, fy: 640, holdY: 1060 }, // the language wall needs its width
  { ...BROWSER, fill: 0.6, bg: 'stage-warm' }, // publish
  { fill: 0.92, fx: 1050, fy: 566, holdY: 1020, bg: 'stage-warm' }, // scan, browser plus phone
  PHONE, // read
  PHONE, // switch
  PHONE, // ask
  null, // card
  { ...BROWSER, fill: 0.5, fy: 560 }, // talk
  { ...BROWSER, fill: 0.5, fy: 480 }, // it works
  { ...BROWSER, fill: 0.5, fy: 460 }, // preview
  { ...BROWSER, fill: 0.5, fy: 460 }, // confirm
  { ...BROWSER, fill: 0.5, fy: 500 }, // done
  { ...BROWSER, fill: 0.5, fy: 420 }, // grade
  { ...BROWSER, fill: 0.55, fy: 560 }, // improve
  { ...BROWSER, fill: 0.6 }, // measure
  { fill: 0.62, fy: 470, holdY: 1140, bg: 'dining' }, // every table
  { fill: 0.95, fy: 540, holdY: 1020 }, // seven agents
  null, // card
  null, // slam
  null, // slam
  null, // slam
  null, // flicker
  null, // close
];

const ReelScore: React.FC = () => (
  <Sequence from={0} durationInFrames={REEL_DURATION}>
    <Audio
      src={bgm}
      startFrom={840}
      volume={(f) =>
        interpolate(
          f,
          [0, 18, 1190, 1210, 1220, 1330, REEL_DURATION - 70, REEL_DURATION - 1],
          [0, 0.55, 0.55, 0, 0, 0.55, 0.55, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
        )
      }
    />
  </Sequence>
);

export const ReelVerticalVideo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <GlobalStyle />
    <ReelScore />
    {TIMELINE.map((s, i) => {
      const v = REEL_V[i];
      const isLast = i === TIMELINE.length - 1;
      return (
        <Sequence key={i} from={s.from} durationInFrames={s.dur}>
          <Cut
            dur={s.dur}
            enter={i === 0 ? { dur: 2 } : { scale: 1.07, blur: 9, dur: 5 }}
            exit={isLast ? { dur: 2 } : { scale: 1.07, blur: 9, dur: 4 }}
          >
            {s.card ?? null}
            {s.Comp && (
              <>
                <Backdrop bg={v?.bg} />
                <PortraitStage fill={v?.fill ?? 0.8} fx={v?.fx} fy={v?.fy} holdY={v?.holdY}>
                  <Bare hideBackdrop>
                    <TimeWarp offset={s.at ?? 0} speed={s.speed ?? 1}>
                      <s.Comp durationInFrames={s.dur} />
                    </TimeWarp>
                  </Bare>
                </PortraitStage>
                <Vignette />
              </>
            )}
            {s.word ? <VWord text={s.word} size={s.word.length > 12 ? 76 : 104} /> : null}
          </Cut>
        </Sequence>
      );
    })}
  </AbsoluteFill>
);
