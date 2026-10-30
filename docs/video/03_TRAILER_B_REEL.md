# SaCarta · Trailer B "The Reel" (script)

> **Status** built and rendered.
>
> **Deliverable** `docs/video/sacarta-reel-16x9.mp4` (1920x1080) and `docs/video/sacarta-reel-9x16.mp4` (1080x1920) · 30 fps · 1684 frames · **0:56**
> **Framework** Remotion (`/video`), composition ids `Reel` and `ReelVertical`, in `src/Reel.tsx` and `src/Vertical.tsx`.
> The length is derived from the shot list rather than declared, so editing a shot cannot leave dead frames hanging off the end. Thirty shots at 45 to 60 frames with a 4 frame overlap come to 1684, which is why this is 0:56 and not the 1:00 of the first draft: padding it would have meant holding a shot past its motion, and the whole point of the cut is that nothing is held.
> **Language** English. No voice over. Must be fully understandable **muted**, because it will autoplay silent in a feed.
> **Purpose** feed native highlight reel for LinkedIn, X and Instagram. Maximum visual impact per second. Hook inside the first second.

---

## 1. The idea

The tour explains. **The reel hits.** Thirty shots on a strict grid, one word of copy per shot, every shot the single most kinetic moment of its scene with the setup and the dwell cut off. Nobody learns how SaCarta works from this video: they learn that it is fast, real and beautiful, and they click the link.

## 2. The rules

1. **Grid, not scenes.** Every shot is 45 or 60 frames (1.5 s or 2 s). Nothing is longer than 75 frames. Cuts land on the music grid.
2. **One word per shot.** Each shot carries one verb or one number, set in Playfair, entering with a word by word stagger. The word is the caption; there is no sentence to read.
3. **Cut on motion, never on rest.** Each shot is cut while its element is still travelling, and the next shot enters carrying the same direction and speed. The reel is a chain of velocity matched seams, so it stays one current despite thirty cuts.
4. **No scene is reinvented.** Every shot is a window lifted out of the launch film's timeline through the same `TimeWarp` mechanism the tour uses: `{ dur: 60, Comp: WriteScene, at: 120, speed: 1.4 }` replays the write scene from frame 120 at 1.4x. Scenes come in through `Bare`, so their own headlines are suppressed and the reel's single word is the only text.
5. **Hook in frame 0.** No logo first, no fade in. The first frame is already on the strongest image in the film.

## 3. Shot list

