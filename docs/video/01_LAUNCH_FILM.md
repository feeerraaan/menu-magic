# SaCarta · Launch Film (script)

> **Status** built and rendered. This document is the as-built script: where the
> product turned out to work differently from the first draft, the script follows
> the product, and the note says why.
>
> **Deliverable** `docs/video/sacarta-launch.mp4` · 1920x1080 · 30 fps · 4950 frames · **2:45**
> **Framework** Remotion (`/video`), composition id `Launch`.
> **Language** English. No voice over: music, kinetic typography and the real product only. A judge watching muted on a phone must understand it.
> **Design** identical to the web (`src/index.css` dark tokens): Playfair Display headlines, Inter body, terracotta `#E26436`, orange `#F97316`, amber `#ECB613`, ink `#181310`. Accent words render on the web hero gradient.
> **Product truth** every page in shot is a live screenshot of the deployed app. Everything that *moves* inside a page (typing, streaming, diffs, progress, expanding rows) is rebuilt as a Remotion component that matches the app's real styles, because a screenshot cannot animate.

---

## 1. The idea

A restaurant owner hands a dead PDF menu to an AI and, **click by click**, gets it back alive: structured, written, translated, published on a QR, answering guests, and grading itself every day.

## 2. The camera law

The film is **one continuous camera move**, not fourteen slides.

1. **Vector continuity.** How a scene exits determines how the next one enters. A scene that exits pulling back is followed by a scene that enters pushing in. A scene that exits trucking right is followed by a scene that enters from the right.
2. **Clicks are the metronome.** The cursor is an oversized macOS pointer that enters from off frame, arcs to its target on a bezier, and clicks. **The click ignites the next beat**: the state change, the camera push, or the cut itself. Nothing important happens without a click causing it.
3. **Motion performs, it never idles.** No breathing loops, no floating cards. If something moves it is because a click, a camera move or an arriving element caused it.
4. **Stillness before the climax.** The frame goes still for 8 to 12 frames right before every payoff (the description landing, the diff applying, the QR locking).
5. **Seams are velocity matched.** Cuts happen mid-move: the outgoing scene is travelling at speed and the incoming scene picks up the same speed and direction, with a matched blur. Adjacent scenes overlap 15 frames.

## 3. Master timeline

| # | Scene | Frames | Time | Beat | Enter vector | Exit vector |
|---|---|---|---|---|---|---|
| 1 | Cold open: the dead menu | 0 to 270 | 0:00 to 0:09 | Hook | push in | push in, collapse to a point |
| 2 | Brand: logo and promise | 255 to 540 | 0:08 to 0:18 | Who we are | bloom from the point | pull back |
| 3 | The cost: three numbers | 525 to 810 | 0:17 to 0:27 | Why it matters | drift from left | truck right |
| 4 | Arrival: into the dashboard | 795 to 1035 | 0:26 to 0:34 | Enter the product | from the right | zoom **through** the click |
| 5 | Import: PDF in, menu out | 1020 to 1590 | 0:34 to 0:53 | Click beat 1 | already zoomed, resolve blur | zoom into a dish row |
| 6 | Write: AI writes the dish | 1575 to 2055 | 0:52 to 1:08 | Click beat 2 | from the dish row | truck left |
| 7 | Translate: three languages | 2040 to 2430 | 1:08 to 1:21 | Click beat 3 | trucking left | pull back hard |
| 8 | Publish: QR to phone | 2415 to 2835 | 1:20 to 1:34 | Click beat 4 | push in | push into the phone |
| 9 | The guest: table, phone, assistant | 2820 to 3300 | 1:34 to 1:50 | Payoff | from inside the phone | truck right |
| 10 | Copilot: talk to your menu | 3285 to 3765 | 1:49 to 2:05 | Click beat 5 | from the right | pull back and up |
| 11 | Improve: health score | 3750 to 4080 | 2:05 to 2:16 | It compounds | descend | truck right and down |
| 12 | Proof: analytics | 4065 to 4290 | 2:15 to 2:23 | Data | continue the pan | accelerate to blur |
| 13 | Under the hood: the AI layer | 4275 to 4590 | 2:22 to 2:33 | Credibility | resolve from blur | recede in Z |
| 14 | Close: logo and URL | 4575 to 4950 | 2:32 to 2:45 | CTA | bloom from the recession | slow push, fade to ink |

