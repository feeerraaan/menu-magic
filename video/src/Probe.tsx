import React from 'react';
import { AbsoluteFill, Sequence, useCurrentFrame } from 'remotion';
import { LaunchVideo } from './Launch';
import { TourVideo } from './Tour';
import { ReelVideo } from './Reel';
import { TourVerticalVideo, ReelVerticalVideo } from './Vertical';
import { C, F } from './theme';

/**
 * Development compositions that sample a film: probe frame i renders film frame
 * SAMPLES[i]. One render pass gives a contact sheet of a whole video, which
 * matters on a 2 CPU box where a full preview costs half an hour and
 * `remotion still` pays the webpack bundle again for every single frame.
 *
 *   npx remotion render ProbeLaunch out/probe.mp4 --scale=0.62
 *   ffmpeg -i out/probe.mp4 out/probe/%03d.png
 */
const sampler = (Film: React.FC, samples: number[]): React.FC => () => {
  const i = useCurrentFrame();
  const target = samples[Math.min(i, samples.length - 1)];
  // A negative `from` shifts the child's clock forward, so the child renders the
  // frame we want to inspect.
  return (
    <AbsoluteFill style={{ background: C.ink }}>
      <Sequence from={-(target - i)}>
        <Film />
      </Sequence>
      <div
        style={{
          position: 'absolute',
          left: 18,
          bottom: 14,
          fontFamily: F.sans,
          fontSize: 26,
          fontWeight: 700,
          color: '#fff',
          background: 'rgba(0,0,0,0.72)',
          padding: '6px 14px',
          borderRadius: 8,
        }}
      >
        f{target} · {(target / 30).toFixed(1)}s
      </div>
    </AbsoluteFill>
  );
};

export const LAUNCH_SAMPLES = [
  40, 110, 200, 250,
  300, 380, 470,
  560, 640, 740,
  830, 900, 985,
  1060, 1140, 1215, 1250, 1330, 1420, 1500, 1560,
  1620, 1680, 1730, 1800, 1880, 1950, 2020,
  2060, 2140, 2220, 2270, 2360, 2410,
  2440, 2520, 2600, 2680, 2730, 2790,
  2860, 2930, 2960, 3000, 3070, 3140, 3200, 3260,
  3320, 3400, 3460, 3520, 3560, 3600, 3660, 3720,
  3790, 3850, 3960, 4040,
  4090, 4160, 4240,
  4300, 4400, 4500,
  4620, 4700, 4820,
];

export const TOUR_SAMPLES = [
  40, 100, 130, 200, 280, 360, 430,
  470, 540, 600, 660,
  700, 760, 820,
  870, 940, 1010, 1070,
  1110, 1180, 1250, 1320,
  1380, 1450, 1520, 1600, 1650,
  1700, 1770,
];

export const REEL_SAMPLES = [
  20, 60, 90, 130, 175, 215, 260, 300, 340, 385, 425, 470, 510,
  555, 600, 645, 685, 730, 770, 815, 855, 900, 945, 990, 1035,
  1075, 1120, 1165, 1210, 1240, 1280, 1330, 1400, 1500, 1600, 1670,
];

export const ProbeLaunch = sampler(LaunchVideo, LAUNCH_SAMPLES);
export const ProbeTour = sampler(TourVideo, TOUR_SAMPLES);
export const ProbeReel = sampler(ReelVideo, REEL_SAMPLES);

// The vertical cuts share their timelines with the wide ones, so they share the
// sample lists too: the same frame, framed differently.
export const ProbeTourVertical = sampler(TourVerticalVideo, TOUR_SAMPLES);
export const ProbeReelVertical = sampler(ReelVerticalVideo, REEL_SAMPLES);
