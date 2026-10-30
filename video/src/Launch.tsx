import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate } from 'remotion';
import { GlobalStyle } from './components';
import { Cut, type Vector } from './cinematic';
import { Cue, Sfx } from './sfx';
import { C } from './theme';
import bgm from './bgm.mp3';
import {
  ColdOpenScene,
  BrandScene,
  CostScene,
  ArrivalScene,
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

export const LAUNCH_DURATION = 4950; // 2:45 at 30 fps
const BGM_FRAMES = 2895; // public/bgm.mp3 is 96.5 s

// Each seam is written from both sides: the outgoing scene's `exit` and the
// incoming scene's `enter` share the sign on scale (the Z rule) and mirror each
// other on travel, so the cut lands mid move and the film reads as one
// continuous camera push rather than fourteen separate slides.
type Beat = {
  from: number;
  dur: number;
  enter: Vector;
  exit: Vector;
  Comp: React.FC<{ durationInFrames: number }>;
};

const push = (s = 1.12, blur = 16): Vector => ({ scale: s, blur, dur: 16 });
const pull = (s = 0.9, blur = 12): Vector => ({ scale: s, blur, dur: 16 });

const BEATS: Beat[] = [
  // 1 The dead menu. Ends pushing in, its light collapsing to a point.
  { from: 0, dur: 270, enter: { scale: 1.06, dur: 26 }, exit: push(1.16, 10), Comp: ColdOpenScene },
  // 2 The point blooms into the brand, then the camera starts pulling back.
  { from: 255, dur: 285, enter: { scale: 1.12, blur: 10, dur: 22 }, exit: pull(0.92, 8), Comp: BrandScene },
  // 3 Enters on the pull, exits trucking right.
  { from: 525, dur: 285, enter: { scale: 0.94, x: -70, blur: 8, dur: 22 }, exit: { x: -90, blur: 10, dur: 16 }, Comp: CostScene },
  // 4 Enters from the right, exits zooming THROUGH the click on Menu Editor.
  { from: 795, dur: 240, enter: { x: 110, blur: 10, dur: 20 }, exit: push(1.3, 20), Comp: ArrivalScene },
  // 5 Import. Picks the push up, exits diving into a dish row.
  { from: 1020, dur: 570, enter: { scale: 1.22, blur: 16, dur: 20 }, exit: push(1.22, 16), Comp: ImportScene },
  // 6 Write. Exits trucking left toward the language tabs.
  { from: 1575, dur: 480, enter: { scale: 1.18, blur: 14, dur: 18 }, exit: { x: 90, blur: 12, dur: 16 }, Comp: WriteScene },
  // 7 Translate. Enters from the left, exits on a hard pull back.
  { from: 2040, dur: 390, enter: { x: -90, blur: 12, dur: 18 }, exit: pull(0.86, 14), Comp: TranslateScene },
  // 8 Publish. Enters on the pull, exits pushing into the phone.
  { from: 2415, dur: 420, enter: { scale: 0.9, blur: 12, dur: 20 }, exit: push(1.26, 16), Comp: PublishScene },
  // 9 The guest, from inside the phone. Exits trucking right.
  { from: 2820, dur: 480, enter: { scale: 1.2, blur: 14, dur: 20 }, exit: { x: -100, blur: 14, dur: 16 }, Comp: GuestScene },
  // 10 Copilot. Enters from the right, exits pulling back and up.
  { from: 3285, dur: 480, enter: { x: 120, blur: 12, dur: 18 }, exit: { scale: 0.9, y: -50, blur: 12, dur: 16 }, Comp: CopilotScene },
  // 11 Improve. Descends in, exits trucking right.
  { from: 3750, dur: 330, enter: { scale: 0.93, y: 60, blur: 10, dur: 20 }, exit: { x: -90, blur: 12, dur: 16 }, Comp: ImproveScene },
  // 12 Proof. Continues the pan, accelerates out to a blur.
  { from: 4065, dur: 225, enter: { x: 100, blur: 12, dur: 18 }, exit: { x: -140, blur: 22, dur: 16 }, Comp: ProofScene },
  // 13 Under the hood. Resolves from the blur, recedes in Z.
  { from: 4275, dur: 315, enter: { x: 150, blur: 20, dur: 20 }, exit: pull(0.86, 12), Comp: HoodScene },
  // 14 Close. Blooms out of the recession and settles.
  { from: 4575, dur: 375, enter: { scale: 0.9, blur: 10, dur: 24 }, exit: { dur: 1 }, Comp: CloseScene },
];

/**
 * The music runs twice with a 60 frame crossfade at the seam, and ducks under
 * the product scenes (from Import to Copilot) so the type and click beats read.
 */
const Score: React.FC = () => {
  const duck = (f: number) =>
    interpolate(f, [1000, 1080, 3740, 3860], [0.5, 0.3, 0.3, 0.48], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
  return (
    <>
      <Sequence from={0} durationInFrames={BGM_FRAMES}>
        <Audio
          src={bgm}
          volume={(f) =>
            duck(f) *
            interpolate(f, [0, 40, BGM_FRAMES - 60, BGM_FRAMES - 1], [0, 1, 1, 0], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            })
          }
        />
      </Sequence>
      <Sequence from={BGM_FRAMES - 60} durationInFrames={LAUNCH_DURATION - BGM_FRAMES + 60}>
        <Audio
          src={bgm}
          volume={(f) =>
            duck(f + BGM_FRAMES - 60) *
            interpolate(
              f,
              [0, 60, LAUNCH_DURATION - BGM_FRAMES - 60, LAUNCH_DURATION - BGM_FRAMES + 59],
              [0, 1, 1, 0],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' },
            )
          }
        />
      </Sequence>
    </>
  );
};

export const LaunchVideo: React.FC = () => (
  <AbsoluteFill style={{ background: C.ink }}>
    <GlobalStyle />
    <Score />
    {/* The riser crests on the close's logo bloom: 10.03 s of build, peaking
        at the logo frame (4575 + 4 = 4579), so it triggers 301 frames earlier. */}
    <Cue at={4278} src={Sfx.riser} volume={0.42} />
    {BEATS.map(({ from, dur, enter, exit, Comp }) => (
      <Sequence key={from} from={from} durationInFrames={dur}>
        <Cut dur={dur} enter={enter} exit={exit}>
          <Comp durationInFrames={dur} />
        </Cut>
      </Sequence>
    ))}
  </AbsoluteFill>
);