Music: `public/bgm.mp3` (96.5 s) looped once with a 30 frame crossfade at the seam, ducked to 0.32 under scenes 5 to 10 so the click and type ticks read, back to 0.5 for the close.

---

## 4. Scene by scene

### Scene 1 · Cold open: the dead menu (0 to 270)

Near black. One warm top light. A paper menu, built in Remotion (cream card, Playfair dish list in Spanish, hand set prices), lies tilted away from camera at `rotateX(58deg)`.

| Frames | Beat |
|---|---|
| 0 to 70 | The card drifts up into the light. Camera pushes in, scale 1.14 to 1.00, power4 out. |
| 60 to 125 | Kinetic line lands over it, Playfair 76: **"Every restaurant has a menu."** |
| 125 to 165 | The line dissolves word by word. The paper desaturates to grey. A stamp fades in at 8 degrees: `PDF · last updated 14 months ago`. |
| 165 to 230 | Second line, gradient accent: **"Almost none of them work."** |
| 230 to 270 | The paper falls away from the light (`translateY+`, `rotateX` to 80, opacity out). The camera keeps pushing. The pool of light collapses into a single point. |

No cursor, no UI. The point of light is the seam into scene 2.

### Scene 2 · Brand (255 to 540)

The point blooms into the logo glow.

- Logo springs in (`damping 14, stiffness 90`), wordmark under it.
- Pill: `✦ The AI employee for restaurants`.
- Headline, kinetic, gradient on the accent: **"One menu. Run by AI."**
- Sub: "SaCarta builds it, writes it, translates it, and keeps it selling."
- Camera: continues the push (1.06 to 1.00), then from frame 200 begins a slow pull back so the exit is already moving.
- Real asset: `public/logo.png`.

### Scene 3 · The cost (525 to 810)

- Kicker: `01 · The cost of a static menu`
- Headline, two lines: **"Your menu is costing you"** / **"more than you think."** (gradient on line 2)
- Three cards arrive as a **waterfall** (stagger 8 frames, heaviest element last), numbers counting up:

| Number | Label |
|---|---|
| `6 h` | per week on manual menu updates |
| `0` | languages on the average PDF menu |
| `0` | idea what guests actually look at |

- The two zeros land hard, with a 2 px shake on impact.
- Camera: enters drifting from the left, then a slow lateral truck right that ends with the third card centred, so the exit is already travelling right.

### Scene 4 · Arrival (795 to 1035)

The lateral truck lands on a browser window that assembles itself: chrome draws in first, then the dashboard resolves from `blur(14px)` to sharp while a light sweep crosses the glass.

- Kicker, bottom left: `02 · Meet your dashboard`
- Two label chips point into the page: `Restaurant Health 88`, `Today`.
- **Cursor entry** at frame 120 from the bottom right off frame edge, bezier arc, lands on the sidebar item **Menu Editor** at 175, hover highlight, **click at 190**.
- The click ignites the cut: the camera zooms **through** the click point (scale to 1.25, blur to 18 px, opacity out) and scene 5 picks up the same velocity.
- Real asset: `film/dashboard.png`.

### Scene 5 · Import (1020 to 1590) · 19 s

