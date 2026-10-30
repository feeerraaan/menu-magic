# Superseded

> This was the first draft: a 2:30 launch film of twelve static scenes, each a
> screenshot with a Ken Burns pan. It has been replaced by a click driven film
> and two trailers. See `01_LAUNCH_FILM.md`, `02_TRAILER_A_TOUR.md` and
> `03_TRAILER_B_REEL.md`. Kept only as a record of what changed and why.

---

# SaCarta Hackathon Video Script (Launch, 2:30)

> Cinematic launch film for the hackathon submission. English, no voice-over: music + kinetic typography + real product UI only. A judge watching muted on a phone must understand it.
> Framework: Remotion (`/video`), 1920x1080 @ 30 fps, 4500 frames (150 s).
> Design: identical to the web (`src/index.css` dark tokens): Playfair Display headlines, Inter body, terracotta `#E26436` primary, orange `#F97316`, amber `#ECB613` accent, ink `#181310` background. Accent words render on the web hero gradient (primary to orange to amber).
> Real product: every UI shot is a live screenshot from `docs/screenshots` (captured by `scripts/take-screenshots.mjs`), embedded via `video/scripts/embed-assets.mjs`.

## Master timeline (0 to 150 s)

| # | Scene | In to Out | Frames | Intent |
|---|---|---|---|---|
| 1 | Hero | 0:00 to 0:08 | 0 to 240 | Brand + one-line promise |
| 2 | Problem | 0:08 to 0:20 | 225 to 600 | The cost of a static menu |
| 3 | Import | 0:20 to 0:34 | 585 to 1020 | Upload a PDF, AI builds the menu |
| 4 | Describe | 0:34 to 0:46 | 1005 to 1380 | AI writes descriptions that sell |
| 5 | Translate | 0:46 to 0:58 | 1365 to 1740 | Every dish in every language |
| 6 | Publish | 0:58 to 1:10 | 1725 to 2100 | QR at the table, menu on the phone |
| 7 | Assistant | 1:10 to 1:22 | 2085 to 2460 | Guests ask, the assistant answers |
| 8 | Copilot | 1:22 to 1:36 | 2445 to 2880 | Owner asks, the menu changes |
| 9 | Optimize | 1:36 to 1:48 | 2865 to 3240 | Health score + recommendations |
| 10 | Analytics | 1:48 to 1:58 | 3225 to 3570 | See what guests look at |
| 11 | Architecture | 1:58 to 2:12 | 3555 to 3990 | Technical credibility for judges |
| 12 | Outro | 2:12 to 2:30 | 3975 to 4500 | Logo, URL, close |

Adjacent scenes overlap by 15 frames: the outgoing scene zooms through while the incoming one settles, so the film reads as one continuous camera move.

## Scene list (copy, camera, transition, real component)

### 1 Hero (0 to 240)
- Copy: pill "The AI employee for restaurants"; headline "The AI operating system for restaurant menus" (gradient on the accent); overline "SaCarta".
- Camera: logo springs in with a slow breathing pulse; whole scene pushes in (scale 1.08 to 1, expo out).
- Transition out: zoom-through (scale to 1.1, fade).
- Real component: `public/logo.png` (the web logo).

### 2 Problem (225 to 600)
- Copy: kicker "01 to The problem"; headline "Your menu costs / more than you think." (gradient on line 2); stat cards: "6+ h per week lost to manual updates", "0 translations on a typical menu", "0 visibility into what guests look at".
- Camera: enters drifting from the left; stat cards fade-rise staggered.
- Real component: none (typography), grid backdrop from the landing hero.

### 3 Import (585 to 1020)
- Copy: kicker "02 to Import"; headline "Upload a PDF. AI builds your menu." (gradient from "AI"); floating card "menu.pdf, 2.1 MB, ready"; chips Starters / Mains / Desserts / Drinks.
- Camera: enters drifting from the right; browser frame Ken Burns pan 50,42 to 62,48 with a 1.06 zoom.
- Real component: `screenshots/ai-import.png` (the real AI Import dialog).

### 4 Describe (1005 to 1380)
- Copy: kicker "03 to Build"; headline "Descriptions that sell, / written by AI." (gradient on line 2); sub "Categories, prices, allergens and photos, structured in one pass."
- Camera: enters drifting up; browser frame Ken Burns pan 40,30 to 55,45.
- Real component: `screenshots/menu-editor.png` (the real menu editor).

