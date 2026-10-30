# SaCarta · Trailer A "The Tour" (script)

> **Status** built and rendered.
>
> **Deliverable** `docs/video/sacarta-tour-16x9.mp4` (1920x1080) and `docs/video/sacarta-tour-9x16.mp4` (1080x1920) · 30 fps · 1800 frames · **1:00**
> **Framework** Remotion (`/video`), composition ids `Tour` and `TourVertical`, in `src/Tour.tsx` and `src/Vertical.tsx`.
> **Language** English. No voice over.
> **Purpose** the product tour. Five clicks, five payoffs. For the landing page, the Devpost page and the README. This is the video someone watches when they already know what SaCarta is and want to see it work.

---

## 1. The idea

Sixty seconds, **five clicks**, and the menu is done. No problem setup, no story, no emotion: pure product. Every beat is `cursor arrives → click → the product does something real`.

The tour reuses the launch film's scenes **as code, not as copies**. Each beat replays a launch scene from a chosen frame at a chosen speed:

```
{ from: 112, dur: 340, at: 150, speed: 1.3, Comp: ImportScene }
```

`at` is the frame of the source scene the beat opens on, `speed` how fast it runs. A `TimeWarp` context feeds the scene a remapped clock, and every scene and primitive reads its frame through `useSceneFrame()` rather than `useCurrentFrame()`. With no warp in scope the two are identical, so the launch film is untouched. The consequence that matters: **fixing a scene fixes it in all five videos**, and the tour enters each scene on the cursor's approach instead of on the headline, at 1.12x to 1.3x depending on the beat.

## 2. Master timeline

| # | Beat | Frames | Time | Click | Payoff |
|---|---|---|---|---|---|
| 0 | Title card | 0 to 120 | 0:00 to 0:04 | none | the promise |
| 1 | Import | 112 to 452 | 0:03 to 0:15 | Import with AI, PDF tab, Analyze with AI | 14 dishes structured |
| 2 | Write | 438 to 664 | 0:14 to 0:22 | Generate with AI | the description types itself |
| 3 | Translate | 650 to 846 | 0:21 to 0:28 | English tab, Translate with AI | seven language wall |
| 4 | Publish | 832 to 1082 | 0:27 to 0:36 | QR Code | code lands on a phone |
| 5 | The guest | 1068 to 1332 | 0:35 to 0:44 | language switch, assistant | the assistant answers |
| 6 | Copilot | 1318 to 1664 | 0:43 to 0:55 | send, then Confirm | eight prices update |
| 7 | Close | 1650 to 1800 | 0:55 to 1:00 | none | logo and URL |

Music: `public/bgm.mp3` from 0:12 (where it has already opened up) so the trailer starts with momentum instead of a build. Volume 0.42, ducked to 0.3 under beats 1 to 5.

---

## 3. Beat by beat

### Beat 0 · Title card (0 to 120)

- Logo, small, top centre. Kinetic headline: **"One menu. Run by AI."**
- Under it, in Inter mono, a countdown label that is also the promise: `a 60 second tour`.
- Camera: a single slow push in. At frame 100 the card slides up and out of frame, revealing the browser already in motion underneath. No fade to black: the tour is already running.

### Beat 1 · Import (105 to 435) · 11 s

- Kicker top left: `01 · Import`. Overlay line: **"Upload the PDF you already have."**
- The browser is on the menu editor, empty. Cursor enters from the right, arcs to **Import with AI**, **click**.
- The dialog appears, cursor to the **PDF** tab, **click**, a `menu.pdf` card flies onto the file input, cursor to **Analyze with AI**, **click**.
- Parse rail fills, four stages tick fast (18 frames each instead of 30): `Reading` → `Categories` → `Dishes and prices` → `Structuring`.
- Four category rows cascade in, counts count up. Pill lands: `14 dishes · 38 seconds`.
- Exit: camera zooms into the first dish row.

### Beat 2 · Write and translate (420 to 750) · 11 s

- Kicker: `02 · Write`. The item dialog is already open, camera tight on the empty description.
- Cursor to **Generate with AI**, **click**. The description types itself, in the product's own words: *"Pan payés tostado, tomate maduro rallado, aceite de oliva virgen extra y jamón ibérico."*
- Camera trucks left to the language tabs. Kicker updates to `03 · Translate`. Overlay line: **"Every dish. Every language."**
- Cursor to **English**, **click**: the field wipes and retypes in English.
- Camera pulls back and a wall of seven language cards flies in, one per language the product supports. Pill: `7 languages · every dish · automatic`.