| Frames | Beat |
|---|---|
| 0 to 20 | Opens tight, zoom 1.35, centred where the click landed. Blur resolves. |
| 20 to 70 | Camera pulls back to 1.00, the whole editor page reads. Kicker `03 · Import`, overlay headline top left: **"Start from what you already have."** |
| 70 to 95 | Cursor arcs to **Import with AI**, hover, **click**. |
| 95 to 120 | The dialog scales in from 0.94, the page behind dims and blurs 6 px. Camera pushes to 1.15. |
| 120 to 175 | Cursor to the **PDF** tab, **click**. A `menu.pdf` card flies in from off frame on a bezier and lands on the file input, whose label changes from `No file chosen` to `menu.pdf`. The real dialog offers a file picker, not a drop zone, so the file lands where the product actually takes it. |
| 175 to 180 | Cursor to **Analyze with AI**, **click**. Frame goes still. |
| 180 to 300 | The import's processing screen, rebuilt because a progress bar cannot be screenshotted, but rebuilt as what the product actually renders: spinner, `Importing your menu with AI...`, the current stage line, a `Real work progress` bar with a live percentage, and the note under it. The stage strings are the product's own, in the order it writes them (`api/ai-import-step.ts`): `Preparando la importación` → `Texto preparado · 4 bloques por analizar` → `Analizando bloque 3 de 4` → `Preparando traducciones` → `Traduciendo al idioma en` → `Preparando el resultado para revisión`. They are Spanish because the product hardcodes them in Spanish; see the findings below. |
| 300 to 400 | The dialog collapses. The editor swaps to the imported state. Four category rows cascade in bottom up (stagger 6) with their item counts counting up (4, 4, 3, 3). A pill lands: `14 dishes · 4 categories · 38 seconds`. |
| 400 to 570 | Camera pushes onto the **Entrantes** row. Cursor to the chevron, **click**. The row expands with a height reveal mask so it reads as a real expand. Camera settles on the first dish, description empty. |

- Real assets: `film/editor.png`, `film/import-empty.png`, `film/import-pdf.png`, `film/editor-expanded.png`.
- Exit: zoom into the dish row.

### Scene 6 · Write (1575 to 2055) · 16 s

| Frames | Beat |
|---|---|
| 0 to 40 | Cursor to the pencil on the dish row, **click**. The item dialog scales in, background blurs. |
| 40 to 70 | Camera pushes to 1.50 on the empty Description field (`Describe the dish...`). Kicker `04 · Write`, headline right: **"Descriptions that sell, written for you."** |
| 70 to 80 | Cursor to **Generate with AI** (sparkles), **click**. Still frame. |
| 80 to 195 | The button becomes a spinner, a shimmer sweeps the field, then the description **types itself** with a caret, in the app's exact font and size: *"Pan payés tostado, tomate maduro rallado, aceite de oliva virgen extra y jamón ibérico."* 55 characters per second. |
| 195 to 240 | A check pops beside the field. On the right, three more dish rows write themselves at 3x speed, offset, so it reads as the whole menu. Pill: `14 descriptions · one pass`. |
| 240 to 480 | Camera trucks left toward the dialog's language tabs. |

- Real assets: `film/dish-empty.png`, `film/dish-filled.png`.

### Scene 7 · Translate (2040 to 2430) · 13 s

Enters trucking left, lands on the tab row `Español | English` (the two languages the demo restaurant has enabled).

- Kicker `05 · Translate`. Headline: **"Every dish. Every language."**
- Frame 30: cursor to **English**, **click**. The tab underline slides, the fields wipe ES to EN.
- Frame 60: cursor to **Translate with AI**, **click**. The English field types: *"Toasted country bread with ramallet tomato, garlic and Mallorcan extra virgin olive oil."*
- The Català beat from the first draft is cut: the demo restaurant has Spanish and English enabled, so a third tab would have had to be faked.
- Frames 252 to 390: camera pulls back hard and a wall of seven language cards flies in, one per language the product supports (`es en ca fr de it pt`, from `LANGUAGE_NAMES` in `ItemDialogWithTranslations.tsx`). Pill: `7 languages · every dish · automatic`.
- **Why seven and not eight:** the first draft claimed eight. The product supports seven, and the demo restaurant has two of them switched on, which is why the click by click part of the beat shows the real Spanish to English switch and the wall is presented as a brand graphic of the supported set rather than as a screenshot of eight live languages.
- Exit: the wall slides down, the pull back continues.

- Real assets: `film/dish-en-empty.png`, `film/dish-en-filled.png`.

### Scene 8 · Publish (2415 to 2835) · 14 s

