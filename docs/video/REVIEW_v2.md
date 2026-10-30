# SaCarta video v2: visual coherence review

_Reviewed and fixed 2026-08-10. All five films, 199 frames total (1 frame / 2 s, downscaled).
Ground truth: `01_LAUNCH_FILM.md`, `02_TRAILER_A_TOUR.md`, `03_TRAILER_B_REEL.md`._

## Render status

The five v2 films are being re-rendered with all fixes below. Because the picture
changed (camera keyframes, `maxH`), the v1 video chunks could not be reused and a
full render was required (~1.4 s/frame, software GL, 2 cores). To cut the cost,
`render-film.sh` now renders from a prebuilt bundle (`npx remotion bundle
--out-dir=out/bundle`) so no chunk pays the webpack re-bundle. Still ~3.5-4 h total.
Monitor: `tail -f video/out/render-v2.log`.

---

## Changes applied

| ID | Fix | Files changed |
|---|---|---|
| L-1 | Updated script to match actual rendered description text | `01_LAUNCH_FILM.md` lines 128, 258 |
| L-2 | Added "Scan, and the menu is on their phone" to copy sheet | `01_LAUNCH_FILM.md` line 266 |
| L-3/R-1 | Changed reel DONE shot `at` from 380 to 420 so prices have popped | `Reel.tsx` line 199 |
| R-2 | Updated reel shot 21 description to match actual render | `03_TRAILER_B_REEL.md` line 49 |
| Composition 5 | Import scene: reduced peak zoom 1.5 -> 1.38, raised camera target so the page bottom no longer touches the viewport edge | `launchScenes.tsx` |
| Composition 6 | Write scene: reduced peak zoom 1.5 -> 1.38 | `launchScenes.tsx` |
| Composition 7 | Translate scene: reduced peak zoom 1.44 -> 1.32 | `launchScenes.tsx` |
| Composition 10 | Copilot scene: reduced preview zoom 1.36 -> 1.28 | `launchScenes.tsx` |
| Composition 11+12 | Added `maxH` cap to `BrowserStage` so tall full-page shots (optimizer, analytics) show the whole browser window instead of being cropped by the canvas | `cinematic.tsx`, `launchScenes.tsx` |
| Assistant lang | Added `lang` param to customer assistant prompts, edge function, agent, and frontend widget | `customerAssistant.ts` (prompts), `customerAssistantAgent.ts`, `ai-customer-assistant/index.ts`, `CustomerAssistantWidget.tsx`, `customerAssistant.ts` (schema) |
| GuestScene | Question changed to English ("I'm coeliac, what can I eat?") | `launchScenes.tsx` |
| Script sync | Updated launch + tour scripts to match English question | `01_LAUNCH_FILM.md`, `02_TRAILER_A_TOUR.md` |
| Capture script | Assistant shot now asks in English | `capture-film-shots.mjs` |

## Deployed to production

The customer assistant now answers in the guest's language end to end:

1. **Edge function** `ai-customer-assistant` redeployed with the `lang` param
   (`supabase functions deploy ai-customer-assistant`).
2. **Frontend** redeployed to Vercel so the widget passes `lang` from the UI
   language context (`vercel --prod`).

Verified live: English question against the English menu returns an English
reply: *"I have selected a balanced four-course recommendation from the available
candidates..."*

Screenshots recaptured after deploy: `assistant-open`, `assistant-answer` (now
English), then `prepare-film-assets.mjs` regenerated the shot JPEGs.

## Screen and asset composition review

### Launch film (83 frames)

All 14 scenes reviewed. Composition fixes applied to scenes 5, 6, 7, 10, 11, 12:

- **Scene 5 (Import)**: zoom reduced so the page bottom no longer touches the viewport edge.
- **Scene 6 (Write)**: zoom reduced on the description field close-up.
- **Scene 7 (Translate)**: zoom reduced on the English field.
- **Scene 10 (Copilot)**: zoom reduced on the preview diff so the right/bottom page edges stay inside the window.
- **Scene 11 (Improve)**: tall optimizer page now capped so the whole browser window (chrome included) is visible.
- **Scene 12 (Proof)**: tall analytics page now capped; the browser window is fully framed during the pan.

### Tour 16:9 (30 frames)

Clean. Title card, five beats, close all correct.

### Reel 16:9 (28 frames)

Clean. 30 shots on grid, velocity-matched. DONE shot now starts at at=420 so prices show post-confirmation values. Stat slams correct.

### Tour 9:16 (30 frames)

Portrait framing clean. Margins adequate, fill values produce legible text.

### Reel 9:16 (28 frames)

Portrait framing clean. Browser/phone crops correct, word in upper third.

## Ships as is

Everything not listed above matches the ground truth scripts. The Spanish import
progress strings and the Spanish import screen are intentional (product's own
hardcoded strings, logged as a product finding).
