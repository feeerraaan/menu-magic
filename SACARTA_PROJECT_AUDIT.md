# SACARTA — Complete Product & Technical Audit

**Audit date:** 2026-08-01
**Repository audited:** `/root/menu-magic` (local clone of `github.com/feeerraaan/menu-magic`, remote name `origin`)
**Method:** Static, read-only audit of the full source tree, SQL migrations, Edge Functions, config files and git history. No code was changed, no assumptions were made about unimplemented features, and no external systems (Supabase dashboard, Stripe dashboard, Vercel dashboard) were queried — this document reflects **only what exists in this repository as of this date**.

> Note on naming: the product is branded **"SaCarta"** everywhere in the UI, emails and marketing copy. The codebase, npm package name (`vite_react_shadcn_ts`), GitHub repo (`menu-magic`) and several internal identifiers still use the original Lovable-generated name **"menu-magic"**. Both names refer to the same product.

---

## 1. Executive Summary

**What it is:** SaCarta is a SaaS web application that lets restaurant owners create a digital menu ("carta digital"), publish it at a public URL (`/m/:slug`), and let customers view it by scanning a QR code. The owner manages the menu (categories, dishes, prices, photos, dietary tags, multi-language translations, schedule-based visibility) from a private dashboard, and can subscribe to paid tiers via Stripe for higher limits (more menus, categories, items, languages, photos, and features like scheduling and analytics).

**Problem it solves:** Physical/PDF restaurant menus are static, hard to update, not searchable, not mobile-friendly, and not multilingual. SaCarta gives a restaurant a live, mobile-first, multilingual, always-up-to-date digital menu behind a QR code, with basic usage analytics for the owner.

**Target audience:** Independent restaurants, cafés and bars — primarily Spanish/Catalan-speaking small businesses (the product originated and is marketed as "Nacido en Mallorca", Spanish is the default language everywhere, plan names are Balearic-fauna themed: Sargantana/Ferreret/Myotragus).

**Current maturity:** **Functional MVP / early-stage SaaS**, not production-hardened. Core CRUD flows (auth, restaurant setup, menu editing, QR generation, public menu rendering, Stripe checkout) all work end-to-end in code. However: no automated tests exist anywhere in the repo, there is no CI pipeline, the Stripe integration relies on client-triggered polling rather than webhooks (see §7/§20), and the project was until very recently developed entirely inside the no-code platform Lovable (`lovable-tagger` is still a dev dependency, the README is the unmodified Lovable boilerplate). The user is in the middle of migrating it to an independently-owned stack (own GitHub repo, own Vercel project, own Supabase project) — this migration is **not finished** (see §3 and project memory).

**Main value proposition:** "Your professional digital menu in minutes" — fast setup (a 3-step onboarding wizard), no technical skill required, multilingual out of the box, QR-code distribution, and a tiered pricing model that monetizes menu/category/item/photo/language limits and advanced features (scheduling, analytics, custom QR).

---

## 2. Product Vision

The vision is only implicit in the code and marketing copy (`presentacion.html`, landing page copy, welcome email) — there is no dedicated vision/roadmap document in the repo. From what is present:

- Position: a **local, small-scale challenger** to generic QR-menu SaaS products, explicitly framed as a Mallorca-born initiative ("Nacido en Mallorca • Recién horneado", "Porque tu comida merece ser vista antes de ser probada").
- Differentiation claimed in copy: elegant design, effortless multilingual translation, personalized QR codes, and visit analytics (`presentacion.html` feature grid: "Diseño Impecable", "Multilingüe", "QR Personalizado", "Analíticas").
- Monetization ambition: a 3-tier ladder (free → recurring Pro → one-time lifetime "Myotragus" plan with **manual, human-assisted setup** — "Configuración manual del menú por nosotros"), suggesting the vision includes a concierge/managed-service upsell, not just self-serve software.
- No public roadmap, no issue tracker, no CHANGELOG.md exists in the repo. "Planned but not implemented" items are inferred purely from code (see §25).

---

## 3. Current State

**Finished / usable end-to-end:**
- Email+password and magic-link authentication (Supabase Auth), password reset.
- Restaurant onboarding wizard (name → address/phone → currency/language).
- Multi-menu, multi-category, multi-item CRUD with drag-and-drop reordering (`@dnd-kit`).
- Per-item dietary flags (vegetarian/vegan/spicy/gluten-free), allergens, featured flag, photo upload with client-side compression.
- Per-category and per-item translations (separate `category_translations` / `item_translations` tables, tabbed UI).
- Menu scheduling (day-of-week + time-range rules, with overlap detection between simultaneously-active menus).
- Public menu page with language switcher, dietary badges, item detail modal, sticky category nav, scroll-spy.
- QR code generation/download (PNG, SVG, print-ready PDF via browser print).
- Basic visit analytics (total/today/week views, 7-day bar chart, views-by-language breakdown, top-5 items) computed client-side from a raw `menu_views` table.
- Stripe checkout for two paid plans (monthly/annual subscription + one-time lifetime), Stripe customer portal for self-service cancellation/plan management.
- Full plan-limit enforcement in the UI (menus/categories/items/photos/languages capped by plan, with upgrade prompts).
- 3-language UI (Spanish, English, Catalan) via a hand-rolled JSON-based i18n system.

**Missing / explicitly incomplete (found in code or docs, not assumed):**
- **No Stripe webhook endpoint exists.** Subscription state is kept in sync only by the frontend calling `check-subscription` / `sync-subscription` Edge Functions on page load, tab focus, or after returning from Stripe Checkout. If a user never revisits the Billing page, plan changes (upgrades, cancellations, failed payments) may never be written to the database.
- **Templates are declared but not implemented.** `Restaurant.template` exists as a field in the TypeScript type and is selected in `PublicMenu.tsx`'s Supabase query, but no migration ever creates this column, no UI lets an owner pick a template, and `MenuContent` never reads `restaurant.template` to change rendering. Only one visual layout for the public menu exists.
- **`MenuEditor.tsx` translations are partially done.** Per `DASHBOARD_TRANSLATIONS_SUMMARY.md`, the toast messages were translated but dialog labels/buttons in `MenuEditor.tsx` still hardcode English/Spanish strings directly (confirmed in code: e.g. "Add Item", "Edit Category", "Options", "Featured", "Vegetarian" are hardcoded, not run through `t()`).
- **Database schema drift.** `Restaurant` (TS type) and the actual `PublicMenu.tsx` query reference columns (`instagram_url`, `website_url`, `template`) that are **not present in any of the 9 SQL migration files** in `supabase/migrations/`. These must have been added directly via the Supabase dashboard/Lovable on the original ("Lovable") Supabase project and never captured as a migration — meaning the migration history in this repo cannot fully reconstruct the live schema.
- **Migration to independent infrastructure is mid-flight** (per project memory, corroborated by `supabase/config.toml` still pointing `project_id = "sipxerzltoczbhrybwnn"`, the original Lovable Supabase project). A new, independent Supabase project has been created but the schema/Edge Function secrets have not yet been migrated to it; DNS for `sacarta.azpy.es` is still pending (site currently live only at the temporary `sacarta.vercel.app`).
- No automated tests (no test framework in `package.json`, no `*.test.*` / `*.spec.*` files anywhere in the repo).
- No CI/CD configuration (no `.github/workflows`, no `vercel.json` beyond a single SPA rewrite rule).
- No error tracking/observability integration (no Sentry, no LogRocket, etc.) — only `console.log`/`console.error`, gated behind `import.meta.env.DEV` in most (not all) call sites.
- `README.md` is the **unedited Lovable template boilerplate** (still says "Welcome to your Lovable project", references `lovable.dev` for editing/deploy/domains) with a color-palette table appended at the bottom — i.e., project documentation has not been rewritten since leaving Lovable.

**Biggest weaknesses:**
1. Billing correctness depends on the user opening the Billing tab (no webhook) — silent revenue/entitlement drift is possible.
2. No tests, no CI — regressions are only caught manually.
3. Schema exists partly outside version control (columns not in migrations).
4. Single-restaurant-per-owner data model (`restaurants.owner_id` is 1:1 in practice — `fetchRestaurant`/`useRestaurant` fetch a single restaurant via `.maybeSingle()`), so there is no support for a user managing multiple restaurants, no staff/team accounts, no roles beyond a single owner.
5. Client compresses/uploads images directly to a public Supabase Storage bucket with no server-side validation beyond a 5MB client-side check and a MIME allow-list in the original bucket definition.

