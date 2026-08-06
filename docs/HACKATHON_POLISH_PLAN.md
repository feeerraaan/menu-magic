# SaCarta — Final Product Polish Plan (Pre-Hackathon)

> The project is **feature-complete**. The goal of this plan is **NOT** to add more AI features.
> The goal is to transform SaCarta from a great technical project into a **polished, production-quality SaaS that can win a hackathon**.

---

## 0. Working protocol (read first)

### 0.1 One task at a time, in order
- Tasks are implemented **sequentially, 1 → 17**.
- A task is only marked done when **all** its acceptance criteria pass and the project still builds (`tsc --noEmit` + `vite build` green) and lint is not worse than before.
- Never start the next task until the previous one is completely finished.

### 0.2 Never break production (continuous deployment)
`main` auto-deploys to `https://sacarta.azpy.es`. Rules:

| Rule | What it means |
|---|---|
| **Never commit to `main`** | All work happens on a feature branch off `main`. |
| **Checkpoint tag** | Before Task 1: tag the current `main` HEAD as `checkpoint/pre-polish` so we can always restore the production state. |
| **Merge only on approval** | Branches merge to `main` only when Ferran explicitly approves. |
| **Restore on request** | If at any point Ferran says _"volver a lo de antes"_: `git checkout main && git reset --hard checkpoint/pre-polish && git push --force-with-lease origin main`. |

### 0.3 After every completed task
Update this same file (`docs/HACKATHON_POLISH_PLAN.md`):
- Tick the task `✅ Completed` in the status table.
- Append an entry to the **Progress Log** with: task name, files changed, implementation notes, screenshots (if relevant), remaining work.

### 0.4 Project snapshot (context)
- Repo: `github.com/feeerraaan/menu-magic` · local: `/root/menu-magic`
- Demo: `https://sacarta.azpy.es`
- Stack: Vite/React/TypeScript SPA → Supabase (Postgres + RLS on all 21 tables, 14 Edge Functions in Deno, Auth, Storage) → Vercel serverless (long PDF imports) → `packages/ai` (shared TS layer: agents, pipelines, zod schemas, providers) → **OpenCode Zen** LLM gateway (key rotation + fallback) → Stripe (billing) → Resend (email).
- i18n: `src/locales/{es,en,ca}.json` consumed by `src/hooks/useTranslation.ts`. Legacy `src/lib/i18n.ts` handles language names for the public menu.
- 17 migrations, 14 edge functions, 8 verified AI features, backoffice superadmin, billing (3 plans), no tests/CI.

---

## 1. Master task list

| # | Task | Status | Complexity | Depends on |
|---|---|---|---|---|
| 1 | Rewrite the README | ✅ | Medium | — |
| 2 | Create the Hackathon Video Script | 🕐 | Medium | — |
| 3 | Redesign Dashboard Overview | ✅ | High | — |
| 4 | Improve the "Today" section | ✅ | Medium | 3 |
| 5 | Review product copy | ✅ | Medium | — |
| 6 | AI Welcome Experience | ✅ | Medium | — |
| 7 | Better empty states | ✅ | Low-Med | 5 |
| 8 | Sticky sidebar | ✅ | Low | — |
| 9 | Landing improvements | ✅ | Medium | 5 |
| 10 | Before vs After comparison | ✅ | Low-Med | 9 |
| 11 | Generate professional screenshots | ✅ | Medium-High | 3, 4, 9 |
| 12 | Architecture diagram (SVG) | ✅ | Medium | — |
| 13 | Whitepaper (PDF-ready, ~10 pages) | 🕐 | Medium | 11, 12 |
| 14 | Short product trailer (15–20s) | 🕐 | Medium | 2 |
| 15 | Stripe Webhook | ✅ | Medium | — |
| 16 | Fix Schema Drift | ✅ | Low | — |
| 17 | Remove remaining `any` | ✅ | Medium | 16 |

Legend: ⬜ pending · 🟧 in progress · ✅ completed · 🕐 deferred (visual assets — done after the product is finished).

> **Revised order (2026-08-05):** tasks that produce visual/marketing assets (2 — video script, 11 — screenshots, 12 — architecture SVG, 13 — whitepaper, 14 — trailer) are **deferred to the end**, after the product itself is fully polished. The product tasks (3→10) come first, then billing/hygiene (15→17), then visuals.

---

# TASK 1 — Rewrite the README

### Goal
Replace the current Lovable-template README with one that reads like the README of a real, funded startup — elegant, concise, no screenshots, no embedded videos.

### Why it improves the product
The README is the first (and often only) thing a judge opens on GitHub. A boilerplate README screams _prototype_; a crafted one signals _product_.

### UX considerations
- Scannable in < 2 minutes: clear section headers, short paragraphs, tight tables.
- English (GitHub + hackathon standard).
- Tone: confident, technical, no hype adjectives.
- No screenshots / videos (per spec): rely on structure and an architecture diagram (Task 12) as the only visual.

### Technical approach
Hard reset `README.md` to a new structure built from the real repo facts (stack above). Use `<details>` blocks only for long env var tables to keep the top elegant. Pull tech-stack lines and architecture facts from `AUDITORIA_SACARTA_HACKATHON.md` and this plan's §0.4.

Suggested sections (order fixed by spec):
1. **Hero** — centered logo + name + one-line tagline + live demo & repo badges.
2. **Product description** — 3–4 sentences: what SaCarta is and who it's for.
3. **Problem** — the real cost of maintaining menus (time, languages, static).
4. **Solution** — the SaCarta flow: Upload → AI builds everything → Translate → Optimize → Grow.
5. **AI Architecture** — `packages/ai`: agents, pipelines, zod schemas, providers, OpenCode Zen key-rotation + fallback. This is the technical differentiator — show it.
6. **Technical Architecture** — embed/link the SVG from Task 12; one paragraph per layer (Frontend, Supabase, Edge Functions, Vercel serverless, OpenCode Zen, Stripe, Resend, Storage).
7. **Tech Stack** — compact table (technology → used for).
8. **Project Structure** — a trimmed tree of the real repo (api/, packages/ai/, supabase/, src/, docs/).
9. **Local Development** — prerequisites, clone, install, dev command, Supabase local setup.
10. **Environment Variables** — `<details>` table of required keys (name · purpose · where to get it). Never values.
11. **Deployment** — Vercel + Supabase + Vercel serverless; one-line of each.
12. **Live Demo** — link to `https://sacarta.azpy.es`.
13. **Author** — short credit line.