| # | Frames | Time | Shot | Word on screen |
|---|---|---|---|---|
| 1 | 0 to 45 | 0:00 | The paper menu falls out of the light, hard out on the last frame | `Your menu is dead.` |
| 2 | 45 to 105 | 0:01 | Logo hit, gradient bloom | `One menu. Run by AI.` |
| 3 | 105 to 150 | 0:03 | `menu.pdf` flies onto the file input | `UPLOAD` |
| 4 | 150 to 195 | 0:05 | Parse stages tick at 3x | `READ` |
| 5 | 195 to 240 | 0:06 | Four category rows cascade in, counts counting | `STRUCTURE` |
| 6 | 240 to 300 | 0:08 | The description types itself, tight on the field | `WRITE` |
| 7 | 300 to 345 | 0:10 | The English tab flips and the field retypes | `TRANSLATE` |
| 8 | 345 to 390 | 0:11 | The seven language wall assembles | `7 LANGUAGES` |
| 9 | 390 to 450 | 0:13 | The QR draws itself and locks | `PUBLISH` |
| 10 | 450 to 495 | 0:15 | The QR arcs across frame and lands on the phone | `SCAN` |
| 11 | 495 to 555 | 0:16 | The menu scrolls on the phone with momentum | `READ` |
| 12 | 555 to 600 | 0:18 | Dish titles wipe Spanish to English row by row | `SWITCH` |
| 13 | 600 to 660 | 0:20 | The assistant sheet slides up, answer streams, two dishes ring | `ASK` |
| 14 | 660 to 705 | 0:22 | Title card, full frame | `AND WHEN THE MENU CHANGES` |
| 15 | 705 to 765 | 0:23 | The copilot question types in | `TALK` |
| 16 | 765 to 810 | 0:25 | Three tool chips tick | `IT WORKS` |
| 17 | 810 to 870 | 0:27 | The eight row diff unfolds | `PREVIEW` |
| 18 | 870 to 915 | 0:29 | Confirm clicked, rows collapse into the applied bubble | `CONFIRM` |
| 19 | 915 to 975 | 0:30 | The proof fly across the editor, prices popping | `DONE` |
| 20 | 975 to 1020 | 0:32 | The health ring runs 0 to 88 | `GRADE` |
| 21 | 1020 to 1065 | 0:34 | The health ring runs 0 to 88, then the optimizer page reveals eight scored dimensions | `IMPROVE` |
| 22 | 1065 to 1125 | 0:35 | Lateral pan across analytics, numbers lifting off | `MEASURE` |
| 23 | 1125 to 1185 | 0:37 | Three phones fanning, out of sync scroll | `EVERY TABLE` |
| 24 | 1185 to 1245 | 0:39 | The architecture diagram draws its arrows | `SEVEN AGENTS` |
| 25 | 1245 to 1305 | 0:41 | Title card | `NO REPRINTS` |
| 26 | 1305 to 1350 | 0:43 | Stat slam 1 | `38 s to import a menu` |
| 27 | 1350 to 1395 | 0:45 | Stat slam 2 | `7 languages, automatic` |
| 28 | 1395 to 1440 | 0:46 | Stat slam 3 | `0 reprints, ever` |
| 29 | 1440 to 1560 | 0:48 | Rapid 6 frame flicker montage of shots 3, 6, 9, 13, 17, 21 | none |
| 30 | 1429 to 1684 | 0:47 to 0:56 | Close: logo, headline, URL, hold, fade to ink | `One menu. Run by AI.` / `sacarta.azpy.es` / `free tier included` |

Frames 1 to 29 above are the design intent; the built timeline packs them with a 4 frame overlap, which is why the close starts at 1429 rather than 1560.

The stat slams (26 to 28) are hard cuts on black with the number in Playfair at 200 px, gradient, entering with a 3 frame scale punch and no exit animation: the cut takes them off screen mid punch.

Shot 29 is the only place the reel breaks its own grid: six shots at 20 frames each, each one a single frame held then blurred out, as a compression of everything already shown. It is built by playing six scenes at `speed: 0`, which freezes each on one frame without needing a still image of it.

Each word sits on a soft scrim: half of these shots land on a light product page, where cream type with only a drop shadow reads muddy.

Music: `public/bgm.mp3` from 0:28 (its densest section), volume 0.55, with a 12 frame silence right before shot 26 so the stat slams hit into a gap.

---

## 4. Vertical 9:16 (1080x1920)

Same shot list, same cut points, same music. The layout comes from one table (`REEL_V` in `src/Vertical.tsx`), indexed against the shot list, using the same `Bare` plus `PortraitStage` mechanism as the tour:

- Browser shots crop into the window at `fill` 0.42 to 0.6, chosen per shot so the acting element fills the width: the description field, the diff rows, the health ring.
- Phone shots run at `fill: 0.42` on the dining room backdrop, which puts the phone at nearly the full frame height.
- The word moves to the **upper third** at 104 px, dropping to 76 px for the longer ones, since it is the only text on screen.
- The two breath cards, the three stat slams and the flicker montage need no framing entry at all: they are centred flex layouts and compose natively in any canvas.
- Backdrops are per shot, so the warm lighting of the publish beats and the dining room of the guest beats survive into portrait.

## 5. Copy sheet

```
Your menu is dead.
One menu. Run by AI.
UPLOAD
READ
STRUCTURE
WRITE
TRANSLATE
7 LANGUAGES
PUBLISH
SCAN
READ
SWITCH
ASK
AND WHEN THE MENU CHANGES
TALK
IT WORKS
PREVIEW
CONFIRM
DONE
GRADE
IMPROVE
MEASURE
EVERY TABLE
SEVEN AGENTS
NO REPRINTS
38 s to import a menu
7 languages, automatic
0 reprints, ever
One menu. Run by AI.
sacarta.azpy.es
free tier included
```
