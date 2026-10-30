# SaCarta video

Five deliverables, one Remotion project, one set of scenes.

The **v3** renders are the current deliverables. Earlier renders are kept for
reference where present. The launch film and 16:9 tour also have unversioned
earlier copies, so use the v3 files listed here for the latest cuts.

| File | Format | Length | What it is |
|---|---|---|---|
| `sacarta-launch-v3.mp4` | 1920x1080 | 2:45 | The launch film. Fourteen scenes, click by click through the whole product. |
| `sacarta-tour-16x9-v3.mp4` | 1920x1080 | 1:00 | Trailer A, the tour. Five clicks, five payoffs. |
| `sacarta-tour-9x16-v3.mp4` | 1080x1920 | 1:00 | The tour, portrait. |
| `sacarta-reel-16x9-v3.mp4` | 1920x1080 | 0:56 | Trailer B, the reel. Thirty shots, one word each. |
| `sacarta-reel-9x16-v3.mp4` | 1080x1920 | 0:56 | The reel, portrait. |

Scripts: [`01_LAUNCH_FILM.md`](01_LAUNCH_FILM.md) · [`02_TRAILER_A_TOUR.md`](02_TRAILER_A_TOUR.md) · [`03_TRAILER_B_REEL.md`](03_TRAILER_B_REEL.md)

## How it is built

Source in [`/video`](../../video). Everything a viewer sees is either a live screenshot
of the deployed app or a Remotion component matching the app's real styles, because a
screenshot cannot animate a click.

```
scripts/capture-film-shots.mjs     Playwright: captures interaction STATES (dialog open,
                                   category expanded, field filled, language switched,
                                   phone viewport, tall pages for camera pans)
scripts/capture-film-targets.mjs   Dumps the bounding box of every element the film
                                   clicks or rings into video/src/targets.json
video/scripts/prepare-film-assets  PNG captures -> JPEG + src/shots.ts
video/scripts/bake-backdrops.mjs   Bakes the static stage layers to PNGs
video/scripts/render-film.sh       Chunked, resumable render of one composition
video/scripts/render-all.sh        Renders every deliverable and copies it here
video/scripts/render-v2.sh         v2 render: reuses v1 video chunks, re-renders
                                   the soundtrack (SFX + louder music), normalizes
```

## Sound layer

The current cuts include a soundtrack with SFX and a loudness-normalized music bed.

- **SFX live in `video/public/sfx/`** (the 21-cue bundled library: click,
  whoosh, pop, chime, typing, impact, notification, riser, ...).
- **`src/sfx.tsx`** exports the cue registry and `Cue`, a **warp-aware**
  trigger: a cue written in scene-frame coordinates converts through the
  enclosing `TimeWarp`, so one cue placed in a launch scene lands on the same
  visual beat in the tour and the reel too. A cue whose moment falls outside a
  replay window renders nothing, so recut shots never hear off screen clicks.
- **Sounds fire from the primitives, not per film**: the `Cursor` clicks, the
  `TouchRing` taps, the `Cut` enter whoosh, `TypeOn` typing, `CountUp` landings,
  and every `Payoff` chime. Scene accents (brand sparkle, the PDF stamp, the QR
  lock, the assistant answer, the seven-language wall, the close) sit in the
  scenes where their beat is authored.
- **Music**: `bgm.mp3` was normalized from -44.8 to -20 LUFS so the bed has
  body under the SFX, and the mux runs `loudnorm I=-16` on the current cuts.


The camera is written in the page's own coordinates. `T('editor.importWithAi')` is the
real button, measured in the browser, so the cursor lands on it and the camera frames it
without a single hand-tuned pixel offset. Re-capture the screenshots and the choreography
follows.

The four short videos are not separate implementations. Each of their shots replays a
launch scene from a chosen frame at a chosen speed through a `TimeWarp` clock, so fixing
a scene fixes it in all five videos.

## Rebuilding

```bash
# 1. Capture (needs the Supabase service role key and a demo account)
set -a; . /root/.secrets/menu-magic.env; set +a
node scripts/capture-film-shots.mjs
node scripts/capture-film-targets.mjs

# 2. Prepare assets
cd video
node scripts/prepare-film-assets.mjs
node scripts/bake-backdrops.mjs

# 3. Review cheaply: one pass gives a contact sheet of a whole film
npx remotion render ProbeLaunch out/probe.mp4 --scale=0.62
ffmpeg -i out/probe.mp4 out/probe/%03d.png

# 4. Render everything (about two hours on a 2 core box, resumable)
setsid nohup scripts/render-all.sh > out/render-all.log 2>&1 &
```

## Notes on cost

This box has two cores and no GPU, so Remotion renders through software GL at roughly
0.25 s per 1080p frame. Two things got it there from 0.87 s:

- The dark stage was five full frame CSS paints per frame (two radial glows, a grid, an
  SVG `feTurbulence` grain tile composited with `mix-blend-mode`, a vignette gradient).
  None of them animate, so they are baked to PNGs and blitted.
- `backdrop-filter` was removed from the overlay chrome.

Renders go out in resumable 450 frame chunks, so an interrupted run costs one chunk.