### 5 Translate (1365 to 1740)
- Copy: kicker "04 to Translation"; headline "Every dish, in every language." (gradient from "every language"); three language cards cycling Espanol / English / Catala with the lobster rice dish.
- Camera: enters drifting down; cards slide-lift crossfade every 55 frames.
- Real component: none (typography), dish data matches the demo menu.

### 6 Publish (1725 to 2100)
- Copy: kicker "05 to Publish"; headline "Scan at the table. / Ready in seconds." (gradient on line 2); sub "Guests open the menu on their phone and switch language in a tap."
- Camera: enters drifting from the left; phone rises, QR card pops with a spring.
- Real component: `screenshots/public-menu.png` (phone) + `screenshots/qr.png`.

### 7 Assistant (2085 to 2460)
- Copy: kicker "06 to Guests"; headline "Guests ask. / The assistant answers." (gradient on line 2); pill "Allergen-safe recommendations".
- Camera: enters drifting from the right; browser frame Ken Burns pan 50,35 to 58,50.
- Real component: `screenshots/customer-assistant.png` (the public assistant widget).

### 8 Copilot (2445 to 2880)
- Copy: kicker "07 to Copilot"; headline "Ask. It changes your menu." (gradient from "changes"); pill "Preview, confirm, and it updates your menu".
- Camera: enters drifting up; browser frame Ken Burns pan 50,40 to 58,46.
- Real component: `screenshots/ai-copilot.png` (a real executed copilot exchange).

### 9 Optimize (2865 to 3240)
- Copy: kicker "08 to Optimize"; headline "A health score, / recommendations daily." (gradient on line 2); ring counts 0 to 87; list "Add dish descriptions / Translate to English / Add real photos".
- Camera: enters with a pull-back (scale 0.93 to 1) for contrast; dashboard browser Ken Burns pan 50,38 to 44,46.
- Real component: `screenshots/dashboard.png` (the real Overview with the health card).

### 10 Analytics (3225 to 3570)
- Copy: kicker "09 to Insights"; headline "See what guests / look at." (gradient on line 2); sub "Top dishes, languages and views, updated live."
- Camera: enters drifting from the left; browser frame Ken Burns pan 45,30 to 55,45.
- Real component: `screenshots/analytics.png`.

### 11 Architecture (3555 to 3990)
- Copy: kicker "10 to Under the hood"; headline "One shared AI layer." (gradient on "AI layer"); bullets: "7 agents with Zod-validated boundaries", "21 Postgres tables, RLS everywhere", "LLM gateway with key rotation and fallback".
- Camera: enters drifting from the right; the architecture diagram (light card) fades in with a soft scale.
- Real component: `docs/architecture.png` (the real topology diagram).

### 12 Outro (3975 to 4500)
- Copy: logo; headline "The AI operating system for restaurant menus." (gradient from "AI"); CTA pill "sacarta.azpy.es"; overline "Built in Mallorca for hospitality, free tier included".
- Camera: logo springs with breathing pulse; scene holds, slow push-in to the end.
- Real component: `public/logo.png`.

## Remotion composition notes

- One `<Composition id="Launch">` master timeline; each scene is a `<Sequence>` wrapping a `<Scene>` (zoom-through enter/exit + directional drift for continuity).
- Shared primitives in `video/src/components.tsx`: `Scene`, `KineticText` (word-by-word, gradient accent), `GradientText`, `PillBadge`, `GridLines`, `Glow`, `Grain`, `BrowserFrame` (Ken Burns), `PhoneFrame`, `Headline`, `Kicker`.
- Fonts embedded as data URIs (`video/src/fonts.ts`): Playfair Display 400 to 700 and Inter 300 to 700, latin variable subsets, so renders are offline-deterministic.
- Trailer cuts reuse the same scenes in `video/src/trailerScenes.tsx` with `ratio` variants: `Trailer` (16:9), `TrailerVertical` (9:16), `TrailerSquare` (1:1), all 18 s, hook in the first 2 s, logo + URL close.
- Render memory: 3.8 GB box, so `remotion.config.ts` pins software GL (`swangle`) and concurrency 1, and long renders go out in chunks concatenated with ffmpeg (`scripts/render-chunks.sh`).
