import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, spring, useCurrentFrame, useVideoConfig, Img, staticFile } from 'remotion';
import { GlobalStyle, KineticText, FadeIn } from './components';
import { Cut, TimeWarp, Stage, Vignette, type Vector } from './cinematic';
import { Cue, Sfx } from './sfx';
import { C, F } from './theme';
import bgm from './bgm.mp3';
import {
  ImportScene,
  WriteScene,
  TranslateScene,
  PublishScene,
  GuestScene,
  CopilotScene,
  CloseScene,
} from './launchScenes';

export const TOUR_DURATION = 1800; // 1:00 at 30 fps

const logo = staticFile('logo-alpha.png');

/**
 * The tour opens on the promise and then gets out of the way: at frame 100 the
 * card lifts off and the browser is already moving underneath, so the video never
 * shows a dead title screen.
 */
const TourTitle: React.FC<{ durationInFrames: number }> = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoIn = spring({ frame: frame - 2, fps, config: { damping: 14, stiffness: 90 } });
  const lift = interpolate(frame, [96, 126], [0, -220], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <AbsoluteFill>
      <Stage variant="stage-brand" />
      <AbsoluteFill
        style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column', transform: `translateY(${lift}px)` }}
      >
        <div style={{ width: 150, height: 150, opacity: logoIn, transform: `scale(${interpolate(logoIn, [0, 1], [0.6, 1])})`, marginBottom: 20 }}>
          <Img src={logo} style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
        </div>
        <KineticText
          text="One menu. Run by AI."
          delay={10}
          stagger={3}
          gradient
          accentFrom={2}
          style={{ fontSize: 92, justifyContent: 'center', color: C.cream, fontFamily: F.serif, fontWeight: 600, letterSpacing: '-0.025em' }}
        />
        <FadeIn delay={44}>
          <div
            style={{
              marginTop: 30,
              fontFamily: F.sans,
              fontSize: 20,
              letterSpacing: '0.34em',
              textTransform: 'uppercase',
              color: C.terracotta2,
            }}
          >
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
 * The recut.
 *
 * Each entry replays a launch scene from `at` at `speed`, so the tour is the same
 * choreography with the setup trimmed off: it enters every scene on the cursor's
 * approach instead of on the headline, and runs about 20 percent faster.
 */
export type TourCut = {
  from: number;
  dur: number;
  /** Frame of the source scene this beat opens on. */
  at: number;
  speed: number;
  enter: Vector;
  exit: Vector;
  Comp: React.FC<{ durationInFrames: number }>;
};

const push = (s = 1.14, blur = 14): Vector => ({ scale: s, blur, dur: 12 });

export const CUTS: TourCut[] = [
  { from: 0, dur: 126, at: 0, speed: 1, enter: { scale: 1.05, dur: 18 }, exit: push(1.2, 14), Comp: TourTitle },
  // Import: opens on the cursor arriving at Import with AI.
  { from: 112, dur: 340, at: 150, speed: 1.3, enter: { scale: 1.16, blur: 14, dur: 14 }, exit: push(1.18, 14), Comp: ImportScene },
  // Write: opens on the pencil click.
  { from: 438, dur: 226, at: 20, speed: 1.25, enter: { scale: 1.16, blur: 12, dur: 12 }, exit: { x: 80, blur: 12, dur: 12 }, Comp: WriteScene },
  // Translate: opens on the English tab click.
  { from: 650, dur: 196, at: 160, speed: 1.2, enter: { x: -80, blur: 12, dur: 12 }, exit: { scale: 0.9, blur: 12, dur: 12 }, Comp: TranslateScene },
  // Publish: opens on the cursor heading for QR Code.
  { from: 832, dur: 250, at: 130, speed: 1.18, enter: { scale: 0.92, blur: 12, dur: 14 }, exit: push(1.2, 14), Comp: PublishScene },
  // The guest, from inside the phone.
  { from: 1068, dur: 264, at: 20, speed: 1.2, enter: { scale: 1.16, blur: 12, dur: 14 }, exit: { x: -90, blur: 12, dur: 12 }, Comp: GuestScene },
  // Copilot, all the way through to the applied prices.
  { from: 1318, dur: 346, at: 100, speed: 1.12, enter: { x: 100, blur: 12, dur: 12 }, exit: { scale: 0.9, blur: 12, dur: 12 }, Comp: CopilotScene },
  { from: 1650, dur: 150, at: 0, speed: 1.3, enter: { scale: 0.92, blur: 10, dur: 16 }, exit: { dur: 2 }, Comp: CloseScene },
];

/** The music starts at 0:12, where the track has already opened up. */
const Score: React.FC = () => (
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

export const TourVideo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <GlobalStyle />
    <Score />
    {CUTS.map(({ from, dur, at, speed, enter, exit, Comp }) => (
      <Sequence key={from} from={from} durationInFrames={dur}>
        <Cut dur={dur} enter={enter} exit={exit}>
          <TimeWarp offset={at} speed={speed}>
            <Comp durationInFrames={dur} />
          </TimeWarp>
        </Cut>
      </Sequence>
    ))}
  </AbsoluteFill>
);