| Frames | Beat |
|---|---|
| 0 to 40 | The pull back lands on the browser, editor small in frame. Cursor arcs to the sidebar **QR Code**, **click**. |
| 40 to 80 | Router transition: the editor slides out left, the QR page slides in from the right. Camera pushes to 1.15. Kicker `06 · Publish`, headline: **"One code on the table."** |
| 80 to 140 | The QR code **draws itself**: modules appear in a radial stagger from the centre and lock with a snap. The Download button sits below the fold on the real page, so the download beat from the first draft is cut and the scene goes straight to the signature move. |
| 200 to 330 | **The signature move.** The browser rotates `rotateY 0 to -28deg` and shrinks to the left third. A phone rises from the bottom right on a spring. The QR detaches from the browser, arcs across the frame in Z, and lands on the phone screen. The phone flips to the public menu. A table shadow and warm rim light fade in under both devices. |
| 330 to 420 | Camera pushes into the phone. |

- Real assets: `film/qr.png`, `film/menu-es.png`.

### Scene 9 · The guest (2820 to 3300) · 16 s

The phone fills frame centre, warm out of focus bokeh behind it (built from blurred radial lights, no stock footage). The pointer becomes a **touch ring** with a swipe trail for all phone beats.

| Frames | Beat |
|---|---|
| 20 to 90 | The menu scrolls on the phone: a tall full page capture translating up with momentum overshoot. Dishes, prices and a photo pass by. |
| 90 to 140 | Touch on the language switch. Each dish title wipes from Spanish to English in a per row stagger. Headline: **"In their language, instantly."** |
| 140 to 200 | Touch on the assistant launcher. The sheet slides up from the bottom. |
| 200 to 300 | A guest question types in: *"I'm coeliac, what can I eat?"*, then sends. The real answer arrives with three gluten free dishes and their prices, and the camera pushes to 1.42 so the reply is readable at real size. Pill: `Allergen aware · grounded in your menu · no invented dishes`. |
| 300 to 460 | Camera pulls back off the phone. Three more phones fan in behind it in English, German and French, scrolling slightly out of sync. Headline: **"Every table. Every language. No reprints."** |
| 460 to 480 | The fan tilts and slides right. |

- Real assets: `film/menu-full-es.png` (the scene opens on the Spanish menu so the language switch is visible), `film/menu-full.png`, `film/menu-en.png`, `film/assistant-open.png`, `film/assistant-answer.png`.

### Scene 10 · Copilot (3285 to 3765) · 16 s

| Frames | Beat |
|---|---|
| 0 to 40 | Back in the dashboard, trucking right. Cursor **clicks** the sidebar **AI Copilot**, the page slides in. Kicker `08 · Copilot`, headline: **"Stop editing. Just ask."** |
| 40 to 110 | Camera pushes to the composer. The question types in the real input: *"Increase the price of all Entrantes dishes by 10%"*, caret blinking. |
| 110 to 120 | Cursor to send, **click**. The bubble launches up into the thread on a spring, the input clears. |
| 120 to 200 | The agent works: a spinner and `The Copilot is working...`, which is what the product shows. Then the **preview** unfolds in its real shape: shield icon, the agent's own summary (`Adjust prices of 8 dish(es) in categories containing "Entrantes".`), `8 element(s) affected`, then the changes grouped one box per dish with `Price 6.5 → 7.15`, and `Confirm` / `Cancel`. Pill: `Nothing changes until you confirm.` |
| | **Cut from the first draft:** three tool call chips (`list_categories`, `list_items`, `adjust_prices`) ticking in sequence. They looked good and the product does not render them. |
| 200 to 260 | Cursor to **Confirm**, **click**. The rows collapse into one applied bubble: `Adjust prices of 8 dish(es) in categories containing "Entrantes" · Applied (8 changes)`. |
| 260 to 400 | **The proof shot.** In one continuous move the camera flies out of the copilot and left across to the menu editor, where the eight prices are already updated and each pops its new value with a small scale bounce as the camera passes over it. The loop closes on camera. |
| 400 to 480 | Camera pulls back and up. |