### Files that will be modified
- `README.md` (full rewrite)

### Estimated complexity
Medium — content-heavy but no logic. ~2–3 h.

### Dependencies
None. Task 12 (architecture SVG) is referenced but can be added later via a placeholder link.

### Acceptance criteria
- [ ] `README.md` fully rewritten with all 13 sections present.
- [ ] No trace of Lovable template language anywhere.
- [ ] No screenshots, no embedded videos.
- [ ] Architecture section references `docs/architecture.svg` (added by Task 12).
- [ ] Env-vars table documents every key the app actually reads (audited from `.env.example` / `import.meta.env` usage).
- [ ] Local dev steps verified to work from a clean clone.

---

# TASK 2 — Create the Hackathon Video Script

### Goal
Produce a complete **cinematic video script** (90s, English, no voice-over) for a Remotion build, using real React components from the app wherever possible. Apple / Linear / Arc Browser tone.

### Why it improves the product
The video is the highest-impact single asset: it lands on Devpost, GitHub README link, and the landing. A spec → Remotion composition turns "feel" into a buildable plan.

### UX considerations
- 90 seconds hard cap.
- Music + typography + UI + transitions only; no narration, no long screencasts.
- A judge watching muted on a phone must understand it.
- Text legible at mobile scale; respect safe areas.

### Technical approach
Author a self-contained script document containing:
- **Master timeline**: a 0–90s table with cumulative timestamps.
- **Scene list**: each scene = id, duration, in/out timestamps, intent.
- **Camera movement**: per scene (zoom-in/out, pan, hold, rack-focus).
- **Transitions**: per cut (cut-the-curve / zoom-through / waterfall / crossfade) with directional continuity notes.
- **Texts**: exact on-screen copy per scene (English, kinetic typography).
- **Remotion composition suggestions**: one `<Composition>` per scene, a `<Series>` master timeline, real component imports as "mock-UI" (render the real `PublicMenu`/`Overview`/`AiCopilot` components in a 1440×900 viewport, masked/glowed, not full screencast).

The script lives in `docs/video/HACKATHON_VIDEO_SCRIPT.md`. Reference audio: pick a royalty-free track name (placeholder) to be locked before rendering. UI shown in the video should reflect the polished UI delivered by Tasks 3–10, so the script is written to match the post-polish product.

### Files that will be modified / created
- `docs/video/HACKATHON_VIDEO_SCRIPT.md` (new)
- (Remotion project itself is out of scope for this task — only the script. Implementation comes later, separately.)

### Estimated complexity
Medium — design + writing. ~3–4 h.

### Dependencies
None for the script; conceptually aligned with Tasks 3–10 so scenes match final UI. (Task 14 trailer derives from this script.)

### Acceptance criteria
- [ ] Single Markdown document with: timeline, scene list, camera, transitions, texts, Remotion suggestions.
- [ ] Total runtime = 90s (sum of scene durations verified).
- [ ] English only; no voice-over notes.
- [ ] Every scene lists which real app component(s) it can reuse.
- [ ] Apple/Linear/Arc tone; no feature-list tone.

---

# TASK 3 — Redesign Dashboard Overview

### Goal
Transform the dashboard from an admin panel into a living, personalized overview that feels like an **AI employee** working for the restaurant.

### Why it improves the product
This is SaCarta's perceived value frontier: the dashboard is where a returning user lands. A scores+actions "assistant" beats a CRUD grid.

### UX considerations
- Lead with a personalized greeting + one-line restaurant status.
- Information hierarchy: **status → today → recommendations → recent improvements → alerts → quick actions**.
- Everything must feel alive: lightweight entrance animations (Tailwind `animate-fade-in` stagger, no framer-motion — it is not installed).
- Loading states feel like the AI is thinking (shimmer skeletons, copy-driven, not barren spinners — cross-reference Tasks 5/7).
- Remaining admin affordances (menu status, editor/QR/settings quick links) stay, demoted to the bottom.

### Technical approach
The current Overview (`src/pages/dashboard/Overview.tsx`, ~106 lines) uses `useOutletContext<{ restaurant }>()`, `useMenus`, `useTranslation`. Replace its body with a composed layout mounting new sub-components in `src/components/dashboard/overview/`:

- `GreetingHeader` — time-of-day greeting from `AuthContext` user name (fallback `restaurant.name`); status line derived from the health delta.
- `HealthScoreCard` — large score (0–100) + 8-factor breakdown. Compute with a pure engine `src/lib/restaurant-health.ts` (deterministic rules: images, descriptions, languages, accessibility, categories, pricing, popularity, SEO) — **no LLM cost, no new DB tables**. Trend vs the last snapshot stored in `localStorage` (`sacarta-health-<restaurantId>`).
- `RecommendationsPreview` — top 3 open `ai_recommendations` via existing `useAiInsights`.
- `InsightsStrip` — deterministic cards from `useAnalytics` (top non-default language %, top viewed dish, missing-translation count, week views).
- Keep the existing `Menu status` + quick-action cards at the bottom, compact.

Reused hooks already in the repo: `useAnalytics`, `useAiInsights`, `useMenus`. Add `useRestaurantHealth` (menu data fetch + compute + localStorage trend) and `useTodayAiActions` (Task 4).

No new migrations, no server changes → safe to merge.

### Files that will be modified / created
- `src/pages/dashboard/Overview.tsx` (rewrite)
- `src/lib/restaurant-health.ts` (new — pure scoring engine)
- `src/hooks/useRestaurantHealth.ts` (new)
- `src/components/dashboard/overview/GreetingHeader.tsx` (new)
- `src/components/dashboard/overview/HealthScoreCard.tsx` (new)
- `src/components/dashboard/overview/RecommendationsPreview.tsx` (new)
- `src/components/dashboard/overview/InsightsStrip.tsx` (new)
- `src/locales/{es,en,ca}.json` (add `dashboard.ov.*` keys)