### Beat 3 · Publish (735 to 1065) · 11 s

- Kicker: `04 · Publish`. Overlay line: **"One code on the table."**
- Cursor to the sidebar **QR Code**, **click**. Router transition, the QR page slides in.
- The QR draws itself in a radial stagger and locks.
- The signature move, tightened to 90 frames: the browser rotates `rotateY -28deg` to the left third, a phone rises from the bottom right, the QR arcs across in Z and lands on the phone, the phone flips to the public menu, table shadow and rim light fade in.
- Exit: camera pushes into the phone.

### Beat 4 · The guest (1050 to 1380) · 11 s

- Kicker: `05 · Your guests`. Pointer becomes the touch ring.
- The menu scrolls with momentum. Touch the language switch: dish titles wipe Spanish to English in a per row stagger.
- Touch the assistant launcher, the sheet slides up. The question types in: *"I'm coeliac, what can I eat?"* (English, because the assistant answers in the guest's language). The real answer arrives with three gluten free dishes and the camera pushes in so it is readable.
- Overlay line: **"Grounded in your menu. No invented dishes."**
- Exit: camera trucks right off the phone.

### Beat 5 · Copilot (1365 to 1665) · 10 s

- Kicker: `06 · Copilot`. Overlay line: **"Stop editing. Just ask."**
- Camera lands on the copilot composer. The question types in: *"Increase the price of all Entrantes dishes by 10%"*. Cursor to send, **click**.
- Three tool chips tick fast, the diff preview unfolds with eight rows. Pill: `Nothing changes until you confirm.`
- Cursor to **Confirm**, **click**. The rows collapse into the applied bubble.
- The proof shot, tightened to 70 frames: the camera flies left to the editor and the eight prices pop their new values as it passes.

### Beat 6 · Close (1650 to 1800) · 5 s

- Logo springs in. Headline: **"One menu. Run by AI."**
- CTA pill: `sacarta.azpy.es`. Overline: `free tier included`.
- Hold 30 frames, fade to ink.

---

## 4. Vertical 9:16 (1080x1920)

Not a crop, and not a second implementation either.

A 1920x1080 frame does not contain enough height to fill a 1080x1920 one: cropping to fit would show a 607 px wide slice of the film. So the vertical plays the same scenes through two mechanisms:

- **`Bare`** suppresses each scene's own kickers, headlines and payoff pills, and its full frame stage and vignette. What is left is the device and the action.
- **`PortraitStage`** scales that into a band of the portrait frame. Its `fill` is the fraction of the scene's 1920 width that fills the 1080 canvas width, so `fill: 0.55` crops into the browser window rather than fitting it.

The frame's own top and bottom bands then carry portrait native typography: kicker at 120, headline centred at 240, payoff pill at 1720.

**Why crop into the window instead of fitting it.** At `fill: 0.8` the whole browser fits, and the page inside then renders at 0.68 canvas pixels per CSS pixel, which puts real 13 px product text under 9 px on screen: legible in 16:9, illegible in 9:16. Cropping the window's edges buys back the 1.8x the text needs.

Per beat framing lives in one table (`TOUR_V` in `src/Vertical.tsx`) indexed against the wide cut, so the wide cut owns the timing and the table owns the layout:

| Beat | fill | Note |
|---|---|---|
| Import | 0.55 | crops the window edges, parse panel readable |
| Write | 0.46 | tight on the description field |
| Translate | 0.48 | tight on the dialog |
| Publish | 0.90 | the one wide shot: it has to hold the browser and the arriving phone |
| The guest | 0.42 | the phone is nearly the whole frame |
| Copilot | 0.50 | centred on the thread |

The title card and the close have their own portrait layouts rather than scaled versions of the wide ones. Duration, cut points and music are identical to 16:9.

## 5. Copy sheet

```
One menu. Run by AI.
a 60 second tour

01 · Import
Start from the PDF you already have.
Reading · Categories · Dishes and prices · Structuring
14 dishes · 38 seconds

02 · Write
Descriptions that sell.

03 · Translate
Every dish. Every language.
7 languages, automatic

04 · Publish
One code on the table.

05 · Your guests
Grounded in your menu.
No invented dishes

06 · Copilot
Stop editing. Just ask.
Nothing changes until you confirm.

One menu. Run by AI.
sacarta.azpy.es
free tier included
```