- Real assets: `film/copilot-empty.png`, `film/editor-expanded.png` (prices region). The thread and the preview card are Remotion components matching `src/pages/dashboard/AiCopilot.tsx` element for element.

### Scene 11 · Improve (3750 to 4080) · 11 s

- Kicker `09 · Improve`. Headline: **"It grades your menu. Every day."**
- Frames 40 to 108: the dashboard's Restaurant Health score counts 0 to **88**, the number the dashboard really shows. It is the one overlay in the scene, and it covers the real digits with the same digits.
- Frame 178: the cursor **clicks** the sidebar's **AI Optimizer**, and the page opens. This is the beat's whole structure now: a click that opens a real page.
- Frames 186 to 268: the camera lands tight on `Overall score 82` and then pulls back to reveal the eight scored dimensions the agent actually produced: Menu balance 75, Price distribution 70, Description quality 85, Photo coverage 90, Language coverage 95, Category quality 80, Menu length 85, Duplicates 100, each with its own written analysis. **Nothing is drawn over this page.** The reveal is pure camera.
- Payoff: `Eight dimensions, scored and explained`.
- Exit: the pull back continues right and down.
- Real assets: `film/dashboard-tall.png`, `film/optimizer-tall.png`.

**What this scene used to be, and why it changed.** The first draft had three AI recommendation cards cascading onto the dashboard, the cursor clicking one, it ticking green with a `+3 health` chip, and the score bumping 88 to 91. Every part of that is invented: a recommendation card in the product is a `<Link to="/dashboard/analytics">` that navigates, it does not tick or apply; the `ai_recommendations` table has no impact or score column, so `+3 health` has nothing behind it; and the demo restaurant has zero open recommendations, so the three cards were written for the film. The AI Optimizer page, which was captured and unused, has eight real scores and eight real analyses on it. Showing that is both more honest and a stronger beat.

### Scene 12 · Proof (4065 to 4290) · 7.5 s

One continuous lateral pan across the analytics page, no cuts. Kicker `10 · Proof`. Headline: **"See what guests actually look at."** As the camera passes, three numbers lift off the page: top dish, views by language, peak hour.

- Exit: the pan accelerates and blurs out to the right.
- Real asset: `film/analytics-full.png`.

### Scene 13 · Under the hood (4275 to 4590) · 10.5 s

The blur resolves into the architecture diagram on a light card on the dark stage.

- Kicker `11 · Under the hood`. Headline: **"One AI layer. Seven agents."**
- The diagram draws in: blocks fade, arrows animate along their paths (`stroke-dashoffset`), then seven agent labels arrive into place.
- Three bullets cascade: `7 agents, Zod validated at every boundary` · `21 Postgres tables, RLS on every row` · `LLM gateway with key rotation and a fallback chain`.
- Exit: the card recedes in Z.
- Real asset: `docs/architecture.png`.

### Scene 14 · Close (4575 to 4950) · 12.5 s

- Logo blooms from the recession point, one slow breathing pulse only.
- Headline, kinetic, gradient: **"One menu. Run by AI."**
- CTA pill: `sacarta.azpy.es`. Overline: `Built in Mallorca for hospitality · free tier included`.
- Slow final push in, hold 40 frames, fade to ink.

---

## 5. Copy sheet (every word on screen, in order)