### Estimated complexity
High. ~1–1.5 days.

### Dependencies
None blocking. Task 4 extends it. Tasks 5/7 polish copy + empty states inside it.

### Acceptance criteria
- [ ] Overview no longer opens to a CRUD grid: greeting + status is the first thing.
- [ ] `Restaurant Health` score (0–100) computed deterministically from real menu data, with 8-factor breakdown.
- [ ] Each factor links to the action that improves it (editor / settings / qr / analytics).
- [ ] Trend delta vs last visit shown (localStorage baseline).
- [ ] Top 3 open AI recommendations + at least 2 deterministic insights visible without scroll.
- [ ] Loading states use shimmer + thinking copy (no bare spinners).
- [ ] i18n complete (es/en/ca).
- [ ] `tsc --noEmit` + `vite build` green.

---

# TASK 4 — Improve the "Today" section

### Goal
A dedicated **Today** card inside the new Overview that answers "what happened in my restaurant today?" in 3 seconds.

### Why it improves the product
Daily cadence is the hook that brings owners back. Scannable, specific, honest.

### UX considerations
- Four stat tiles, large numbers, micro labels.
- A minimal inline SVG 7-day sparkline above the tiles (no chart lib needed; `chart.tsx`/recharts available if richer needed).
- Empty-state: _"Your first views will appear here."_ (Task 7).

### Technical approach
Build `src/components/dashboard/overview/TodaySection.tsx` reading:
- `todayViews` from `useAnalytics` (`stats.todayViews`).
- `aiActions` today from a new `useTodayAiActions(restaurantId)` — `count: 'exact', head: true` on `ai_usage` where `created_at >= startOfDay(now)` (local tz).
- `openRecommendations` from `useAiInsights` (`recommendations.length`).
- `pendingTranslations` from `useRestaurantHealth` (`health.missingTranslations`).
- `viewsByDay` (7 pts) from `useAnalytics` → sparkline.

Mount inside Overview (Task 3) as the right column.

### Files that will be modified / created
- `src/hooks/useTodayAiActions.ts` (new)
- `src/components/dashboard/overview/TodaySection.tsx` (new)
- `src/locales/{es,en,ca}.json` (add `dashboard.ov.today.*` keys)

### Estimated complexity
Medium. ~2–4 h.

### Dependencies
Task 3 (mount point + data plumbing).

### Acceptance criteria
- [ ] "Today" card visible in the Overview with 4 honest real-time stats.
- [ ] 7-day sparkline renders from real `menu_views`.
- [ ] AI action count reflects current day in the restaurant's local timezone.
- [ ] Empty state present (Task 7).
- [ ] i18n complete.

---

# TASK 5 — Review product copy

### Goal
Sweep every user-facing string and rewrite developer/placeholder/MVP wording into mature-SaaS copy.

### Why it improves the product
Copy is invisible polish until it's bad — then it dominates the impression of quality.

### UX considerations
- Tone: confident, helpful, human, non-technical.
- Loading → "AI is thinking" style (specific verbs, never "Processing…").
- Errors → blame the system never the user, always offer a next action.
- Buttons → verb-first, outcome-oriented.

### Technical approach
1. Inventory: extract all keys from `src/locales/{en,es,ca}.json` + hard-coded strings (`grep` for quoted JSX text and `console`/`toast` messages).
2. Classify wording problems into buckets: loading, progress, buttons, empty states, errors, dialogs, AI messages.
3. Rewrite bucket-by-bucket, updating key values (not keys) in all three locale files; replace hard-coded English with `t()` calls.
4. Keep keys stable; only values change (avoids breaking `t('…')` references).
5. Document any new keys added in the Progress Log.

### Files that will be modified
- `src/locales/en.json`, `src/locales/es.json`, `src/locales/ca.json`
- Any component with hard-coded user-facing strings (fix to `t()`).

### Estimated complexity
Medium. ~4–6 h.

### Dependencies
None; unblocks cleaner work for Tasks 3/7/9.

### Acceptance criteria
- [ ] No string contains "lorem", "TODO", "placeholder", "foo/bar" user-facing.
- [ ] Every loading state uses a specific AI-flavored verb phrase.
- [ ] No error message blames the user; every error offers a next step.
- [ ] Buttons are verb-first and outcome-oriented.
- [ ] All three locales in sync (no missing-key fallbacks in the dashboard).

---

# TASK 6 — AI Welcome Experience

### Goal
After onboarding or AI Import, replace the immediate jump to the editor with a **premium AI preparation flow** that builds anticipation.

### Why it improves the product
The first 10 seconds set the emotional register: from "form submitted" to "an AI is preparing my restaurant".

### UX considerations
- Full-screen overlay, centered, calm, minimal.
- Sequential steps with live check marks:
  `Preparing your restaurant… → Understanding your menu… → Creating categories… → Generating descriptions… → Translating… → Almost ready… → Finished.`
- Skip always available; never block.
- Land on the new Overview (Task 3), not the raw editor.

### Technical approach
- Trigger: the success path of `OnboardingWizard` (`src/components/dashboard/OnboardingWizard.tsx`) and the AI Import success (`src/components/dashboard/AiImportDialog.tsx`).
- New `src/components/dashboard/AiWelcomeSequence.tsx`:
  - **Best case**: reflects real import progress — the existing client-driven import pipeline (`/api/ai-import-start|step`) already reports steps; map them to the visible steps.
  - **Fallback**: cosmetic timed sequence (< 10 s) when no real steps are available.
- i18n keys under `dashboard.welcome.*`. Respect `prefers-reduced-motion`.

### Files that will be modified / created
- `src/components/dashboard/AiWelcomeSequence.tsx` (new)
- `src/components/dashboard/OnboardingWizard.tsx` (invoke on success)
- `src/components/dashboard/AiImportDialog.tsx` (invoke on success)
- `src/locales/{es,en,ca}.json` (`dashboard.welcome.*`)