**Biggest strengths:**
1. Clean, small, consistent codebase (shadcn/ui + Tailwind + TypeScript, no dead frameworks bolted on).
2. RLS (Row Level Security) is used correctly and iterated on across multiple migrations (storage policies were tightened three times, translation tables' public exposure was fixed, subscriptions were locked down from direct client writes) — shows real security awareness, not just Lovable defaults.
3. The plan-limit system (`subscription-limits.ts`) is a single, well-organized source of truth that's easy to extend.
4. The onboarding → editor → QR → analytics loop is genuinely complete and usable today for a single restaurant.

---

## 4. User Personas

Only **one real persona** is implemented with actual permissions logic; the others are either partially modeled or not modeled at all.

### Restaurant Owner (implemented)
- **Goals:** create and maintain a digital menu, publish it, track basic visit stats, manage billing.
- **Permissions:** full CRUD on their own `restaurants` row and everything hanging off it (menus, categories, items, translations, subscription row is read-only to them — see below). Enforced via Postgres RLS: every owner-facing policy checks `auth.uid() = owner_id` (directly on `restaurants`, or transitively via `EXISTS` joins for `menus`/`categories`/`items`/translations).
- **Workflow:** sign up → onboarding wizard (3 steps) → dashboard (`/dashboard`) → Menu Editor / QR / Analytics / Settings / Billing.

### Customer / Diner (implemented, no account)
- **Goals:** view a restaurant's menu quickly on a phone, in their language, know prices/allergens.
- **Permissions:** anonymous (`anon` Postgres role). Can only `SELECT` `restaurants` where `is_published = true`, and only active menus/categories/items belonging to a published, active parent chain. Can `INSERT` into `menu_views` (anonymous analytics ping) but nothing else.
- **Workflow:** scan QR / open link → `/m/:slug` → browse categories → tap item for detail modal → (no checkout/ordering — this is a menu display only, not an ordering/POS system).

### "admin" role (declared, not used anywhere)
- The first migration creates an `app_role` enum with values `'admin' | 'owner' | 'user'`, a `user_roles` table, and a `has_role(uuid, app_role)` SQL function. Every new signup is auto-assigned the `'user'` role via the `handle_new_user()` trigger. **No application code anywhere reads `user_roles` or calls `has_role()`.** There is no admin panel, no super-admin screen, no code path that checks for the `'admin'` role. This is scaffolding inherited from a generic Lovable/Supabase auth template, present in the schema but functionally dead.
- **Manager / Staff persona: not implemented.** There is no concept of inviting a second user to help manage a restaurant. `restaurants.owner_id` is singular; RLS policies only ever check `owner_id = auth.uid()`, never a team/staff table.

---

## 5. Complete User Journey

### 5a. Restaurant owner journey (implemented)
```
Landing page (/)
  ↓  (click "Empezar Gratis" / "Iniciar Sesión")
Auth (/auth)
  - Sign up (email + password + name) OR
  - Sign in (password) OR
  - Sign in via Magic Link OR
  - Forgot password → reset email
  ↓ (on first login, no restaurant row yet, or onboarding_completed = false)
Onboarding Wizard (3 steps, inline in DashboardLayout, no dedicated route)
  Step 1: restaurant name → creates restaurants + subscriptions(free) + menus("Main Menu") rows
  Step 2: address, phone
  Step 3: currency, default language → marks onboarding_completed = true, fires send-welcome-email
  ↓
Dashboard Overview (/dashboard)
  - shows publish status + public menu URL
  - quick links to Editor / QR / Settings
  ↓
Menu Editor (/dashboard/editor)
  - select/create/edit/delete Menu (with optional day/time schedule + overlap warning)
  - create/edit/delete/reorder Categories (drag handle)
  - create/edit/delete/reorder/duplicate/toggle-visibility Items (drag handle)
  - per-category and per-item translation tabs (if restaurant has >1 supported language)
  - image upload (client-compressed to WebP) per item / logo
  ↓
QR Code (/dashboard/qr)
  - live QR preview (size slider), copy URL, download PNG/SVG/print-ready PDF
  ↓
Analytics (/dashboard/analytics)
  - total/today/week views, 7-day bar chart, views-by-language, top-5 items
  ↓
Settings (/dashboard/settings)
  - logo, name, address, phone, currency, supported languages (limited by plan), default language,
    hide-prices toggle, publish toggle
  ↓
Billing (/dashboard/billing)
  - current plan + limits, Stripe customer portal link, plan cards (upgrade/downgrade/lifetime)
  - checkout opens in a new tab → Stripe Checkout → redirect to
    /dashboard/billing/success (calls sync-subscription, shows a summary) or
    /dashboard/billing/canceled
```

### 5b. Customer journey (implemented)
```
Scans QR code / opens shared link
  ↓
/m/:slug  (PublicMenu.tsx)
  - fetch restaurant by slug (must be is_published = true)
  - fetch active menus → pick the first one whose schedule_rules currently matches (or always-on if none)
  - fetch categories + items (+ translations) for that menu
  - render: header (logo, name, address, phone), language switcher (if >1 supported language),
    sticky category nav with scroll-spy, "Featured" section, per-category item lists
  - tap an item → detail modal (large photo, name, dietary badges, price, description, allergens)
  - every unique (restaurant, language) view and every unique (restaurant, item) view fires a
    fire-and-forget INSERT into menu_views (client-side dedup via an in-memory Set, so this resets
    on page reload — repeat visits in the same session after a reload will double-count)
```

### 5c. Journeys explicitly NOT implemented
- No ordering/checkout journey for the diner (this is a display-only menu, not a POS/ordering system).
- No "add a second restaurant" journey for an existing owner.
- No staff-invite journey.
- No admin/back-office journey (despite the `admin` role existing in the DB enum).

---

## 6. Features

| Feature | Purpose | Status | Screens | Backend | AI |
|---|---|---|---|---|---|
| Email/password auth | Owner login | ✅ Implemented | `/auth` | Supabase Auth | No |
| Magic link auth | Passwordless login | ✅ Implemented | `/auth` | Supabase Auth | No |
| Password reset | Account recovery | ✅ Implemented | `/auth` | Supabase Auth | No |
| Onboarding wizard | First-run restaurant setup | ✅ Implemented | Inline in `DashboardLayout` | `restaurants`, `subscriptions`, `menus` tables + `send-welcome-email` fn | No |
| Multi-menu support | Different menus (lunch/dinner/wine list) w/ schedules | ✅ Implemented | `/dashboard/editor` | `menus` table, `schedule_rules` JSONB | No |
| Category management | Group items | ✅ Implemented | `/dashboard/editor` | `categories` + `category_translations` | No |
| Item management | Individual dishes | ✅ Implemented | `/dashboard/editor` | `items` + `item_translations` | No |
| Drag-and-drop reordering | Reorder categories/items | ✅ Implemented | `/dashboard/editor` | `display_order` column, sequential updates | No |
| Dietary tags & allergens | Vegetarian/vegan/spicy/gluten-free + free-text allergen list | ✅ Implemented | Editor + Public menu | `items` boolean columns + `allergens text[]` | No |
| Image upload & compression | Item photos, logo | ✅ Implemented | Editor, Settings | Client-side canvas→WebP compression, Supabase Storage bucket `menu-images` | No |
| Multi-language content | Translate categories/items | ✅ Implemented | Editor (tabs), Public menu (switcher) | `category_translations`/`item_translations` tables | No |
| Multi-language UI | Translate dashboard/landing chrome | ⚠️ Partial | All screens | `src/locales/{en,es,ca}.json` + `useTranslation` hook | No |
| QR code generation | Distribute the menu | ✅ Implemented | `/dashboard/qr` | `qrcode.react` (client-only, no backend) | No |
| Visit analytics | Owner insight into views | ✅ Implemented (basic) | `/dashboard/analytics` | `menu_views` table, all aggregation done client-side in `useAnalytics` | No |
| Menu scheduling | Show different menus by day/time | ✅ Implemented | Editor (`MenuScheduleEditor`), Public menu (`isMenuAvailable`) | `menus.schedule_rules` JSONB | No |
| Plan limits enforcement | Monetize via caps | ✅ Implemented | Editor, Settings, Billing | `subscription-limits.ts` (client-only enforcement, not re-checked by RLS/DB constraints) | No |
| Stripe checkout | Pay for Pro/Lifetime | ✅ Implemented | `/dashboard/billing` | `create-checkout` Edge Function | No |
| Stripe customer portal | Self-serve cancel/manage | ✅ Implemented | `/dashboard/billing` | `customer-portal` Edge Function | No |
| Subscription status sync | Reflect Stripe state in DB | ⚠️ Implemented but **poll-only, no webhook** | `/dashboard/billing`, `/dashboard/billing/success` | `check-subscription` / `sync-subscription` Edge Functions | No |
| Manual override flag | Let staff grant a plan without Stripe | ✅ Implemented (DB-only, no UI) | — (must be set directly in DB) | `subscriptions.manual_override` column, honored by `check-subscription` | No |
| Contact form | Landing-page lead capture | ✅ Implemented | `/` (Index) | `send-contact` Edge Function (Resend) | No |
| Welcome email | Onboarding email w/ discount code copy | ✅ Implemented | Fired from onboarding wizard | `send-welcome-email` Edge Function (Resend), 3-language templates | No |
| Custom domain field | White-label domain per restaurant | ⚠️ Column exists, unused | — | `restaurants.custom_domain` (nullable, never read by any route/rewrite logic) | No |
| Templates | Multiple public-menu visual layouts | ❌ Not implemented | — | `restaurants.template` referenced in code/types but column missing from migrations, never rendered | No |
| Team/staff accounts | Multiple users per restaurant | ❌ Not implemented | — | — | No |
| Admin/back-office panel | Manage all restaurants/users | ❌ Not implemented | — | `app_role='admin'` + `has_role()` exist unused | No |
| Ordering/checkout for diners | Let customers order/pay | ❌ Not implemented (out of scope for this product) | — | — | No |

---

## 7. AI Features

**Current AI features: none.** There is no integration with any LLM or AI provider anywhere in this repository.

Evidence for this conclusion:
- `package.json` dependencies contain no AI/LLM SDKs (no `openai`, `@anthropic-ai/*`, `@google/generative-ai`, `langchain`, etc.).
- A full-text search of the Edge Functions (`check-subscription`, `create-checkout`, `customer-portal`, `send-contact`, `send-welcome-email`, `sync-subscription`) shows they only call Stripe and Resend APIs — no calls to any AI/LLM endpoint.
- No prompt files, no embeddings, no vector columns/extensions in the SQL migrations (no `pgvector`).
- The "translation" feature is **not** AI-powered — category/item translations are plain manually-typed text fields entered by the owner in a tabbed dialog (`CategoryDialogWithTranslations.tsx` / `ItemDialogWithTranslations.tsx`); there is no auto-translate button or machine-translation API call anywhere.
- The landing page markets "AI"-adjacent-sounding language nowhere; the actual marketing claims ("Diseño Impecable", "Multilingüe", "QR Personalizado", "Analíticas") describe manual/deterministic features, not AI ones.

**Planned AI features:** none found. No roadmap document, code comment, TODO, or config flag references any future AI functionality (e.g., no `// TODO: add AI menu description generator`, no feature-flag named anything AI-related).

**Where AI is NOT used (i.e., everywhere):** menu content generation, translation, image generation/recognition, chatbot/support, analytics insights/recommendations, pricing suggestions, fraud detection, personalization — none of these exist in any form, manual placeholder, or stub.

---

## 8. Restaurant Management

**Restaurant model** (`restaurants` table, defined in the first migration, extended later outside of migrations — see §16 for the discrepancy):
- Core columns present in migrations: `id`, `owner_id` (FK → `auth.users`, cascade delete), `name`, `slug` (unique, auto-generated via `generate_unique_slug()`), `logo_url`, `address`, `phone`, `currency` (default `'EUR'`), `default_language` (default `'en'`), `supported_languages` (`text[]`, default `['en']`), `hide_prices` (bool), `theme` (`'light'|'dark'` as free text, default `'light'`), `custom_domain`, `is_published` (bool, default `false`), `onboarding_completed` (bool), `created_at`/`updated_at`.
- Columns used in application code but **absent from the migration files**: `instagram_url`, `website_url`, `template` (all present in `src/types/database.ts` and selected explicitly in `PublicMenu.tsx`'s query). This is schema drift — see §3 and §16.

**Branches:** not implemented. One restaurant = one physical location. There is no `branches`/`locations` table, and `is_published` is a single restaurant-level flag, not per-branch.

**Users:** 1 Supabase Auth user ↔ (at most) 1 `restaurants` row (`owner_id`), enforced in practice (not by a DB unique constraint, but by `fetchRestaurant()`/`useRestaurant()` always calling `.maybeSingle()` against `owner_id = user.id` and the onboarding flow only ever creating one restaurant). No invite/multi-user-per-restaurant mechanism exists.

**Roles/Permissions:** see §4. `app_role` enum (`admin`/`owner`/`user`) and `user_roles` table exist in the schema and are auto-populated (`'user'`) on signup, but **no code path reads or enforces roles**. All real authorization is done directly against `owner_id` via RLS.

**Settings implemented** (`/dashboard/settings`, `Settings.tsx`):
- Logo upload, restaurant name, address, phone.
- Currency: EUR / USD / GBP / MXN (hardcoded list, `CURRENCIES` const in both `Settings.tsx` and `OnboardingWizard.tsx` — MXN is only offered in Settings, not in onboarding).
- Language: toggle which of `{en, es, ca}` are supported (capped by plan's `languages_limit`), pick a default language among the enabled ones.
- Visibility: `hide_prices` toggle, `is_published` toggle (this is the master publish switch — an unpublished restaurant's public menu route returns "Menu not found" for anonymous users).

**Branding:** logo image only; no color/theme customization exposed to the owner (the `theme` column exists and is read by `PublicMenu.tsx` to toggle a `dark` class, but there's no UI in Settings to change it — it's stuck at its DB default of `'light'` for every restaurant created through the current onboarding flow).

**Languages:** `en`, `es`, `ca` are the only languages the i18n system (`src/lib/i18n.ts`) and `LanguageSelector` know about, even though `CategoryDialogWithTranslations.tsx` has a `LANGUAGE_NAMES` map that also lists `fr`, `de`, `it`, `pt` — suggesting more languages were planned for content translation but the UI-chrome translation layer and the `languages` array were never extended to match.

**Taxes:** not implemented anywhere (no tax rate field, no tax calculation, no tax display).

**Currencies:** display-only symbol substitution (`€`/`£`/`$`) in `PublicMenu.tsx`'s `formatPrice()`; no currency conversion, no multi-currency pricing per item.

**Opening hours (restaurant-level):** not implemented as a distinct concept — only **menu-level** scheduling exists (`menus.schedule_rules`), which controls which menu is shown when, not whether the restaurant itself is "open".

---

## 9. Menu Management

- **Categories:** name, optional description, `display_order`, `is_active` (soft-hide without deleting), timestamps, optional translations. CRUD + drag-reorder in `MenuEditor.tsx`.
- **Products (Items):** name, optional description, optional `price` (nullable — allows "market price"/no-price items), optional `photo_url`, `is_active`, `is_featured` (surfaces in a "Featured" section on the public menu), four dietary boolean flags (`is_vegetarian`, `is_vegan`, `is_spicy`, `is_gluten_free`), free-text `allergens text[]`, `display_order`, optional translations.
- **Variants / Modifiers (e.g., size options, add-ons/extras, combos):** **not implemented.** Each item has exactly one price; there is no variant table, no modifier/add-on concept anywhere in the schema or UI.
- **Images:** one photo per item (`photo_url`), one logo per restaurant (`logo_url`). No image gallery per item, no multiple photos.
- **Ordering:** manual drag-and-drop, persisted as an integer `display_order`, re-written sequentially on every reorder (one `UPDATE` per row — not batched, could be slow for very large menus, though realistic menu sizes under the plan limits — max 1000 items on Lifetime — make this a minor concern rather than a blocker).
- **Availability:** two independent mechanisms — (a) `is_active` boolean at menu/category/item level (simple show/hide), and (b) `schedule_rules` at the **menu** level only (day-of-week + start/end time windows, with a "first matching active menu wins" resolution and UI-side overlap-conflict detection between simultaneously active menus). Item/category-level scheduling does not exist — only whole menus can be scheduled.
- **Prices:** stored as `DECIMAL(10,2)`, nullable, formatted client-side with a hardcoded 3-symbol currency map (`€`/`£`/`$`) — any other selected currency (e.g. MXN) falls back to `$`.
- **Visibility:** `is_active` (soft toggle) vs. actual deletion (hard delete, cascades via FK `ON DELETE CASCADE` through categories→items→translations). `hide_prices` is a restaurant-wide switch that suppresses all price display on the public menu regardless of per-item settings.
- **Seasonal products:** not implemented as a distinct concept beyond generic menu-level scheduling (e.g., you could model "summer menu" as one more `menus` row with an appropriate schedule, but there's no date-range/seasonal-specific UI or data model — the scheduler is day-of-week + time-of-day only, it has no start/end **date**).

---

## 10. QR Experience

- **What happens when a customer scans:** the QR encodes the exact public URL `${origin}/m/{restaurant.slug}` (generated client-side with `qrcode.react`, level `H` error correction). Scanning opens that URL in the phone's default browser — this is a normal web page, not a native app or PWA-installable experience (no manifest.json / service worker found in `public/`).
- **Desktop:** the same `/m/:slug` route renders responsively (Tailwind `container mx-auto`), but the product is clearly designed mobile-first (single-column layout, `max-w-4xl` centered content, sticky mobile-style nav).
- **Mobile:** primary target; includes `env(safe-area-inset-bottom)` padding utility for notch/home-indicator safe areas, touch-sized tap targets, sticky scrollable category nav with `scrollbar-hide`.
- **Tablet:** no distinct tablet layout — inherits the same responsive breakpoints as desktop/mobile (Tailwind default breakpoints only; no tablet-specific design decisions found).
- **Languages on the QR-linked page:** if the restaurant has more than one `supported_languages`, a language switcher button appears in the header; language choice persists to `localStorage` (`'SaCarta-language'` key) and defaults to the restaurant's `default_language`, falling back to the visitor's browser language if supported.
- **Theme:** only whatever `restaurants.theme` is set to in the DB (currently un-editable via UI, effectively always light for new restaurants) — this toggles Tailwind's `dark` class wrapper, and both light/dark CSS variable sets exist and are styled (`src/index.css`), but there is no way for an owner to actually switch it today.
- **Performance:** no explicit performance optimizations found — images are not lazy-loaded (no `loading="lazy"` attributes), no CDN/image-transformation service is used beyond whatever Supabase Storage serves directly, no route-based code-splitting (`React.lazy`) is used anywhere in `App.tsx` (all pages are eagerly imported).
- **Caching:** none implemented at the application level — no service worker, no HTTP cache-control headers set by the app (Vercel's default static-asset caching would apply to the built JS/CSS bundle only). Every page load re-fetches the full menu from Supabase.
- **QR customization:** a `qrCustomization` plan-limit flag exists in `subscription-limits.ts` (`false` on Free, `true` on paid plans) but **no code anywhere checks or uses `qrCustomization`** — the QR page (`QRCode.tsx`) offers the same size slider and PNG/SVG/PDF download options to every plan regardless of this flag. This is a monetized feature that is defined but not gated/implemented.

---

## 11. Customer Experience

Single screen: `/m/:slug` (`PublicMenu.tsx`), plus its embedded item-detail modal. No screenshots exist in the repository (see §28 for what should be captured).

- **Header:** logo (if set), restaurant name (serif display font), address (with pin icon), phone (with phone icon), and — if multilingual — a language dropdown.
- **Sticky category nav:** horizontal scrollable pill/tab row, active category underlined via scroll-spy (`IntersectionObserver`-style manual scroll listener, not the native API — a plain `scroll` event handler recalculating on every scroll tick).
- **Featured section:** larger horizontal cards (photo + name + price + dietary badges + description) for any item flagged `is_featured`, shown above the regular category list if any exist.
- **Category sections:** each category renders its name and its active items as compact rows (small thumbnail, name, dietary badge icons, truncated description, price).
- **Item detail modal:** tapping any item opens a `Dialog` with a large photo, full name, all dietary badges, full price, full description, and an allergens callout box.
- **Empty/error states:** "Menu not found" (unknown/unpublished slug), "No menu available" (no active menus), "Menu not available at this time" (all menus fail their schedule check), "Failed to load menu" (any fetch error) — all rendered as a centered heading + subtext, no retry button.
- **UX assessment:** clean, legible, restaurant-appropriate serif/sans typography pairing (Playfair Display + Inter), generous whitespace, dark-mode-aware Tailwind classes throughout. The single biggest UX gap is the **complete absence of loading skeletons for images** (raw `<img>` tags, no blur-up/placeholder) and **no lazy loading**, meaning a menu with many photos will show a page full of broken-image icons momentarily on slow connections before images pop in.

---

## 12. Admin Dashboard

All dashboard pages live under `/dashboard/*`, wrapped by `DashboardLayout` (sidebar + top bar), gated by `ProtectedRoute` (redirects to `/auth` if not authenticated) and by the onboarding check (shows `OnboardingWizard` instead of the dashboard if `!restaurant || !restaurant.onboarding_completed`).

| Page | Route | Key actions | Key state/tables touched |
|---|---|---|---|
| Overview | `/dashboard` (index) | View publish status + menu URL; quick-links to Editor/QR/Settings | `restaurants`, `menus` (via `useMenus`) |
| Menu Editor | `/dashboard/editor` | Create/edit/delete/switch Menu (with schedule); create/edit/delete/reorder Category; create/edit/delete/reorder/duplicate/toggle-active Item; open translation dialogs; see live limit indicators (menus/categories/items/photos) | `menus`, `categories`, `category_translations`, `items`, `item_translations` |
| QR Code | `/dashboard/qr` | Adjust preview size; copy URL; download PNG/SVG/PDF | none (client-only) |
| Analytics | `/dashboard/analytics` | View aggregate stats + chart + top items | `menu_views`, `items` (name lookup) |
| Settings | `/dashboard/settings` | Edit logo/name/address/phone/currency/languages/theme-hide-prices/publish | `restaurants` |
| Billing | `/dashboard/billing` | View current plan/limits; refresh Stripe status; open customer portal; start checkout for a plan | `subscriptions` (read), Stripe via 3 Edge Functions |
| Billing Success | `/dashboard/billing/success` | Post-checkout: trigger sync, show confirmation + next-step buttons | calls `sync-subscription` |
| Billing Canceled | `/dashboard/billing/canceled` | Post-checkout-cancel landing (not read in detail above, but present) | none |

**Modals/dialogs across the dashboard:** Category dialog (with per-language tabs), Item dialog (with per-language tabs, options switches, photo upload gated by plan photo limit), Menu edit dialog (name/description/active toggle/schedule editor/overlap warning), generic delete-confirmation dialog (shared for menu/category/item).

**Tables (UI sense, not DB):** no literal `<table>` grids are used in the dashboard — all lists (menus dropdown, categories, items, analytics top-items) are rendered as card/list components, not tabular grids.

---

## 13. Current Design System

- **Typography:** display/heading font **Playfair Display** (serif, imported from Google Fonts in `index.css`), body font **Inter** (sans-serif). Applied via a `.font-display` utility class and a global `h1..h6` rule.
- **Spacing/radius:** Tailwind default spacing scale plus two custom utilities (`safe-bottom`, `safe-top` for iOS safe areas). Global corner radius token `--radius: 0.75rem`, consumed by `borderRadius.lg/md/sm` in `tailwind.config.ts`.
- **Colors:** HSL CSS custom properties defined once in `:root` and mirrored in `.dark`, consumed through Tailwind's `hsl(var(--x))` pattern (shadcn/ui convention). Brand primary is a **warm terracotta/rust** (`16 80% 50%` light / `16 75% 55%` dark), accent is **gold** (`45 90% 55%`), plus semantic `success`/`warning`/`destructive` tokens and a separate `sidebar-*` token set. The README additionally documents the resolved hex values (e.g., primary `#CC5C3D` light / `#DA7561` dark, accent `#FFC62E`/`#FFB800`).
- **Cards:** shadcn `Card` primitive everywhere, plus bespoke utility classes (`.menu-card`, `.glass-card`) for the landing page and public menu that layer hover/backdrop-blur effects on top.
- **Buttons:** shadcn `Button` with `class-variance-authority` variants (`default`, `outline`, `ghost`, `destructive`, `link`), rounded-full used specifically on marketing CTAs, rounded-xl/lg used in-app.
- **Inputs:** shadcn `Input`/`Textarea`/`Select`/`Switch`/`Slider` primitives, consistent focus-ring styling (`.input-field` utility mirrors this for any custom-styled inputs).
- **Icons:** `lucide-react` exclusively — no icon inconsistency found (no mixed icon libraries).
- **Animations:** Tailwind-driven keyframes only (`accordion-down/up`, `fade-in`, `slide-in`, `scale-in`) — no external animation library (no Framer Motion, no GSAP). Hover micro-interactions (`hover:-translate-y-0.5`, shadow growth) are used on landing-page CTAs and dashboard quick-action cards.
- **Dark mode:** implemented at the CSS-variable level for **both** the app shell (via Tailwind's `class`-strategy dark mode, toggled by whatever wraps the tree) and the public menu specifically (`PublicMenu.tsx` conditionally applies a `dark` class based on `restaurant.theme`). However, **there is no in-app control to toggle dark mode for the dashboard itself** — `next-themes` is a dependency but no `ThemeProvider`/toggle component was found wired into `App.tsx`, so dark mode is effectively dormant for the authenticated app and only reachable (indirectly, unconfigurably) for the public menu via the unused `theme` restaurant setting.
- **Design philosophy:** warm, "artisanal/appetizing" restaurant branding (terracotta + serif display type evokes a printed menu), shadcn/ui's default composability kept intact rather than heavily overridden — a fairly standard, competent "Lovable-generated SaaS" aesthetic rather than a bespoke design system built from scratch.

---

## 14. Technical Architecture

```
┌─────────────────────────────┐
│  Vite + React 18 + TS  SPA  │   client-side routed (react-router-dom v6)
│  (shadcn/ui + Tailwind)     │   TanStack Query installed but NOT used for data
└───────────┬─────────────────┘   fetching (all data fetching is hand-rolled
            │ HTTPS                async/await inside hooks — see §17 notes)
            ▼
┌─────────────────────────────┐
│   Supabase (BaaS)           │
│  - Postgres (RLS-secured)   │
│  - Auth (email/pw, OTP)     │
│  - Storage (menu-images)    │
│  - Edge Functions (Deno)    │──┐
└───────────┬─────────────────┘  │
            │                    │  server-to-server
            ▼                    ▼
     public/anon reads     ┌───────────┐  ┌───────────┐
     (menus, items, etc.)  │  Stripe   │  │  Resend   │
                           │ (billing) │  │  (email)  │
                           └───────────┘  └───────────┘
```

- **Frontend:** Vite 5 + React 18 + TypeScript, `react-router-dom` v6 for routing, shadcn/ui (Radix primitives + Tailwind) for UI, `@tanstack/react-query` is installed and a `QueryClient` is instantiated in `App.tsx`, but a grep of the codebase shows **no `useQuery`/`useMutation` calls** — all data fetching is done through plain custom hooks (`useRestaurant`, `useMenus`, `useCategories`, `useItems`, `useAnalytics`) that manage their own `useState`/`useEffect` loading state. React Query is present but effectively unused dead weight today.
- **Backend:** no custom backend server — all backend logic is either (a) Postgres RLS + SQL functions, or (b) Supabase **Edge Functions** (Deno runtime, 6 functions total, listed in §17).
- **API:** no REST/GraphQL API of the app's own design — the frontend talks directly to Supabase's auto-generated PostgREST API via `supabase-js`, plus direct `fetch`-style invocations of the 6 Edge Functions.
- **Workers:** none (no background job queue, no cron, no `pg_cron` usage found in migrations).
- **Storage:** Supabase Storage, single bucket `menu-images` (public, 5MB file-size limit, MIME allow-list `image/jpeg|png|webp` at creation — note images are actually re-encoded client-side to `webp` before upload regardless of original type).
- **Authentication:** Supabase Auth (email/password + magic link/OTP + password reset); session handled via `supabase-js`'s built-in `onAuthStateChange` listener in `AuthContext`.
- **Database:** Postgres (via Supabase), 9 versioned migrations plus (per §3) some out-of-band schema changes not captured in migrations.
- **Caching:** none (see §10).
- **Deployment:** Vercel (project name `sacarta`, team `ferrans-projects-5b117cc1`, per project memory), SPA rewrite configured in `vercel.json` (`/(.*) → /index.html`), currently live at `sacarta.vercel.app` (custom domain `sacarta.azpy.es` pending DNS cutover, per project memory — this is operational/deployment state, not something visible in the repo files themselves, included here for completeness since it was explicitly told to the assistant, not inferred).
- **CDN:** whatever Vercel provides by default for static assets; Supabase Storage's own CDN for images (no explicit configuration in-repo).
- **Email:** Resend (`resend` npm package used inside Edge Functions, plus one function that calls Resend's HTTP API directly with `fetch` instead of the SDK — `send-welcome-email` vs `send-contact`, an inconsistency between the two email-sending functions).
- **Background jobs / Queues:** none.
- **Third-party services:** Stripe (billing), Resend (transactional email), Supabase (everything else), Vercel (hosting), qrcode.react (client-side QR rendering, no external service call).

---

## 15. Folder Structure

```
menu-magic/                          (repo root, product-branded "SaCarta")
├── .agents/skills/                  Claude Code project-scoped skill definitions (Supabase best-practices,
│                                    Supabase usage) — tooling/agent config, not part of the shipped product
├── .claude/                         Claude Code local settings (untracked, created this session)
├── .env, .env.local                 Local environment secrets (Supabase/Vercel keys) — gitignored
├── .mcp.json                        Project-scoped MCP server registration (Supabase MCP)
├── .vercel/                         Vercel CLI link metadata (project.json)
├── public/                          Static assets: favicon.ico, logo.png, logo.svg, placeholder.svg, robots.txt
├── src/
│   ├── App.tsx                      Route table + top-level providers (QueryClient, Tooltip, Auth, Language)
│   ├── main.tsx                     Vite/React entry point
│   ├── components/
│   │   ├── ui/                      shadcn/ui primitives (48 files — button, dialog, sidebar, chart, etc.)
│   │   ├── dashboard/                Dashboard-specific composite components (layout, sidebar, onboarding
│   │   │                            wizard, schedule editor, category/item translation dialogs)
│   │   ├── subscription/             Plan-limit UI (LimitIndicator, UpgradeBanner)
│   │   ├── LanguageSelector.tsx, NavLink.tsx, PricingCard.tsx, ProtectedRoute.tsx
│   ├── contexts/                    AuthContext, LanguageContext, SubscriptionContext (React Context, no Redux)
│   ├── hooks/                       useRestaurant/useMenus/useCategories/useItems (CRUD hooks),
│   │                                useAnalytics, usePlanLimits, useTranslation, use-toast, use-mobile
│   ├── integrations/supabase/       client.ts (supabase-js client init), types.ts (generated DB types)
│   ├── lib/                         api.ts (Supabase query functions), constants.ts (pricing plans/Stripe
│   │                                price IDs), i18n.ts (UI-chrome translations for en/es/ca), 
│   │                                subscription-limits.ts (plan limit source of truth), utils.ts (cn() helper)
│   ├── locales/                     en.json / es.json / ca.json (content translation dictionaries used by
│   │                                useTranslation — a SECOND, JSON-based i18n layer parallel to lib/i18n.ts)
│   ├── pages/                       Route-level components: Index (landing), Auth, NotFound, PublicMenu,
│   │                                dashboard/{Overview,MenuEditor,QRCode,Analytics,Settings,Billing,
│   │                                PaymentSuccess,PaymentCanceled}
│   └── types/database.ts            Hand-maintained TS interfaces mirroring the Postgres schema
├── supabase/
│   ├── config.toml                  Points at project_id sipxerzltoczbhrybwnn (the ORIGINAL Lovable project)
│   ├── functions/                   6 Edge Functions (Deno): check-subscription, create-checkout,
│   │                                customer-portal, send-contact, send-welcome-email, sync-subscription
│   ├── migrations/                  9 timestamped .sql files (2025-12-23 through 2025-12-27) — see §16
│   └── .temp/                       Supabase CLI local link cache (project-ref, pooler-url, etc.)
├── index.html                       Vite HTML entry
├── package.json                     npm package name still "vite_react_shadcn_ts" (Lovable default, never renamed)
├── components.json                  shadcn/ui CLI config
├── tailwind.config.ts, postcss.config.js
├── vite.config.ts                   Includes `lovable-tagger`'s componentTagger() plugin in dev mode
├── vercel.json                      Single SPA rewrite rule
├── README.md                        Unedited Lovable boilerplate + appended color-palette table
├── TRANSLATION_IMPLEMENTATION.md,
│   DASHBOARD_TRANSLATIONS_SUMMARY.md   Ad-hoc progress notes from a prior translation effort (not a
│                                        formal changelog/roadmap)
├── presentacion.html                A standalone marketing/pitch HTML email template (not wired into the app)
└── verify-translations.sh           Shell script (not inspected in depth) — likely a translation-key linter
```

---

## 16. Database

All tables live in the `public` schema of a Postgres database provisioned by Supabase. RLS is enabled on every table. Reconstructed from the 9 migration files (chronological, `supabase/migrations/*.sql`):

| Table | Purpose | Key columns | RLS summary |
|---|---|---|---|
| `profiles` | 1:1 shadow profile per `auth.users` row | `user_id` (FK, unique), `email`, `full_name`, `avatar_url` | Owner-only SELECT/UPDATE/INSERT (`auth.uid() = user_id`); anon explicitly blocked (tightened in a later migration) |
| `user_roles` | RBAC scaffolding | `user_id` (FK), `role` (`app_role` enum: admin/owner/user), unique `(user_id, role)` | Owner-only SELECT of own roles; no INSERT/UPDATE/DELETE policy exists for any role (rows are only ever created by the `handle_new_user` trigger) |
| `restaurants` | Core tenant entity | `owner_id` (FK), `name`, `slug` (unique), `logo_url`, `address`, `phone`, `currency`, `default_language`, `supported_languages text[]`, `hide_prices`, `theme`, `custom_domain`, `is_published`, `onboarding_completed` **+ undocumented columns `instagram_url`, `website_url`, `template` used in code but absent from migrations** | Owner full access (`owner_id = auth.uid()`); anon SELECT only where `is_published = true` |
| `menus` | Menu groupings per restaurant, with scheduling | `restaurant_id` (FK), `name`, `description`, `is_active`, `schedule_rules jsonb`, `display_order` | Owner full access (via join to `restaurants.owner_id`); anon SELECT only if `is_active` and parent restaurant published |
| `categories` | Groupings within a menu | `menu_id` (FK), `name`, `description`, `display_order`, `is_active` | Owner full access (via join chain); anon SELECT only if active + parent chain published/active |
| `items` | Dishes | `category_id` (FK), `name`, `description`, `price numeric(10,2)`, `photo_url`, `is_active`, `is_featured`, `is_vegetarian`, `is_vegan`, `is_spicy`, `is_gluten_free`, `allergens text[]`, `display_order` | Same pattern as `categories` |
| `category_translations` | Per-language name/description for a category | `category_id` (FK), `language`, `name`, `description`, unique `(category_id, language)` | Owner full access; anon SELECT **restricted to published/active parent chain** (tightened in migration 6 after an initial overly-permissive `USING (true)` policy) |
| `item_translations` | Per-language name/description for an item | `item_id` (FK), `language`, `name`, `description`, unique `(item_id, language)` | Same tightening as above |
| `subscriptions` | Billing state, 1:1 with `restaurants` | `restaurant_id` (FK, unique), `plan` (`plan_type` enum: free/pro_monthly/pro_annual/lifetime), `status` (`subscription_status` enum), `stripe_customer_id`, `stripe_subscription_id`, `is_lifetime`, `current_period_start/end`, `cancel_at_period_end`, `photos_limit`, `languages_limit`, `manual_override` (added in the last migration) | Owner SELECT/UPDATE only; **INSERT and DELETE explicitly blocked for authenticated users** (`WITH CHECK (false)` / `USING (false)`) — only the service-role key (used inside Edge Functions) can create/delete subscription rows |
| `menu_views` | Raw analytics events | `restaurant_id` (FK), `item_id` (nullable FK), `language`, `viewed_at` | Anonymous INSERT allowed (no rate limiting/CAPTCHA — trivially spoofable); owner-only SELECT |
| `storage.objects` (bucket `menu-images`) | Image blobs | path convention `{restaurant_id}/{items|logos}/{timestamp}.webp` | Public SELECT for the whole bucket (final policy state); INSERT/UPDATE/DELETE restricted to the restaurant's owner via folder-name-based ownership check |

**Enums:** `app_role` (admin/owner/user), `plan_type` (free/pro_monthly/pro_annual/lifetime), `subscription_status` (active/canceled/past_due/trialing/incomplete).

**Functions/triggers:** `has_role()` (security-definer role check, unused by app code), `handle_updated_at()` (generic `updated_at` bump trigger, applied to 5 tables), `handle_new_user()` (auto-creates `profiles` + `user_roles('user')` on signup), `generate_unique_slug()` (slugifies + de-duplicates restaurant names).

**Schema drift (repeated for emphasis, see §3):** `restaurants.instagram_url`, `restaurants.website_url`, and `restaurants.template` are read/selected by application code (`types/database.ts`, `PublicMenu.tsx`) but **no migration file creates them**. Either they were added by hand through the Supabase Studio UI on the original Lovable-managed project (`sipxerzltoczbhrybwnn`) and never captured as a migration, or a migration file is missing from this repo. Anyone restoring this schema from the migrations alone would get a Postgres error the first time the app queries these columns.

---

## 17. API

There is no bespoke REST/GraphQL API layer designed by this project — the frontend uses Supabase's auto-generated PostgREST interface (via `supabase-js`, see `src/lib/api.ts` for the full set of query wrapper functions: `fetchRestaurant`, `createRestaurant`, `updateRestaurant`, `fetchMenus`, `createMenu`, `updateMenu`, `deleteMenu`, `fetchCategories`, `createCategory`, `updateCategory`, `deleteCategory`, `updateCategoryOrder`, `fetchItems`, `fetchAllItemsForMenu`, `createItem`, `updateItem`, `deleteItem`, `updateItemOrder`, `duplicateItem`, `fetchSubscription`, `uploadImage`) plus 6 custom Edge Functions, which are the only bespoke "API endpoints" in the traditional sense:

| Endpoint (Edge Function) | Purpose | Request | Response | Auth |
|---|---|---|---|---|
| `create-checkout` | Start a Stripe Checkout session | `{ priceId: string, mode?: 'subscription'|'payment' }` + `Authorization: Bearer <supabase JWT>` | `{ url: string }` (Stripe Checkout URL) | Requires a valid Supabase user JWT (validated via `supabase.auth.getUser(token)`); `verify_jwt = false` at the platform level (auth is done manually inside the function, not by Supabase's gateway) |
| `check-subscription` | Query Stripe for the caller's live subscription status and write it back to `subscriptions` | none (JWT only) | `{ subscribed, plan, is_lifetime, subscription_end?, cancel_at_period_end? }` | Same manual JWT check; uses the **service role key** internally to bypass RLS when updating `subscriptions` |
| `sync-subscription` | Same purpose as `check-subscription`, called specifically right after a successful checkout redirect | none (JWT only) | `{ success, plan, is_lifetime, subscription_end?, cancel_at_period_end? }` | Same pattern |
| `customer-portal` | Create a Stripe Billing Portal session | none (JWT only) | `{ url: string }` | Same pattern |
| `send-contact` | Relay the landing-page contact form to the site owner's inbox | `{ name, email, message }` | `{ success: true }` | None (public, unauthenticated — rate limiting relies only on basic input validation, no CAPTCHA) |
| `send-welcome-email` | Send a branded welcome email after onboarding | `{ email, name, restaurantName?, language? }` | Raw Resend API response passthrough | None (public, called from client right after onboarding) |

**No Stripe webhook endpoint exists.** This is the single most consequential gap in the API surface — see §3 and §20.

All 6 functions share a hand-copied CORS header block (`Access-Control-Allow-Origin: *`) and a `logStep()`-style console logger (duplicated per-function rather than shared via a common module) — a maintenance smell but not a functional bug.

---

## 18. Authentication

- **Provider:** Supabase Auth exclusively.
- **Login methods:** email + password; passwordless magic link (`signInWithOtp`); password reset via email link.
- **OAuth (Google/Facebook/etc.):** **not implemented** — no OAuth provider buttons, no `signInWithOAuth` calls anywhere in `AuthContext.tsx` or `Auth.tsx`.
- **Sessions:** handled entirely by `supabase-js`'s client-side session management (JWT stored by the SDK, refreshed automatically); `AuthContext` subscribes to `onAuthStateChange` and also calls `getSession()` once on mount.
- **Redirect security:** `Auth.tsx` validates the post-login redirect target itself (`from` computed from router location state) to prevent open-redirect attacks — only allows same-origin paths starting with `/` and not `//` or a protocol-like prefix. This is a deliberate, non-default security measure (a positive finding).
- **Permissions / RBAC:** as detailed in §4/§8/§16 — an `app_role`/`user_roles`/`has_role()` scaffold exists in the database but is **not used** by any authorization check in the app; all real access control is via Postgres RLS keyed on `owner_id = auth.uid()` (ownership-based, not role-based).
- **Sign-out:** clears local React state first, then calls `supabase.auth.signOut()`, with a small delay and a post-hoc session-still-exists check logged to the console — a slightly defensive/manual implementation suggesting a past bug with stale sessions after logout (inferred from the code shape, not stated anywhere).

---

## 19. Storage

- **Images:** stored in a single public Supabase Storage bucket, `menu-images`. Two logical sub-folders by convention (not enforced by the DB, just by the upload path string): `{restaurantId}/items/{timestamp}.webp` and `{restaurantId}/logos/{timestamp}.webp`.
- **Client-side processing:** every upload is decoded into an offscreen `<canvas>`, resized (`maxWidth` param, e.g. 800px) and re-encoded to WebP at a configurable quality (0.8–0.9) **before** upload — reduces bandwidth/storage cost, but means original/full-resolution images are never retained.
- **Menus (as documents/PDFs):** not applicable — there is no PDF/document upload feature; the "menu" is entirely structured data (categories/items), not an uploaded file.
- **Uploads:** max 5MB per file (enforced client-side only, not by a Storage-level policy beyond the bucket's `file_size_limit` set at creation), MIME type checked client-side by prefix (`file.type.startsWith('image/')`).
- **CDN:** whatever Supabase Storage provides by default for public buckets; no separate CDN (e.g., Cloudflare, Imgix) is configured.
- **Local vs Cloud:** 100% cloud (Supabase Storage) — no local filesystem storage anywhere (expected, given Vercel's serverless/ephemeral hosting model).

---

## 20. Integrations

- **Stripe:** Checkout (subscription + one-time payment modes), Billing Portal, and manual (non-webhook) status polling. Price IDs are hardcoded in `src/lib/constants.ts` and duplicated inside two Edge Functions' `PLAN_MAPPING` objects — **triplicated** data that must be kept in sync by hand across 3 files if prices ever change. **No `stripe-webhook` Edge Function exists** — this is a load-bearing gap (see §3).
- **Email:** Resend, used for (a) contact-form relay to the business inbox and (b) 3-language welcome emails with an (undelivered/unenforced) "10% discount code" — the email says "Usa este código al suscribirte" and displays the literal word "SACARTA" as if it were a discount code, but no code/coupon system was found wired into Stripe Checkout (`allow_promotion_codes: true` is set on the Checkout session, so a Stripe-side promo code named "SACARTA" *could* exist, but that would live in the Stripe dashboard, not in this repo — cannot be confirmed one way or the other from the code alone).
- **Analytics (product/marketing analytics, e.g. Google Analytics/Plausible/PostHog):** **not implemented.** The only "analytics" in this product is the first-party `menu_views` table described in §6/§16 — there is no third-party web-analytics or product-analytics SDK anywhere in `package.json` or `index.html`.
- **Maps:** not implemented (address is plain text, no embedded map/geocoding).
- **Payments (for diners):** not implemented — diners never pay anything through this app; Stripe is used exclusively for the restaurant owner's SaaS subscription.
- **AI:** none (see §7).
- **Anything else:** none found (no SMS provider, no push notifications, no social-share SDKs beyond plain link copying).

---

## 21. Tech Stack

Generated directly from `package.json` and config files (versions as pinned/ranged in the lockfiles at audit time):

**Core:** React 18.3, TypeScript 5.8, Vite 5.4 (`@vitejs/plugin-react-swc`), React Router DOM 6.30.

**UI:** Tailwind CSS 3.4 (+ `tailwindcss-animate`, `@tailwindcss/typography`), shadcn/ui pattern over Radix UI primitives (`@radix-ui/react-*`, ~25 packages), `lucide-react` icons, `class-variance-authority` + `clsx` + `tailwind-merge` for variant styling, `next-themes` (installed, not wired up — see §13), `sonner` + shadcn `Toast` for notifications (two toast systems present simultaneously), `vaul` (drawer), `embla-carousel-react` (carousel, no confirmed usage found in the audited pages), `cmdk` (command palette, no confirmed usage found in the audited pages), `recharts` (Analytics chart), `qrcode.react` (QR generation), `@dnd-kit/*` (drag-and-drop), `react-day-picker` + `date-fns` (calendar/date utilities, used by `useAnalytics`'s date math), `react-hook-form` + `@hookform/resolvers` + `zod` (installed for forms/validation — not directly observed wired into the audited forms, which mostly use plain `useState`), `input-otp`, `react-resizable-panels`.

**Data/state:** `@supabase/supabase-js` 2.89 (DB/Auth/Storage/Functions client), `@tanstack/react-query` 5.83 (installed, unused — see §14), React Context (Auth/Language/Subscription) for app-level state.

**Backend-as-a-Service:** Supabase (Postgres, Auth, Storage, Edge Functions running on Deno via `supabase.com`'s hosted runtime).

**External APIs:** Stripe (`stripe` npm package, v18, used only inside Edge Functions), Resend (`resend` npm package v2, used inside Edge Functions).

**Build tooling:** ESLint 9 (flat config) + `typescript-eslint`, `postcss` + `autoprefixer`, `bun.lockb` **and** `package-lock.json` both present (ambiguous package manager — evidence the project has been opened with both Bun and npm at different points, a minor inconsistency).

**Dev-only / legacy tooling:** `lovable-tagger` (Vite plugin that tags DOM elements for the Lovable visual editor — active in dev builds via `vite.config.ts`, dead weight now that the project has left Lovable).

**Hosting/Infra:** Vercel (frontend), Supabase Cloud (backend), GitHub (source control, remote `feeerraaan/menu-magic`, HTTPS remote configured with a fine-grained personal access token embedded in the git remote URL for push access — noted here only as an architecture fact, the token value itself is intentionally not reproduced in this document since it is a live credential).

**Language:** TypeScript throughout the frontend and Edge Functions (Deno-flavored TS for the latter); SQL for migrations.

---

## 22. Existing Screens

| Screen | Route | Purpose | Auth required |
|---|---|---|---|
| Landing page | `/` | Marketing, pricing table, contact form, links to sign in/up and to the live demo menu (`/m/sacarta`) | No |
| Auth | `/auth` (supports `?mode=signin\|signup`) | Sign in, sign up, magic link, forgot password — all as different states of one component | No (redirects away if already authenticated) |
| Public Menu | `/m/:slug` | Customer-facing digital menu | No |
| Onboarding Wizard | (no distinct route — rendered inline by `DashboardLayout` when appropriate) | First-run restaurant setup, 3 steps | Yes |
| Dashboard Overview | `/dashboard` | Landing screen after login | Yes |
| Menu Editor | `/dashboard/editor` | Core CMS for menus/categories/items | Yes |
| QR Code | `/dashboard/qr` | Generate/download QR | Yes |
| Analytics | `/dashboard/analytics` | View stats | Yes |
| Settings | `/dashboard/settings` | Restaurant profile/config | Yes |
| Billing | `/dashboard/billing` | Plan management | Yes |
| Payment Success | `/dashboard/billing/success` | Post-checkout confirmation | Yes |
| Payment Canceled | `/dashboard/billing/canceled` | Post-checkout-cancel landing | Yes |
| 404 | `*` (catch-all) | Not-found fallback | No |

No screenshots exist in the repository for any of these — see §28.

---

## 23. Existing Components

**Composite/feature components:**
`DashboardLayout`, `DashboardSidebar` (nav + plan badge + logout), `OnboardingWizard` (3-step form), `MenuScheduleEditor` (day/time rule builder + `isMenuAvailable()` schedule-matching helper, exported and reused by the public menu), `CategoryDialogWithTranslations`, `ItemDialogWithTranslations` (tabbed per-language CRUD dialogs), `PricingCard` (handles both public marketing display and authenticated upgrade-flow display via an `isPublic` prop, with monthly/annual toggle logic), `LanguageSelector` (UI-chrome language switcher), `NavLink` (active-state-aware wrapper around `react-router-dom`'s `Link`), `ProtectedRoute` (auth gate), `ImageUpload` (drag/drop + click upload with client-side WebP compression), `LimitIndicator` and `UpgradeBanner` (plan-limit visualization, 3 visual variants each).

**shadcn/ui primitives (48 files under `src/components/ui/`):** the full standard shadcn catalog — `accordion`, `alert`, `alert-dialog`, `aspect-ratio`, `avatar`, `badge`, `breadcrumb`, `button`, `calendar`, `card`, `carousel`, `chart`, `checkbox`, `collapsible`, `command`, `context-menu`, `dialog`, `drawer`, `dropdown-menu`, `form`, `hover-card`, `input`, `input-otp`, `label`, `loading-spinner` (custom, not stock shadcn), `menubar`, `navigation-menu`, `pagination`, `popover`, `progress`, `radio-group`, `resizable`, `scroll-area`, `select`, `separator`, `sheet`, `sidebar`, `skeleton`, `slider`, `sonner`, `switch`, `table`, `tabs`, `textarea`, `toast`/`toaster`/`use-toast`, `toggle`/`toggle-group`, `tooltip`. Several of these (carousel, command, menubar, navigation-menu, pagination, resizable, table, calendar, input-otp, breadcrumb, context-menu, aspect-ratio) were **not observed being used** in any of the audited pages — standard shadcn scaffolding installed but not yet consumed by product features.

---

## 24. Current Limitations

- **Billing correctness gap:** no Stripe webhook; subscription truth can drift from Stripe's actual state until the user next opens the Billing page (see §3/§7/§20).
- **Schema/migration drift:** three `restaurants` columns used in code are absent from the tracked migrations (see §16).
- **No automated tests** of any kind (unit, integration, e2e) — regressions rely entirely on manual testing.
- **No CI/CD pipeline** — no lint/build/test gate before merges or deploys.
- **Single restaurant per owner, single "location"** — no multi-branch, no team/staff accounts, no admin back-office despite DB scaffolding for roles.
- **`qrCustomization` and `manualSetup` plan-limit flags are defined but not enforced anywhere in the UI** — every plan currently gets the same QR page experience regardless of entitlement.
- **`template` field is fully non-functional** — declared in types and queried, never rendered, no migration backs it.
- **Currency support is inconsistent** — Settings offers `EUR/USD/GBP/MXN`, onboarding offers only `EUR/USD/GBP`, and the public-menu price formatter only recognizes `EUR/GBP` explicitly (falls back to `$` for everything else, including MXN and any currency not in its 3-symbol map).
- **No image lazy-loading or CDN transform pipeline** — every menu photo loads at full uploaded resolution on every page view.
- **`menu_views` analytics can be trivially spoofed** — anonymous INSERT is allowed with no rate-limit, CAPTCHA, or bot filtering, so view counts are not fraud-resistant.
- **Two parallel toast systems** (`sonner` and shadcn's own `Toast`/`useToast`) are both installed and both actively used in different files — inconsistent, though not user-visible as a bug.
- **`next-themes` is installed but wired to nothing** — no working in-app dark-mode toggle for the authenticated dashboard.
- **Package manager ambiguity** — both `bun.lockb` and `package-lock.json` are committed.
- **`README.md` still describes Lovable's workflow**, not the project's actual current (Vercel + independent Supabase) setup — onboarding a new engineer from the README alone would give incorrect instructions.
- **Infrastructure migration incomplete** (operational state, confirmed via project memory + `supabase/config.toml` still pointing at the original Lovable-era Supabase project ref): the live app is still running against the **original Lovable Supabase project**, not the new independent one; Edge Function secrets (`STRIPE_SECRET_KEY`, `RESEND_API_KEY`) have not yet been migrated; DNS for the intended production domain is not yet cut over.

---

## 25. Planned Features

Searched explicitly for TODO/FIXME comments, an issues tracker, a roadmap file, and README mentions of future work.

- **No `TODO`/`FIXME`/`XXX` comments found** anywhere in `src/` or `supabase/` (a repo-wide search turned up none).
- **No GitHub Issues/Projects data is present in this local clone** (issues live on GitHub's servers, not in the git history — cannot be audited from the filesystem alone; if a roadmap exists there, it is outside the scope of what this document can verify).
- **No ROADMAP.md / CHANGELOG.md** exists.
- The only "planned but not implemented" signals are **inferred from unused scaffolding**, not from any explicit planning document:
  - Restaurant "templates" (`template` field wired into types/query but not migrations or rendering) strongly suggests multiple public-menu visual themes were planned.
  - `qrCustomization` and `manualSetup` plan-limit flags suggest a "custom-branded QR code" feature and a concierge "we set up your menu for you" service were both planned as paid-tier differentiators, neither fully built.
  - The `admin`/`user_roles`/`has_role()` scaffolding suggests a back-office/admin panel and/or team accounts were at least considered.
  - `LANGUAGE_NAMES` in `CategoryDialogWithTranslations.tsx` includes `fr`, `de`, `it`, `pt` even though the active `languages` array (`i18n.ts`) only lists `en/es/ca` — suggesting content-translation language coverage was meant to expand beyond the current 3 UI languages.
  - `DASHBOARD_TRANSLATIONS_SUMMARY.md` explicitly flags `MenuEditor.tsx` UI text as "🚧 En Progreso" / "❌ UI text pendiente" — this is the one place in the repo with an explicit, self-declared incomplete-work marker.

---

## 26. Business Model

Entirely reconstructed from `src/lib/constants.ts`, `subscription-limits.ts`, and the Stripe Edge Functions — **no separate business-model document exists.**

Three tiers, Balearic-fauna-themed names:

| Plan (internal id) | Marketing name | Price | Billing mode | Menus | Languages | Photos | Categories | Items | Schedules | Analytics | QR customization | Manual setup |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `free` | Sargantana | €0 | — (no Stripe price) | 1 | 1 | 0 | 5 | 25 | ❌ | ❌ | ❌ | ❌ |
| `pro_monthly` | Ferreret | €8.99/mo (or €79.99/yr as `pro_annual`) | Stripe subscription | 3 (monthly) / 5 (annual) | 2 (monthly) / 3 (annual) | 50 (monthly) / 100 (annual) | 7 (monthly) / 10 (annual) | 50 (monthly) / 100 (annual) | ✅ | ✅ | ✅ (flag only, not enforced in UI) | ❌ |
| `lifetime` | Myotragus | €139.99 one-time | Stripe one-time payment | 10 | "unlimited" (999) | 1000 | 100 | 1000 | ✅ | ✅ | ✅ (flag only) | ✅ (flag only — "we set up your menu manually") |

- **Note on inconsistency:** the marketing copy in `constants.ts` (`PRICING_PLANS`) and the actual enforced limits in `subscription-limits.ts` (`PLAN_LIMITS`) **do not perfectly agree** — e.g., marketing copy for Ferreret says "50 platos"/"100 platos" and the Stripe-sync Edge Functions hardcode `languages: 10` for both monthly and annual Stripe price IDs, while `subscription-limits.ts`'s `PLAN_LIMITS.pro_monthly.languages` says `2`. This means the number a customer is promised at checkout may not always match the number actually enforced in the product, depending on which of the three independent sources of truth (marketing copy, Edge Function `PLAN_MAPPING`, or `subscription-limits.ts`) is consulted by a given code path at a given time.
- **Discounting:** `allow_promotion_codes: true` is enabled on Stripe Checkout sessions, and the welcome email references a "10% welcome discount" — whether an actual Stripe coupon/promotion code exists is a Stripe-dashboard-side fact this audit cannot verify from the repo.
- **Free plan constraints are aggressive** — 0 photos allowed on Free is a strong lever pushing owners toward a paid tier immediately (a text-only menu is of limited practical use for a restaurant).
- **What's actually implemented for monetization:** Stripe Checkout (subscription + one-time), Stripe Customer Portal (self-serve cancel/manage), a manual database override flag (`subscriptions.manual_override`) letting staff grant a plan by hand without any Stripe transaction (useful for comps/manual sales/support, but has no UI — must be set directly in the database).

---

## 27. Competitors

**Not documented anywhere in the repository.** No competitor names, comparison tables, or positioning statements against named competitors were found in any file (README, landing page copy, pitch email, code comments). The landing page's differentiation claims are generic (design quality, multilingual, QR, analytics) rather than comparative.

---

## 28. Screenshots

No screenshots exist in the repository (`public/` contains only `favicon.ico`, `logo.png`, `logo.svg`, `placeholder.svg`, `robots.txt` — no product screenshots). For a complete visual record, the following should be captured (none currently exist):

1. Landing page (`/`) — hero, features grid, pricing table, contact form, footer.
2. Auth screen — sign-in, sign-up, magic-link-sent, and forgot-password states (4 distinct states in one component).
3. Onboarding Wizard — all 3 steps.
4. Dashboard Overview.
5. Menu Editor — collapsed and expanded category view, drag-in-progress state, Category dialog (single-language and multi-language-tabs variants), Item dialog (same), Menu edit dialog with an active schedule and an overlap-conflict warning shown.
6. QR Code page — with a generated QR and the download-format buttons.
7. Analytics page — populated state (bar chart + language breakdown + top items) and empty state.
8. Settings page — full scroll, including the language-limit-reached disabled state.
9. Billing page — Free plan view and an upgraded-plan view (with "Manage subscription" button visible), plus the pricing cards' monthly/annual toggle.
10. Payment Success / Payment Canceled pages.
11. Public Menu (`/m/:slug`) — header with logo, category nav, featured section, a category section, the item-detail modal open, and the language-switcher dropdown open.
12. Public Menu in dark theme (if any demo restaurant currently has `theme='dark'` — otherwise this would need to be set manually since there is no UI to toggle it).
13. Mobile-width captures of all of the above (this is explicitly a mobile-first product).

---

## 29. Overall Evaluation

Ratings are 1–10, based strictly on evidence found in this repository (not on live-usage data, business traction, or anything outside the codebase).

| Dimension | Score | Rationale |
|---|---|---|
| **Product** | 5/10 | The core loop (create menu → publish → QR → view) is genuinely complete and would work for a real restaurant today. But it stops at "digital menu display" — no ordering, no staff accounts, no multi-location, several paid-tier features (custom QR, manual setup) are unenforced/unfulfilled promises. |
| **UX** | 6/10 | Clean, legible, mobile-appropriate public menu; sensible dashboard IA. Dragged down by missing loading states for images, no skeleton loaders, generic empty-state messaging, and some untranslated UI strings mixed into an otherwise localized app. |
| **Design** | 7/10 | Consistent, on-brand visual system (warm terracotta + serif/sans pairing) built cleanly on shadcn/ui; dark mode is styled but not switchable in-app, which undercuts an otherwise polished system. |
| **Code Quality** | 6/10 | Consistent TypeScript typing, sensible hook-based data-access layer, real RLS security iteration visible across migrations (a genuine strength). Held back by dead/unused dependencies (React Query, next-themes, several unused shadcn components), triplicated Stripe price-ID constants, two parallel toast systems, and zero test coverage. |
| **Architecture** | 5/10 | A reasonable, low-ops BaaS architecture (Supabase + Vercel + Stripe + Resend) appropriate for an early SaaS. Materially weakened by the missing Stripe webhook (a correctness-critical gap for a billing system) and by schema drift between the live database and the tracked migrations. |
| **Scalability** | 5/10 | Fine for hundreds/low-thousands of restaurants as-is (Postgres + Supabase scales horizontally without app changes). Would need work before higher scale: per-row `UPDATE` loops for reordering, no caching layer, full-menu refetch on every public page load, unrated/unindexed-in-this-audit query patterns for `menu_views` aggregation done entirely client-side. |
| **Business Potential** | 6/10 | Digital-menu-via-QR is a proven, competitive SaaS category with clear willingness-to-pay; this implementation covers the table stakes (multilingual, scheduling, analytics) reasonably well for a niche/regional entrant, but currently lacks any feature that would differentiate it from established competitors (no AI, no ordering, no POS integration, no multi-location) — see §30. |
| **Maintainability** | 5/10 | Small enough codebase for one person to hold in their head; readable file organization. Undermined by an unedited Lovable README, an ambiguous package manager, no tests/CI to catch regressions, and schema state that isn't fully captured in version control. |
| **AI Integration** | 0/10 | None exists in the product today (see §7). Not a defect relative to this evaluation's scope, but scored 0 because the audit's brief explicitly asks this dimension to be scored, and there is nothing to credit. |

---

## 30. Biggest Opportunity

*This section reflects only what the existing repository already contains — no new product direction is proposed here.*

If I had only ONE month to transform SaCarta into a product people would pay for with confidence, I would focus on **closing the gaps between what is already promised and what is already built**, because the repository shows a product that is closer to done than it looks:

- The **billing correctness gap is the single highest-leverage fix**: a Stripe webhook Edge Function is a small, well-scoped piece of work (the other 5 Edge Functions already show the exact patterns needed — Stripe SDK init, service-role Supabase client, `subscriptions` table writes) and it directly protects revenue and customer trust, which everything else in the business model depends on.
- The **already-monetized-but-unenforced features** (`qrCustomization`, `manualSetup`) represent money customers are already being asked to pay for on the pricing page (§26) without receiving the differentiated experience in return — implementing (or removing) these closes a currently-real gap between marketing promise and delivered product, with the underlying data model already in place.
- The **schema drift** (§3/§16) is a landmine for anyone (including the current owner) who ever needs to restore, replicate, or migrate this database from the tracked migrations alone — capturing the missing `restaurants` columns as a proper migration is cheap insurance against a very expensive future failure, and is directly relevant given the in-flight migration to an independent Supabase project.
- The product's most complete, most polished asset is the **public menu experience itself** — multilingual, scheduled, dietary-aware, already looks like a real product. That asset is currently under-leveraged: the "template" concept it half-implements (§3/§6/§9) is exactly the kind of visible, screenshot-able differentiator that turns a generic QR-menu tool into something an individual restaurant owner shows off to other owners — and the type/column plumbing for it already exists in the code, it simply needs a schema column, 2–3 alternate layouts, and a picker in Settings.

Everything else observed in this audit (tests, CI, admin panel, multi-location, AI) is real, legitimate technical debt — but it is debt a one-month sprint should consciously defer in favor of making the *already-sold* product actually match what it currently claims to be.

---

*End of audit. This document was generated by reading the repository's source code, SQL migrations, Edge Functions, configuration files and git history only. No code was modified in the course of this audit.*