```
Every restaurant has a menu.
PDF · last updated 14 months ago
Almost none of them work.

✦ The AI employee for restaurants
One menu. Run by AI.
SaCarta builds it, writes it, translates it, and keeps it selling.

01 · The cost of a static menu
Your menu is costing you more than you think.
6 h  per week on manual menu updates
0    languages on the average PDF menu
0    idea what guests actually look at

02 · Meet your dashboard
Restaurant Health 88 · Today

03 · Import
Start from what you already have.
Importing your menu with AI...
Preparando la importación · Analizando bloque 3 de 4 · Traduciendo al idioma en   (the product's own strings)
Real work progress
14 dishes · 4 categories · 38 seconds

04 · Write
Descriptions that sell, written for you.
Pan payés tostado, tomate maduro rallado, aceite de oliva virgen extra y jamón ibérico.
14 descriptions · one pass

05 · Translate
Every dish. Every language.
7 languages · every dish · automatic

06 · Publish
One code on the table.
Scan, and the menu is on their phone

07 · Your guests
In their language, instantly.
Allergen aware · grounded in your menu · no invented dishes
Every table. Every language.
No reprints.

08 · Copilot
Stop editing. Just ask.
The Copilot is working...
Adjust prices of 8 dish(es) in categories containing "Entrantes".
8 element(s) affected
Nothing changes until you confirm.

09 · Improve
It grades your menu. Every day.
Overall score 82
Eight dimensions, scored and explained

10 · Proof
See what guests actually look at.

11 · Under the hood
One AI layer. Seven agents.
7 agents, Zod validated at every boundary
21 Postgres tables, RLS on every row
LLM gateway with key rotation and a fallback chain

One menu. Run by AI.
sacarta.azpy.es
Built in Mallorca for hospitality · free tier included
```

## 6. Product findings from making the film

Two things surfaced while shooting against production. Neither is fixed here, because this task was the video, but both are worth a ticket:

1. **The AI Import progress strings are hardcoded Spanish** (`api/ai-import-step.ts`: `Preparando la importación`, `Analizando bloque N de M`, `Traduciendo al idioma X`) while everything around them goes through i18n. An English speaking owner watches the one screen that reports real work in a language they did not pick. The film shows them as they are.
2. **A dashboard recommendation card cannot be acted on where it is shown.** It is a link to Analytics, so the loop "here is what to fix" to "fixed" always costs a page change. `ai_recommendations.status` already has an `actioned` value, so the data model is ready for an inline action that the UI does not offer.

## 7. Build notes

- New shared primitives in `video/src/cinematic.tsx`: `CameraRig` (keyframed pan and zoom in screenshot space, mirrored power4 easing), `AppShot` (a screenshot inside a browser or phone frame, addressable in its own pixel coordinates), `Cursor` (oversized macOS pointer, off frame entry, bezier travel, click ripple and impact nudge), `TouchRing`, `StateSwap` (crossfade, wipe or height reveal between two captures at the same camera position), `TypeOn` (character by character with caret), `CountUp`, `Waterfall`.
- Existing primitives stay: `Scene`, `KineticText`, `GradientText`, `PillBadge`, `Kicker`, `Headline`, `GridLines`, `Glow`, `Grain`, `FadeIn`.
- Screenshots move from data URIs to `staticFile()` under `video/public/film/`, converted to JPEG by `video/scripts/prepare-film-assets.mjs`, which also generates `src/shots.ts` with each capture's CSS coordinate space.
- Click targets are not eyeballed. `scripts/capture-film-targets.mjs` dumps the bounding box of every element the film clicks, pans to or rings into `video/src/targets.json`, so the choreography reads as `T('editor.importWithAi')` and a re-captured screenshot updates it automatically.
- The camera clamps itself inside the page, so a keyframe can say "look at this element" without also solving for how much page is left around it.
- **Render cost.** The first pass ran at 0.87 s per frame at 1080p, which is 72 minutes for the film. Almost all of it was five full frame CSS paints per frame: two radial glows, a grid, an SVG `feTurbulence` grain tile composited with `mix-blend-mode`, and a vignette gradient. None of them animate, so `video/scripts/bake-backdrops.mjs` bakes them to PNGs and the scenes blit one image instead. That plus dropping `backdrop-filter` took it to about 0.25 s per frame, so roughly 20 minutes.
- Render: `scripts/render-film.sh` renders in resumable 450 frame chunks (a killed run costs one chunk, not the film), concatenates with ffmpeg, and muxes a single full length audio pass. `scripts/render-all.sh` runs every deliverable in series and copies them into `docs/video/`.
- `video/src/Probe.tsx` is a development composition that samples a film: probe frame *i* renders film frame `SAMPLES[i]`, so one render pass produces a contact sheet of the whole video. On a box where a full preview costs half an hour and `remotion still` pays the webpack bundle again for every single frame, this is the only affordable way to review.