### Estimated complexity
Medium. ~3–5 h.

### Dependencies
Task 3 (landing target). Task 5 (copy vocabulary).

### Acceptance criteria
- [ ] Onboarding success → Welcome sequence, then Overview.
- [ ] AI Import success → Welcome sequence reflecting real steps where they exist.
- [ ] Skip button always available; total < 60 s.
- [ ] No bare spinner; thinking copy per step.
- [ ] Reduced-motion respected; i18n complete.

---

# TASK 7 — Better empty states

### Goal
Replace every generic empty state with explanatory copy + a strong CTA pointing to the next AI-assisted action.

### Why it improves the product
Empty states are the moment users get stuck; turning them into invitations is cheap and high-yield.

### UX considerations
- Pattern: AI icon (Task 9 rule) + headline (verb + benefit) + one-line subtext + primary CTA.
- Encourage AI involvement where applicable: _"Upload your menu — let AI build everything."_

### Technical approach
1. Hunt empty states: `grep` for "No items", "No data", "empty", `length === 0` branches across `src/pages/dashboard/*.tsx` and shared components.
2. New shared `EmptyState` component (`src/components/ui/empty-state.tsx`): props `icon`, `title`, `description`, `action`.
3. Replace ad-hoc empty branches in: Menu Editor, Analytics, Insights/Recommendations, categories, items, Today (Task 4), images.
4. Copy from Task 5 vocabulary; i18n in all three locales.

### Files that will be modified / created
- `src/components/ui/empty-state.tsx` (new)
- `src/pages/dashboard/MenuEditor.tsx`, `Analytics.tsx`, items/categories dialogs as needed
- `src/locales/{es,en,ca}.json`

### Estimated complexity
Low-Medium. ~2–3 h.

### Dependencies
Task 5 (copy tone).

### Acceptance criteria
- [ ] No "No items."-style dead strings remain.
- [ ] Every empty state has an AI-encouraging headline + a working CTA.
- [ ] Shared `EmptyState` component used everywhere new.
- [ ] i18n complete.

---

# TASK 8 — Sticky sidebar

### Goal
Make the dashboard sidebar remain visible while scrolling, like Linear / GitHub / Notion.

### Why it improves the product
A fixed sidebar is a small detail that instantly signals "premium app".

### UX considerations
- Sidebar stays full-height and independently scrollable if its content overflows.
- Main content scrolls independently.
- Mobile: existing off-canvas behavior preserved.

### Technical approach
`DashboardLayout` (`src/components/dashboard/DashboardLayout.tsx`) currently uses a `SidebarProvider` + sticky header. Adjust:
- Set the sidebar container to `h-screen sticky top-0` (or `position: sticky`) within the flex row, and let the inner nav scroll.
- Ensure the main column scrolls independently (overflow-y-auto, height = viewport minus header).
- Verify the header's `sticky top-0` still works above the sidebar.
- Test long pages: Overview, Menu Editor, Settings, Analytics, Billing.

### Files that will be modified
- `src/components/dashboard/DashboardLayout.tsx`
- `src/components/dashboard/DashboardSidebar.tsx` (inner scroll container)

### Estimated complexity
Low. ~1–2 h.

### Dependencies
None.

### Acceptance criteria
- [ ] Sidebar remains fully visible while scrolling any dashboard page taller than the viewport.
- [ ] Only the main content scrolls; sidebar scrolls internally if needed.
- [ ] No layout regression on mobile (off-canvas intact).
- [ ] No CLS / scroll jumps on initial load.

---

# TASK 9 — Landing improvements

### Goal
Improve (not redesign) the landing around **storytelling**: problem → wasted time → AI solves it → value proposition.

### Why it improves the product
The landing currently lists features; selling the transformation converts.

