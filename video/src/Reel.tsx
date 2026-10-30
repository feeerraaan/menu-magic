import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, useCurrentFrame, Easing } from 'remotion';
import { GlobalStyle, KineticText, GradientText } from './components';
import { Cut, TimeWarp, Bare, Stage, Vignette, type Vector } from './cinematic';
import { Cue, Sfx } from './sfx';
import { C, F } from './theme';
import bgm from './bgm.mp3';
import {
  ColdOpenScene,
  BrandScene,
  ImportScene,
  WriteScene,
  TranslateScene,
  PublishScene,
  GuestScene,
  CopilotScene,
  ImproveScene,
  ProofScene,
  HoodScene,
  CloseScene,
} from './launchScenes';



// ---------------------------------------------------------------------------
// The word
// ---------------------------------------------------------------------------

/**
 * One word per shot, and the word is the caption.
 *
 * A feed viewer has under two seconds per shot and the sound is off, so there is
 * no sentence to read: a single verb lands with a scale punch, holds, and the cut
 * takes it off screen mid hold rather than animating it out.
 */
const Word: React.FC<{ text: string; size?: number; y?: number; sub?: string }> = ({ text, size = 92, y = 880, sub }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 7], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.poly(4)) });
  return (
    <div style={{ position: 'absolute', left: 0, right: 0, top: y, textAlign: 'center' }}>
      <Cue at={0} src={Sfx.pop} volume={0.3} />
      {/* A scrim under the word: half these shots land on a light product page,
          where a drop shadow alone leaves cream type muddy. */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: -60,
          height: size + 150,
          background: 'linear-gradient(to bottom, transparent, rgba(9,7,6,0.62) 45%, rgba(9,7,6,0.72))',
          opacity: p,
        }}
      />
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          transform: `scale(${interpolate(p, [0, 1], [1.22, 1])})`,
          opacity: p,
          fontFamily: F.serif,
          fontSize: size,
          fontWeight: 700,
          letterSpacing: '0.01em',
          color: C.cream,
          textShadow: '0 10px 44px rgba(0,0,0,0.9)',
          padding: '0 40px',
        }}
      >
        {text}
      </div>
      {sub && (
        <div
          style={{
            position: 'relative',
            marginTop: 12,
            fontFamily: F.sans,
            fontSize: 24,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: C.terracotta2,
            opacity: p,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
};

/** A full frame card, for the two breaths in the middle of the reel. */
const Card: React.FC<{ lines: string[]; size?: number }> = ({ lines, size = 96 }) => (
  <AbsoluteFill>
    <Cue at={0} src={Sfx.chime} volume={0.34} />
    <Stage variant="stage-brand" />
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', padding: '0 160px' }}>
      {lines.map((l, i) => (
        <KineticText
          key={l}
          text={l}
          delay={i * 6}
          stagger={2.2}
          gradient={i === lines.length - 1}
          accentFrom={i === lines.length - 1 ? 0 : -1}
          style={{
            fontSize: size,
            justifyContent: 'center',
            color: C.cream,
            fontFamily: F.serif,
            fontWeight: 600,
            letterSpacing: '-0.02em',
            lineHeight: 1.04,
          }}
        />
      ))}
    </AbsoluteFill>
    <Vignette />
  </AbsoluteFill>
);

/** A number on black, hit hard and cut away mid punch. */
const Slam: React.FC<{ big: string; label: string }> = ({ big, label }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, 5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.poly(5)) });
  return (
    <AbsoluteFill style={{ background: '#0b0908', alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
      <Cue at={0} src={Sfx.impact2} volume={0.5} />
      <div
        style={{
          fontFamily: F.serif,
          fontSize: 220,
          fontWeight: 700,
          lineHeight: 1,
          transform: `scale(${interpolate(p, [0, 1], [1.3, 1])})`,
          opacity: p,
        }}
      >
        <GradientText>{big}</GradientText>
      </div>
      <div
        style={{
          marginTop: 22,
          fontFamily: F.sans,
          fontSize: 32,
          letterSpacing: '0.16em',
          textTransform: 'uppercase',
          color: C.cream,
          opacity: p,
        }}
      >
        {label}
      </div>
    </AbsoluteFill>
  );
};

// ---------------------------------------------------------------------------
// The shot list
// ---------------------------------------------------------------------------

export type ReelShot = {
  dur: number;
  /** A launch scene played bare, from `at` at `speed`. */
  Comp?: React.FC<{ durationInFrames: number }>;
  at?: number;
  speed?: number;
  /** Or a card of its own. */
  card?: React.ReactNode;
  word?: string;
  wordSize?: number;
  wordY?: number;
};

// Every shot is cut while its subject is still moving, and the next one enters
// carrying the same push, so thirty cuts still read as one current.
const ENTER: Vector = { scale: 1.07, blur: 9, dur: 5 };
const EXIT: Vector = { scale: 1.07, blur: 9, dur: 4 };

const SHOTS: ReelShot[] = [
  { dur: 45, Comp: ColdOpenScene, at: 226, speed: 1, word: 'Your menu is dead.', wordSize: 74 },
  { dur: 60, Comp: BrandScene, at: 4, speed: 1, word: '' },
  { dur: 45, Comp: ImportScene, at: 226, speed: 1.1, word: 'UPLOAD' },
  { dur: 45, Comp: ImportScene, at: 300, speed: 1.6, word: 'READ' },
  { dur: 45, Comp: ImportScene, at: 382, speed: 1.1, word: 'STRUCTURE' },
  { dur: 60, Comp: WriteScene, at: 120, speed: 1.4, word: 'WRITE' },
  { dur: 45, Comp: TranslateScene, at: 200, speed: 1.4, word: 'TRANSLATE' },
  { dur: 45, Comp: TranslateScene, at: 300, speed: 1.1, word: '7 LANGUAGES' },
  { dur: 60, Comp: PublishScene, at: 176, speed: 1.2, word: 'PUBLISH' },
  { dur: 45, Comp: PublishScene, at: 300, speed: 1.3, word: 'SCAN' },
  { dur: 60, Comp: GuestScene, at: 40, speed: 1.2, word: 'READ' },
  { dur: 45, Comp: GuestScene, at: 110, speed: 1.1, word: 'SWITCH' },
  { dur: 60, Comp: GuestScene, at: 250, speed: 1.1, word: 'ASK' },
  { dur: 45, card: <Card lines={['And when the menu', 'changes?']} size={82} /> },
  { dur: 60, Comp: CopilotScene, at: 130, speed: 1.3, word: 'TALK' },
  { dur: 45, Comp: CopilotScene, at: 196, speed: 1.1, word: 'IT WORKS' },
  { dur: 60, Comp: CopilotScene, at: 232, speed: 1.2, word: 'PREVIEW' },
  { dur: 45, Comp: CopilotScene, at: 304, speed: 1.1, word: 'CONFIRM' },
  { dur: 60, Comp: CopilotScene, at: 420, speed: 1.1, word: 'DONE' },
  { dur: 45, Comp: ImproveScene, at: 44, speed: 1.5, word: 'GRADE' },
  { dur: 45, Comp: ImproveScene, at: 268, speed: 1.1, word: 'IMPROVE' },
  { dur: 60, Comp: ProofScene, at: 118, speed: 1.4, word: 'MEASURE' },
  { dur: 60, Comp: GuestScene, at: 356, speed: 1.1, word: 'EVERY TABLE' },
  { dur: 60, Comp: HoodScene, at: 20, speed: 1.2, word: 'SEVEN AGENTS', wordSize: 76 },
  { dur: 45, card: <Card lines={['No reprints.', 'Ever.']} size={100} /> },
  { dur: 45, card: <Slam big="38 s" label="to import a menu" /> },
  { dur: 45, card: <Slam big="7" label="languages, automatic" /> },
  { dur: 45, card: <Slam big="0" label="reprints, ever" /> },
  // The compression: six single held frames of everything already shown.
  { dur: 120, Comp: undefined, card: <Flicker /> },
  { dur: 255, Comp: CloseScene, at: 0, speed: 1.3 },
];

/** Six of the reel's own shots, held one beat each and blurred out. */
function Flicker() {
  const frame = useCurrentFrame();
  const i = Math.min(5, Math.floor(frame / 20));
  const local = frame % 20;
  const beats: { Comp: React.FC<{ durationInFrames: number }>; at: number }[] = [
    { Comp: ImportScene, at: 240 },
    { Comp: WriteScene, at: 170 },
    { Comp: PublishScene, at: 210 },
    { Comp: GuestScene, at: 280 },
    { Comp: CopilotScene, at: 250 },
    { Comp: ImproveScene, at: 290 },
  ];
  const b = beats[i];
  const blur = interpolate(local, [0, 12, 19], [0, 0, 16], { extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill style={{ filter: blur > 0.5 ? `blur(${blur}px)` : undefined, background: C.ink }}>
      <Cue at={0} src={Sfx.whooshShort} volume={0.3} />
      <Bare>
        <TimeWarp offset={b.at} speed={0}>
          <b.Comp durationInFrames={20} />
        </TimeWarp>
      </Bare>
    </AbsoluteFill>
  );
}

// Lay the shots out on the timeline with a 4 frame overlap, so a cut always lands
// on top of the outgoing shot's motion. The composition length is derived from
// the shot list rather than declared, so editing a shot cannot leave dead frames
// hanging off the end.
const OVERLAP = 4;
let cursor = 0;
export const TIMELINE = SHOTS.map((s) => {
  const from = Math.max(0, cursor - OVERLAP);
  cursor = from + s.dur;
  return { ...s, from };
});

// Derived from the shot list, so the composition can never claim frames the
// timeline does not fill: an over-long duration is just trailing black.
export const REEL_DURATION = cursor;

/** The music comes in at its densest section, with a gap before the stat slams. */
const Score: React.FC = () => (
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

export const ReelVideo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <GlobalStyle />
    <Score />
    {TIMELINE.map((s, i) => (
      <Sequence key={i} from={s.from} durationInFrames={s.dur}>
        <Cut dur={s.dur} enter={i === 0 ? { dur: 2 } : ENTER} exit={i === TIMELINE.length - 1 ? { dur: 2 } : EXIT}>
          {s.card ?? null}
          {s.Comp && (
            <Bare>
              <TimeWarp offset={s.at ?? 0} speed={s.speed ?? 1}>
                <s.Comp durationInFrames={s.dur} />
              </TimeWarp>
            </Bare>
          )}
          {s.word ? <Word text={s.word} size={s.wordSize} y={s.wordY} /> : null}
        </Cut>
      </Sequence>
    ))}
  </AbsoluteFill>
);
