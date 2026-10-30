import React, { useContext } from 'react';
import { Audio, Sequence, staticFile } from 'remotion';
import { WarpCtx, SFX_MASTER } from './cinematic';

// ---------------------------------------------------------------------------
// The sound layer (v2)
// ---------------------------------------------------------------------------
//
// Every film gets its SFX from the same library in public/sfx/, copied from the
// media-use bundled set. A cue placed inside a scene is written in scene-frame
// coordinates (the same coordinate space as the click keys), and Cue converts
// them through the enclosing TimeWarp, so the same cue lands on the same visual
// beat in the launch film AND in the trailers that replay the scene at a speed
// and offset. A cue whose moment falls outside a replay window renders nothing,
// so a reel shot that enters a scene late never hears clicks that already
// happened off screen.

export const Sfx = {
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
  error: staticFile('sfx/error.mp3'),
  glitch1: staticFile('sfx/glitch-1.mp3'),
  glitch2: staticFile('sfx/glitch-2.mp3'),
  glitch3: staticFile('sfx/glitch-3.mp3'),
  keyPress: staticFile('sfx/key-press.mp3'),
  riser: staticFile('sfx/riser.mp3'),
};

/**
 * A warp-aware SFX cue.
 *
 * `at` is a scene frame: the same coordinate space the scene click keys and
 * useSceneFrame() live in. The component reads the enclosing TimeWarp and fires
 * the sound at the local frame the scene actually reaches that beat, so one cue
 * written for the launch film is correct in the tour and the reel too.
 *
 * At composition level (outside any TimeWarp) `at` is an absolute composition
 * frame, which is how the films schedule their own accents (title hits, stat
 * slams, the close).
 */
export const Cue: React.FC<{
  at: number;
  src: string;
  volume?: number;
  maxFrames?: number;
}> = ({ at, src, volume = 0.5, maxFrames = 60 }) => {
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
