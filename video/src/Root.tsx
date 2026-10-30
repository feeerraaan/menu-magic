import React from 'react';
import { Composition } from 'remotion';
import { LaunchVideo, LAUNCH_DURATION } from './Launch';
import { TourVideo, TOUR_DURATION } from './Tour';
import { ReelVideo, REEL_DURATION } from './Reel';
import { TourVerticalVideo, ReelVerticalVideo } from './Vertical';
import {
  ProbeLaunch,
  ProbeTour,
  ProbeReel,
  ProbeTourVertical,
  ProbeReelVertical,
  LAUNCH_SAMPLES,
  TOUR_SAMPLES,
  REEL_SAMPLES,
} from './Probe';

export const RemotionRoot: React.FC = () => (
  <>
    {/* Development contact sheets, see src/Probe.tsx. Not deliverables. */}
    <Composition id="ProbeLaunch" component={ProbeLaunch} durationInFrames={LAUNCH_SAMPLES.length} fps={30} width={1920} height={1080} />
    <Composition id="ProbeTour" component={ProbeTour} durationInFrames={TOUR_SAMPLES.length} fps={30} width={1920} height={1080} />
    <Composition id="ProbeReel" component={ProbeReel} durationInFrames={REEL_SAMPLES.length} fps={30} width={1920} height={1080} />
    <Composition
      id="Launch"
      component={LaunchVideo}
      durationInFrames={LAUNCH_DURATION}
      fps={30}
      width={1920}
      height={1080}
    />
    {/* Trailer A: the product tour, a recut of the launch beats. */}
    <Composition id="Tour" component={TourVideo} durationInFrames={TOUR_DURATION} fps={30} width={1920} height={1080} />
    {/* Trailer B: the feed reel, thirty shots on a grid. */}
    <Composition id="Reel" component={ReelVideo} durationInFrames={REEL_DURATION} fps={30} width={1920} height={1080} />
    {/* The 9:16 cuts. Same shots and cut points, portrait native layout. */}
    <Composition id="ProbeTourV" component={ProbeTourVertical} durationInFrames={TOUR_SAMPLES.length} fps={30} width={1080} height={1920} />
    <Composition id="ProbeReelV" component={ProbeReelVertical} durationInFrames={REEL_SAMPLES.length} fps={30} width={1080} height={1920} />
    <Composition
      id="TourVertical"
      component={TourVerticalVideo}
      durationInFrames={TOUR_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
    <Composition
      id="ReelVertical"
      component={ReelVerticalVideo}
      durationInFrames={REEL_DURATION}
      fps={30}
      width={1080}
      height={1920}
    />
  </>
);