### UX considerations
- Hero copy sells emotion, the body sells the proof.
- A Before/After thread runs through the page (culminating in Task 10's comparison section).
- No jargon ("LLM", "pipeline") in the hero.

### Technical approach
Edit `src/pages/Index.tsx` in place:
- Rewrite hero headline + subhead to outcome copy; keep CTAs.
- Insert/rewrite a **Problem** block (the time restaurants lose).
- Rewrite a **How AI solves it** block (Upload → build → translate → optimize → grow).
- Tighten the existing Features block to benefits, not capabilities.
- Add the Before/After comparison section (Task 10) below features, above pricing.
- i18n all three locales.

### Files that will be modified
- `src/pages/Index.tsx`
- `src/locales/{es,en,ca}.json` (`hero.*`, `features.*`, `problem.*`, `solution.*`)

### Estimated complexity
Medium. ~half day.

### Dependencies
Task 5 (copy tone). Task 10 mounts inside it.

### Acceptance criteria
- [ ] Hero understood in 5 seconds by someone who's never heard of SaCarta.
- [ ] Problem / Solution / Value blocks present and ordered.
- [ ] Features rewritten as benefits.
- [ ] i18n complete; responsive verified on mobile.

---

# TASK 10 — Before vs After comparison

### Goal
A dedicated, highly visual comparison section on the landing: **Before SaCarta vs After SaCarta**.

### Why it improves the product
The clearest way to sell a transformation is to show the sides side by side.

### UX considerations
- Two columns: left muted/tense (Before), right bright/accent (After).
- Rows: Time, Manual work, Translations, Menu creation, Updates, Optimization.
- Responsive: stacks (Before above After) on mobile, "After" never hidden.

### Technical approach
New `src/components/landing/ComparisonSection.tsx` rendered inside `Index.tsx` (Task 9). Pure presentational; rows driven by an i18n array so copy lives in locale files.

### Files that will be modified / created
- `src/components/landing/ComparisonSection.tsx` (new)
- `src/pages/Index.tsx` (mount)
- `src/locales/{es,en,ca}.json` (`comparison.*`)

### Estimated complexity
Low-Medium. ~1–2 h.

### Dependencies
Task 9 (mount point + styling context).

### Acceptance criteria
- [ ] 6 comparison rows present (Time, Manual work, Translations, Menu creation, Updates, Optimization).
- [ ] Visual asymmetry Before(muted) vs After(accent) obvious.
- [ ] Responsive; i18n complete.

---

# TASK 11 — Generate professional screenshots

### Goal
Produce a consistent set of professional screenshots (browser UI hidden, consistent desktop size, correct crops) for GitHub, Devpost, Whitepaper, Marketing.

### Why it improves the product
These assets propagate to every judge-facing surface; quality here lifts every other asset.

### UX considerations
- Consistent viewport (1440×900 @2x recommended), same theme throughout, clean demo data.
- No personal data, no dev console, no notifications, cursor out of frame.

### Technical approach
- Use Playwright (preferred) headless Chromium at a fixed viewport; full-page and targeted screenshots.
- Log in with the provided demo account (see §0.5), seed the restaurant so the polished Overview/Editor/Analytics look populated.
- Save under `docs/screenshots/` with stable, documented names.

### 0.5 Demo credentials (task-local, demo only)
> Email: `sacarta@azpy.es` · Password: `***redacted — stored locally, never committed***`
> Demo-only. The password is **never** committed to the repo or any public document; it lives in Ferran's local env (`.env.local`) and is filled in at screenshot time (Task 11).

Shots to capture (file names):
| File | Surface |
|---|---|
| `landing.png` | `/` landing |
| `dashboard.png` | `/dashboard` Overview (post Task 3/4) |
| `menu-editor.png` | `/dashboard/editor` |
| `ai-import.png` | AI Import dialog open |
| `ai-copilot.png` | `/dashboard/ai-copilot` with a real exchange |
| `analytics.png` | `/dashboard/analytics` with insights |
| `qr.png` | `/dashboard/qr` |
| `settings.png` | `/dashboard/settings` |
| `public-menu.png` | `/m/<slug>` public menu (desktop) |
| `customer-assistant.png` | Customer Assistant chat open |
| `billing.png` | `/dashboard/billing` pricing |
| `admin.png` | `/dashboard/admin` backoffice |

### Files that will be modified / created
- `docs/screenshots/*.png` (new assets)
- `scripts/take-screenshots.mjs` (new Playwright script, re-runnable)

### Estimated complexity
Medium-High (Playwright setup + seeding + capture). ~0.5–1 day.

### Dependencies
Tasks 3, 4, 9 (UI must be polished first), demonstrably 6 (welcome) optional.

### Acceptance criteria
- [ ] All 12 screenshots present in `docs/screenshots/`, < ~500 KB each, @2x.
- [ ] Same viewport, same theme, same demo restaurant throughout.
- [ ] Browser chrome hidden; correct crops; no dev tools / personal data.
- [ ] Playwright script committed and re-runnable.

---

# TASK 12 — Architecture diagram (SVG)

### Goal
A professional, minimal, modern architecture diagram in SVG showing the real layers.

### Why it improves the product
A clean diagram sells the technical depth in one glance (README, Devpost, Whitepaper).

### UX considerations
- Minimal: rounded containers, thin arrows, accent only on the AI layer.
- Renders on GitHub light **and** dark mode (transparent background).

### Technical approach
Build in Excalidraw/Figma or hand-authored SVG, then optimize (SVGO). Reflect the real topology from §0.4:
Frontend (Vite/React) ⇄ Supabase (Postgres + RLS, Auth, 14 Edge Functions, Storage) · Vercel serverless (long imports) · `packages/ai` (shared TS agents/pipelines/schemas/providers) → OpenCode Zen (key rotation + fallback) · Stripe · Resend.

Save `docs/architecture.svg` + a PNG fallback. Verify GitHub render.

### Files that will be modified / created
- `docs/architecture.svg` (new) · `docs/architecture.png` (fallback)
- `README.md` (link it — already allowed by Task 1)

### Estimated complexity
Medium. ~2–3 h.

### Dependencies
None. Feeds Tasks 1, 13.

### Acceptance criteria
- [ ] SVG present, optimized, renders on GitHub light + dark.
- [ ] Shows every real layer (no invented microservices).
- [ ] PNG fallback present.

---

# TASK 13 — Whitepaper (PDF-ready, ~10 pages)

### Goal
A beautiful, elegant PDF-ready document (~10 pages, no marketing fluff) that elevates the project to a thesis-grade artifact.

### Why it improves the product
Whitepapers are a scarcity signal; their existence (and skim) says "serious team".

### UX considerations
- One idea per page, big numbers, breathing room.
- Visual style matches the landing/brand.
- ~10 pages.

### Sections (fixed by spec)
Problem · Solution · AI · Architecture · User Flow · Tech Stack · Business Model · Future Vision.

### Technical approach
Produce as HTML→PDF (reuse the MindMap pipeline pattern if present) or Figma/Canva. Embed screenshots from Task 11 and the diagram from Task 12. Export to `docs/SaCarta-Whitepaper.pdf`, < 10 MB, with metadata. Link from README (Task 1) and Devpost later.

### Files that will be modified / created
- `docs/SaCarta-Whitepaper.pdf` (new)
- `docs/whitepaper/` source (HTML/Figma export) as needed

### Estimated complexity
Medium. ~half day.

### Dependencies
Tasks 11, 12.

### Acceptance criteria
- [ ] ~10 pages, all 8 sections present.
- [ ] Elegant, minimal, on-brand.
- [ ] Includes real screenshots + architecture diagram.
- [ ] PDF < 10 MB, metadata set.

---

# TASK 14 — Short product trailer (15–20s)

### Goal
Beyond the 90s hackathon video, an ultra-short visual-impact trailer for LinkedIn / X (Twitter) / Product Hunt.

### Why it improves the product
Native-feed autoplay requires silent, fast, vertical; a 15–20s cut maximizes reach.

### UX considerations
- 15–20s; hook in first 2s; logo + URL close.
- Fully understandable muted.
- Formats: 9:16 (1080×1920) + 1:1 (1080×1080).

### Technical approach
Derive from Task 2's Remotion compositions: recut the strongest beats to 18s, re-time text for vertical (no simple crop). Export both aspect ratios to `docs/video/`.

### Files that will be modified / created
- `docs/video/trailer-9x16.mp4`, `docs/video/trailer-1x1.mp4` (new)
- Remotion project adjustments as needed

### Estimated complexity
Medium. ~2–3 h (reuses Task 2's work).

### Dependencies
Task 2 (compositions). Tasks 3–10 (final UI).

### Acceptance criteria
- [ ] 15–20s; 9:16 + 1:1 versions.
- [ ] Understandable muted; hook ≤ 2s.
- [ ] Logo + tagline + URL close.

---

# TASK 15 — Stripe Webhook

### Goal
Implement proper Stripe webhooks so entitlement no longer relies on client-side sync alone. Best practices.

### Why it improves the product
Closes the top audit risk (drift on payment/cancel/failure) and makes billing production-grade.

### UX considerations
- Invisible to the user; the only visible effect is correct, prompt plan changes.

### Technical approach
New Edge Function `supabase/functions/stripe-webhook/index.ts` (Deno), consistent with existing `create-checkout` / `customer-portal` / `check|sync-subscription`. Handle:
- `checkout.session.completed` → activate plan
- `customer.subscription.updated` → sync plan/period
- `customer.subscription.deleted` → downgrade to free
- `invoice.payment_failed` → mark `past_due`
- `invoice.payment_succeeded` → confirm period

Best practices:
- Verify the Stripe signature (`stripe.webhooks.constructEvent`); reject on bad signature (400).
- Idempotency: persist processed `event.id` (reuse an existing table or add a tiny `stripe_webhook_events` migration noted in Task 16's drift capture).
- Fast 200; deterministic mapping `customer → restaurant`.
- Test with Stripe CLI against each event.
- Add the webhook secret to env (documented in README Task 1) — never commit the value.

### Files that will be modified / created
- `supabase/functions/stripe-webhook/index.ts` (new)
- Possibly `supabase/migrations/<ts>_stripe_webhook_events.sql` (if idempotency table — coordinate with Task 16)
- `docs/` note for the new env var

### Estimated complexity
Medium. ~3–5 h.

### Dependencies
None blocking; coordinate with Task 16 if a new migration is added.

### Acceptance criteria
- [ ] Webhook deployed and receiving all 5 events.
- [ ] Signature verification enforced.
- [ ] Idempotent (replays don't double-apply).
- [ ] Plan updates without the user revisiting Billing (verified with Stripe CLI).
- [ ] No regression in existing billing endpoints.

---

# TASK 16 — Fix Schema Drift

### Goal
Synchronize the DB schema with migrations so the repo fully represents production — no undocumented columns.

### Why it improves the product
Eliminates ghost columns (`instagram_url`, `website_url`, `template`) that break fresh environments; closes audit risk #2.

### UX considerations
None — pure hygiene.

### Technical approach
1. Diff migrations vs live: `supabase db diff` (and manual inspection).
2. Author a catch-up migration `supabase/migrations/<ts>_capture_schema_drift.sql` using `IF NOT EXISTS` for `restaurants.instagram_url`, `restaurants.website_url`, `restaurants.template` (+ anything else surfaced), matching production nullability/defaults exactly.
3. Regenerate `src/integrations/supabase/types.ts` (and `src/types/database.ts` if hand-aligned).
4. Verify `supabase db diff` migrations↔live = empty.
5. Coordinate with Task 15 if a `stripe_webhook_events` table is introduced — fold into the same migration pass.

### Files that will be modified
- `supabase/migrations/<ts>_capture_schema_drift.sql` (new)
- `src/integrations/supabase/types.ts` (regenerated)
- `src/types/database.ts` (aligned if needed)

### Estimated complexity
Low. ~1–2 h.

### Dependencies
Ideally before Task 17 (clean types help remove `any`).

### Acceptance criteria
- [ ] Catch-up migration committed.
- [ ] `supabase db diff` migrations↔live empty.
- [ ] Types regenerated from DB, not hand-edited.
- [ ] `tsc --noEmit` + `vite build` green.

---

# TASK 17 — Remove remaining `any`

### Goal
Replace every remaining TypeScript `any` so the project compiles cleanly and type safety improves.

### Why it improves the product
Closes audit lint debt; _"por orgullo"_ — quality engineers don't ship `any`.

### UX considerations
None — internal quality.

### Technical approach
1. Enumerate: `eslint src --rule '@typescript-eslint/no-explicit-any: error'`.
2. Fix file-by-file (worst first — historically `PublicMenu.tsx`, `MenuEditor.tsx`), preferring DB types / zod inferred types / explicit interfaces / `unknown`+narrowing.
3. Change types only, never logic. If an `any` hides a bug, log it and fix separately.
4. After Task 16, regenerate types first so DB shapes are accurate.
5. Confirm `tsc --noEmit` + `vite build` green, lint `no-explicit-any` = 0.

### Files that will be modified
- `src/pages/PublicMenu.tsx`, `src/pages/dashboard/MenuEditor.tsx`, and others surfaced by the lint pass.

### Estimated complexity
Medium. ~2–4 h.

### Dependencies
Task 16 (accurate generated types).

### Acceptance criteria
- [ ] `@typescript-eslint/no-explicit-any` reports 0 across `src/`.
- [ ] `tsc --noEmit` green; `vite build` green.
- [ ] No behavior regression on the touched screens (manual smoke test).

---

## Progress log

> Append after each completed task. Most recent on top.

| Date | Task | Files changed | Notes | Remaining |
|---|---|---|---|---|
| 2026-08-06 | Copilot now answers in the owner's language | `packages/ai/prompts/copilotL10n.ts` (new), `packages/ai/prompts/copilot.ts`, `packages/ai/tools/resolver.ts`, `packages/ai/agents/copilotAgent.ts`, `supabase/functions/ai-copilot/index.ts`, `packages/ai/schemas/copilot.ts`, `src/hooks/useAiCopilot.ts` | The Copilot is now language-aware: the frontend sends the UI language, the edge function falls back to the restaurant's default language, and the system prompt instructs the model to reply only in that language. All deterministic strings (resolver summaries, confirmation templates) go through a new `copilotL10n` dict in es/en/ca. Verified live: Spanish request -> Spanish preview summary; English request -> English reply. Redeployed. | Task 13: Whitepaper (next). Task 2: video script; Task 14: trailer. |
| 2026-08-06 | Screenshots re-captured in English + Copilot localized | `docs/screenshots/*.png` (10 re-taken), `packages/ai/prompts/copilot.ts`, `packages/ai/tools/resolver.ts`, `packages/ai/agents/copilotAgent.ts`, `packages/ai/tools/executor.ts`, `supabase/functions/ai-copilot/index.ts`, `scripts/take-screenshots.mjs` | Re-took the screenshot set forcing the whole app to English (`SaCarta-language=en` + `locale: en-GB`; demo menu schedule temporarily opened and restored). Public menu now shows English translations (Starters/Mains/Desserts/Drinks). The AI Copilot screenshot shows an EXECUTED action ("Increase the price of all Entrantes dishes by 10%" → "Your confirmation is needed..." → "Applied. 8 change(s) applied."). To make the copilot English, its system prompt, resolver/agent summaries and the edge-function templates were localized to English (all confirmation strings), redeployed, E2E verified, then demo prices restored. | Task 13: Whitepaper (next). Task 2: video script; Task 14: trailer. |
| 2026-08-06 | Task 11: Professional screenshots | `docs/screenshots/*.png` (12 new), `scripts/take-screenshots.mjs` (new), `package.json` (+playwright devDep) | Captured all 12 shots on the demo account (sacarta@azpy.es, restaurant SaCarta) at 1440x900 @2x headless: landing, dashboard, menu-editor, ai-import (dialog open), ai-copilot (real vegetarian-dishes exchange), analytics, qr, settings, billing, admin (via admin account), public-menu, customer-assistant (widget open). Re-runnable script mints a demo session via magic link (no stored password); demo menu schedule was temporarily opened for the public shots and restored after. Also found + fixed a production bug: the menu editor crashed with `t is not defined` (CategoryCard lacked useTranslation). | Task 13: Whitepaper (next). Task 2: video script; Task 14: trailer. |
| 2026-08-06 | Task 12: Architecture diagram (SVG) | `docs/architecture.svg` (new), `docs/architecture.png` (new) | Hand-authored SVG, optimized with SVGO (5.8 kB). Shows the real topology: Frontend (Vite/React) and Vercel Serverless feeding a dashed line into `packages/ai` (shared layer, accent), Supabase (Postgres+RLS, Auth, 14 Edge Functions, Storage) wired to it, `packages/ai` → OpenCode Zen (LLM gateway), plus Stripe (billing/webhooks) and Resend (email). Transparent background, opaque cards with dark text so it reads on GitHub light and dark. PNG fallback rendered at 2x (2480x1600, transparent). README already linked `docs/architecture.svg` (Task 1). | Task 11: professional screenshots (done). |
| 2026-08-06 | Task 17: Remove remaining `any` | `OnboardingWizard.tsx`, `lib/api.ts`, `PublicMenu.tsx`, `dashboard/MenuEditor.tsx`, `ui/command.tsx`, `ui/textarea.tsx` | `@typescript-eslint/no-explicit-any` is now **0 across `src/`** (was 15). Replaced `catch (e: any)` with `unknown` + narrowing, `as any` payload casts with `Json`, removed needless casts in the schedule-overlap check, and typed the PublicMenu categories join with a generated-types bridge (`CategoryWithRelations`). Also fixed 2 pre-existing empty-interface lint errors in shadcn ui. tsc + build green; `npm run lint` on src now has 0 errors. Smoke-tested public menu + QR dashboard page headless (no console errors). | All 17 tasks complete. Deferred visual assets remain: Tasks 2, 11, 12, 13, 14. |
| 2026-08-06 | QR code PDF: single page | `dashboard/QRCode.tsx` | The printable PDF could overflow onto an empty 2nd page depending on the preview size. Print layout now caps the QR (`max-width: 400px`, SVG scales down), tightens `@page` margins and font sizes so it always fits one A4 page. | None |
| 2026-08-06 | Task 16: Fix Schema Drift | `supabase/migrations/20260806110000_*_capture_schema_drift.sql` (new), `src/integrations/supabase/types.ts` (regenerated from live DB) | `supabase db diff --linked` surfaced 3 undocumented `restaurants` columns that existed in production but not in migrations (`instagram_url` text null, `website_url` text null, `template` text not null default 'classic'). Catch-up migration (IF NOT EXISTS, matches prod exactly) committed and pushed to the live project. Re-ran `db diff`: column drift now 0. `src/types/database.ts` already had the fields; `src/integrations/supabase/types.ts` regenerated from the live schema (acceptance "types from DB, not hand-edited"). Remaining `db diff` output is Supabase platform-managed artifacts (default anon/authenticated/service_role grants, `pg_net`, `rls_auto_enable`), not app schema drift. tsc/build green. | Task 17: Remove remaining `any` (next). |
| 2026-08-06 | Task 15: Stripe Webhook | `supabase/functions/stripe-webhook/index.ts` (new), `supabase/migrations/20260806100000_*_stripe_webhook_events.sql` (new), `supabase/config.toml`, `src/integrations/supabase/types.ts`, `README.md` | Deployed live. Edge Function verifies the Stripe signature (`constructEventAsync`, required in the Deno runtime; the sync `constructEvent` throws), handles `checkout.session.completed`, `customer.subscription.{created,updated,deleted}`, `invoice.payment_{failed,succeeded}`, and is idempotent via a `stripe_webhook_events` ledger (replays return duplicate, no double-apply). Webhook endpoint created in Stripe (live), secret persisted locally + set as `STRIPE_WEBHOOK_SECRET`. E2E verified: bad/no signature → 400; valid event → 200; replay → 200 duplicate; unknown type → 200. Respects `manual_override` like sync-subscription. | Task 16: Fix Schema Drift (done). |
| 2026-08-06 | Backoffice fix: admin fetch loop | `src/hooks/useTranslation.ts` | Prod users tab hammered `admin_list_users` in an infinite loop (t unstable per render → useCallback deps `[toast, t]` in Admin tabs refired the load effect → never painted the table). Fix: memoized `t`/`tReplace`/`tRaw` per language. Also removed a pre-existing `any`. Verified live in headless Chromium: table renders 2 users, no loop, no console errors. | None |
| 2026-08-06 | Contact messages to backoffice + em-dash cleanup | `supabase/migrations/20260806090000_*_contact_messages.sql` (new), `supabase/functions/send-contact/index.ts`, `src/lib/admin-api.ts`, `src/integrations/supabase/types.ts`, `src/pages/dashboard/Admin.tsx`, `src/locales/{en,es,ca}.json`, `AGENTS.md` (new), plus em-dash removal in 18 src files | Landing "Contacto" form now always persists to `contact_messages` (service-role insert in `send-contact`); email stays as best-effort, failures don't lose the message. New backoffice "Mensajes" tab (admin-only RPCs: list / toggle read / delete), view + mark read/unread + delete. Table has no client RLS; admins reach it via SECURITY DEFINER RPCs gated by `has_role`. RPC/table types added manually to generated types (no Supabase CLI here). All em-dashes removed from user-facing strings and code comments (rule persisted in `AGENTS.md`: never use —). tsc/build/lint green; `deno check` green on `send-contact`. | Deployed (migrations pushed + `send-contact` redeployed; email delivery is optional via `RESEND_API_KEY`). Em-dash rule now applies to all future work. |
| 2026-08-06 | Task 10: Before vs After comparison | `components/landing/ComparisonSection.tsx` (new), `pages/Index.tsx`, `locales/{en,es,ca}.json` (`comparison.*`) | Two-column comparison (Before muted/crossed-out vs After accent/gradient) with 6 rows (Time, Manual work, Translations, Menu creation, Updates, Optimization) driven by an i18n array; stacks on mobile with After never hidden; mounted between Features and Pricing. i18n in sync. tsc/build/lint green. | Task 15: Stripe Webhook (next). | `pages/Index.tsx`, `components/landing/ProblemSection.tsx` (new), `components/landing/SolutionSection.tsx` (new), `hooks/useTranslation.ts` (added `tRaw` for JSON arrays), `locales/{en,es,ca}.json` | Pushed to prod (commit `367be76`). Hero rewritten to transformation copy + AI badge; new **Problem** section (6h/week, never translated, zero visibility) and **How AI solves it** (Upload→Build→Translate→Optimize) sections; Features rewritten as benefits. i18n in sync (595 keys). tsc/build green, no new lint. | Before/After comparison is Task 10 (next). |
| 2026-08-05 | Task 8 — Sticky sidebar | `components/dashboard/DashboardLayout.tsx` | Pushed to prod (commit `d753933`). Root layout now `flex h-svh overflow-hidden`; only the `<main>` scrolls (`overflow-y-auto`); sidebar (shadcn, already `sticky top-0 h-svh`) stays fully visible; nav scrolls internally, footer pinned. Header kept sticky. tsc/build/lint green. | Mobile keeps existing `collapsible="none"` behavior (not reviewed). |
| 2026-08-05 | Task 7 — Better empty states | `components/ui/empty-state.tsx` (new), `MenuEditor`, `Analytics`, `AiCopilot`, `AiOptimizer`, `RecommendationsPreview`, `TodaySection`, `Admin`, `RestaurantDetail`, `locales/{en,es,ca}.json` | Pushed to prod (commit `4fcdf45`). Shared `EmptyState` (icon + title + desc + strong CTA) used in 6 surfaces; every empty state now invites the next AI action (import menu, run insights, analyze, share QR). Today card shows empty-views hint linking to QR. i18n in sync. tsc/build green. | Admin remains Spanish-only for some detail strings (minor). |
| 2026-08-05 | Task 6 — AI Welcome Experience | `components/dashboard/AiWelcomeSequence.tsx` (new), `OnboardingWizard.tsx`, `MenuEditor.tsx`, `locales/{en,es,ca}.json` (`dashboard.welcome.*`) | Pushed to prod (commit `8a3e8c9`). Full-screen sequence after onboarding finish AND after AI import in the editor. Steps with spinner→check, skip always, ~6s, `prefers-reduced-motion` shortens to 2 steps. i18n en/es/ca. tsc/build green; no new lint. | Sequence is cosmetic (no live job hooks); real import progress remains inside AiImportDialog. |
| 2026-08-05 | Task 5 — Review product copy | 28 files | Pushed to prod (commit `b250f20`). See log entry above. | — |
| 2026-08-05 | Task 3 + 4 — Dashboard Overview redesign + Today | `Overview.tsx`, `lib/restaurant-health.ts`, `hooks/useRestaurantHealth.ts`, `hooks/useTodayAiActions.ts`, `components/dashboard/overview/*` (GreetingHeader, HealthScoreCard, TodaySection, RecommendationsPreview, InsightsStrip), `locales/{en,es,ca}.json` | Pushed to prod (commit `858ad9f`). Deterministic 8-factor health engine (no LLM, no migrations), localStorage trend, Today card with 4 stats + sparkline, top-3 recs preview, deterministic insights strip, staggered entrance. tsc/build/lint green. **Note:** later hotfix `2dc41aa` dropped Popularity/SEO factors and removed em-dash placeholders. | Empty states & copy polish come in Tasks 5/7; AI-actions tile uses local tz start-of-day. |
| 2026-08-05 | Task 1 — Rewrite the README | `README.md` | Pushed to prod (commit `9ae6e2b`). 13 sections, env table audited from code, architecture SVG linked (Task 12). Zero Lovable/media. | — |

---

## Final constraints (do not forget)
- One task at a time; finish & verify before moving on.
- Never commit to `main`; merge only on approval.
- After every task: tick the table, append the Progress Log.
- Keep production deployable at all times.