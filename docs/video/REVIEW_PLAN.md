# SaCarta video v2: visual coherence review

_Plan for a vision-capable model (recommended: `opencode-go/mimo-v2.5` — cheap,
image-capable, generous limits) to audit the v2 SaCarta films for visual
breakage: displaced or clipped screens, misaligned overlays, off-target clicks,
blur/tiling artifacts, and timeline incoherence._

## Why this exists

The v2 films (`docs/video/sacarta-*-v2.mp4`) were built in Remotion by combining
real product screenshots with animated overlays, driven by a camera that pans
and zooms through page coordinates. When a screenshot, a target coordinate, a
layer swap, or a text overlay drifts out of sync, the result is a frame that
reads as broken even though it renders without error. That class of bug is
invisible to code review and to audio checks; only a model that can actually
see the frames can catch it.

The authoring model (deepseek-v4-flash) has no image input, so it cannot run
this review itself. That is why this plan exists: a cheap vision model runs it.

## Deliverable

A findings report written to `docs/video/REVIEW_v2.md`:

- One section per film.
- Per issue: frame number(s), timestamp (fps = 30), the scene/beat it belongs
  to, a one-line description, and a severity (`BLOCKER` / `MAJOR` / `MINOR`).
- A final "ships as is" note listing what was checked and passed.
- If nothing is wrong in a film, say so explicitly; do not invent issues.

## Inputs

- **Film frames** (the primary input, pre-extracted at 1 frame every 2 s,
  downscaled so a whole batch fits one model call):

  - `docs/video/review/frames/sacarta-launch-v2/f_*.jpg` (83 frames)
  - `docs/video/review/frames/sacarta-tour-16x9-v2/f_*.jpg` (30 frames)
  - `docs/video/review/frames/sacarta-reel-16x9-v2/f_*.jpg` (28 frames)
  - `docs/video/review/frames/sacarta-tour-9x16-v2/f_*.jpg` (30 frames)
  - `docs/video/review/frames/sacarta-reel-9x16-v2/f_*.jpg` (28 frames)

  Filename order = chronological order. `f_001.jpg` is t = 0 s, `f_002.jpg` is
  t = 2 s, and so on (30 fps, so frame 30 × f_index = real second).

- **Ground truth for the launch film** (what each beat should look like and
  when): `docs/video/01_LAUNCH_FILM.md`. The master timeline table maps scene
  ranges to times; the "scene by scene" section describes the intended content
  of every shot. Cross-reference frames against it.

- **Ground truth for the trailers**: `docs/video/02_TRAILER_A_TOUR.md`,
  `docs/video/03_TRAILER_B_REEL.md`.

- **The films themselves** (optional, to check motion): `docs/video/sacarta-*-v2.mp4`.

## What to look for

Review every film, frame batch by frame batch. For each batch, compare adjacent
frames too (a still can hide a jump that the sequence exposes). Checks:

1. **Screens displaced or clipped.** The browser/phone window should sit within
   the canvas; its edges should not show grey or white page ground bleeding
   past the screenshot. The page should not look scrolled off, squeezed, or
   cropped mid-layout.
2. **Misaligned overlays.** Rings around UI elements, callouts with leader
   lines, labels, pills, and typed text should sit ON the element they point
   at, not a few pixels beside it. A ring that frames the wrong cell or a
   callout line that points into empty space is a finding.
3. **Cursor/click integrity.** The pointer (black arrow, white outline) should
   rest on its target when it clicks. A click landing in empty space, or the
   ripple ring not matching the click point, is a finding.
4. **Typing integrity.** Text typed by the film (menu descriptions, the copilot
   prompt, the guest question) should sit inside the real input field, with no
   doubled text, no text over the placeholder, no caret floating outside.
5. **Layer swap glitches.** Screenshots swap in (dialog opens, page changes,
   language wipes, assistant sheet slides up). A swap that shows a leftover
   frame, a partial wipe, or two states stacked wrong is a finding.
6. **Blur / tiling artifacts.** Motion blur at cuts is intentional, but a frame
   that is uniformly blurred when it should be sharp, or shows the baked
   backdrop repeating/tiling visibly, is a finding.
7. **Kinetic text.** Headlines should land inside the frame with no words cut
   at the edge, overlapping other text, or clipped by the canvas top/bottom.
8. **Vertical films** (9x16): the portrait typography bands (top kicker /
   headline, bottom payoff) should not overlap the device band, and the device
   should not touch the very edge of the frame.

## Method

1. Read `01_LAUNCH_FILM.md` first (the launch is the master; the trailers reuse
   its scenes).
2. Go film by film, batch of ~10-15 frames per image input, in filename order.
   State for each batch which frames you are looking at and the film time.
3. Keep a running list of candidate findings; when a candidate appears, note the
   exact frame filename so the timestamp is precise.
4. After all frames, re-check each candidate against the scene ground truth:
   some things that look wrong are intended (a heavy blur at a velocity-matched
   cut, a bare reel shot with no caption, the Spanish-only import strings). The
   ground truth docs say what is intentional.
5. Write `docs/video/REVIEW_v2.md` with the findings and the "ships as is"
   conclusion.

## Rules

- **Do not edit any source code or re-render anything.** This is a review only.
- **Do not invent issues.** If a film is clean, the report says so. Frequency
  matters: one stray ring on one frame is a MINOR; a screen displaced for half
  a film is a BLOCKER.
- **Be concrete.** Every finding needs a frame number (from the filename) and a
  one-sentence description of what is wrong and where in the frame.
- **Prioritise the launch film.** It is the hero deliverable and 2:45 long. The
  trailers share its scenes, so a bug found there likely affects them too; note
  the shared scene when that happens.
- **Cost discipline.** One frame per 2 s downscaled to ~960 px wide is already
  compressed for token economy. Do not upscale, do not re-extract, do not
  re-watch full videos frame by frame unless a finding needs confirmation.

## Acceptance

The review passes when `docs/video/REVIEW_v2.md` exists, covers all five films,
every finding carries a frame number, and the report either lists concrete
issues with severities or states the film is clean.
