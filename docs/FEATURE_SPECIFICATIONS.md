# SaCarta AI Feature Specifications

Per-feature spec for all 9 planned AI features. **Phases 1-8 are now built** (Phases 1-4 in the first engagement, Phases 5-8 in the second). Read `AI_ARCHITECTURE.md` first for the shared platform concepts (providers, jobs, credits, RLS) referenced throughout. Where a spec below says "(future — spec only)", that section is now historical design that was implemented as written — see `IMPLEMENTATION_PLAN.md` for the build record.

---

## Phase 1 — AI Description Generator

**Input:** an item (name, existing description if any, category context), a style (`luxury | traditional | modern | casual | fine_dining`), a target locale.
**Output:** a single generated description string.
**UI entry point:** "Generar con IA" button + style selector, next to the description `Textarea` in `src/components/dashboard/ItemDialogWithTranslations.tsx`.
**Edge Function:** `ai-generate-description` (synchronous). JWT + ownership check → credit check → `descriptionAgent.generateDescription()` → returns text (does not write to the DB itself).
**Persistence:** the component fills the existing textarea; the existing Save button persists it via the existing `updateItem`/translation-save path, setting `description_generated_by = 'ai_generated'`.
**Credit cost:** 1 credit per generation.

---

## Phase 2 — AI Translation

**Input:** source text (item or category name/description), source locale, target locale.
**Output:** a single translated string.
**Prompt behavior (non-negotiable):** preserve culinary terminology — a local dish name is explained naturally to a foreign reader, never mechanically transliterated word-for-word (e.g. "fideuà" is described, not garbled).
**UI entry point:** "Traducir con IA" button per language tab in `ItemDialogWithTranslations.tsx` and `CategoryDialogWithTranslations.tsx`, calling the existing `handleTranslationChange(lang, field, text)` setter directly — zero changes to the save/submit logic.
**Edge Function:** `ai-translate` (synchronous).
**Persistence:** existing Save path; sets `generated_by = 'ai_generated'` on the translation row.
**Credit cost:** 1 credit per field translated.

---

## Phase 3 — AI Menu Optimizer

**Input:** the full menu snapshot for a restaurant (categories, items, translations coverage, photo coverage, prices).
**Output:** a score 0-100 plus a breakdown across: balance, price distribution, description quality, missing (uploaded) images, language coverage, category quality, menu length, duplicate items — each with a short explanation of what to improve.
**UI entry point:** new page `src/pages/dashboard/AiOptimizer.tsx`, new sidebar nav entry ("Optimizador IA"). Shows current score, a history trend chart (score over time), and the breakdown with actionable explanations.
**Edge Function:** `ai-optimize-menu` — the first feature to route through the `ai_jobs` async mechanism (see `AI_ARCHITECTURE.md` §4), even though scoring is normally fast enough to finish inline; this is deliberate, to prove the jobs+Realtime plumbing on a read-only feature.
**Persistence:** `ai_menu_scores` (score history) + `ai_jobs.output` (full breakdown for that specific run).
**Credit cost:** 3 credits per run.

---

## Phase 4 — AI Import

**Input:** pasted text or an uploaded PDF (the two implemented source types). Website URLs, Word, Excel, and photo/image imports are explicitly not built — see `IMPLEMENTATION_PLAN.md` §Phase 4's scope note.
**Output:** a full proposed menu tree — categories, dishes, descriptions, prices, allergens, dietary flags, hierarchy — plus (if the restaurant supports more than one language) auto-translated content for every `supported_languages` entry.
**UI entry point:** "Importar con IA" entry point in `src/pages/dashboard/MenuEditor.tsx`'s empty-categories state and the menu-selection bar. Leads to a **review screen** showing the extracted tree, fully editable, before anything is committed — nothing is silently auto-published.
**Edge Function:** `ai-import-start` — async via `ai_jobs` (`job_type='menu_import'`), using `EdgeRuntime.waitUntil()` for anything that risks the execution time budget.
**Pipeline:** `packages/ai/pipelines/importPipeline.ts`: extract raw text/structure from the source → `menuImportAgent.extractMenuStructure()` → validate → `translationAgent.translateText()` per supported language → return the proposed tree for review (bulk insert happens only after the owner confirms, via the existing `createCategory`/`createItem` write paths).
**Credit cost:** 15 credits per import run (flat, regardless of item count — the flagship acquisition feature should have a simple, predictable cost).
**Schema-drift note:** if Import is ever asked to populate `restaurants.website_url`/`instagram_url` from a scraped site, confirm those columns actually exist on the live database first — they appear in `src/types/database.ts` but are absent from the tracked migrations (pre-existing drift, documented in `SACARTA_PROJECT_AUDIT.md` §16). Add a prerequisite `ADD COLUMN IF NOT EXISTS` migration if they don't exist live.

---

## Phase 5 — AI Setup ✅ built

**What it is:** an alternate onboarding path. Today, `src/components/dashboard/OnboardingWizard.tsx` is a 3-step manual flow (name → address/phone → currency/language) that creates the `restaurants`/`subscriptions`/`menus` rows on step 1. AI Setup inserts a fork right after step 1 (once the restaurant row and its `id` exist): "Build my menu manually" (continues to the existing step 2) vs. "Upload your menu — AI will build it" (branches into the same upload UI as AI Import, tagged `job_type='ai_setup'` so it's distinguishable in analytics, but otherwise reusing `importPipeline.ts` entirely). On completion, jumps to the existing `handleFinish()`.
**Data model:** no new tables — reuses `ai_jobs` with a distinct `job_type` value.
**Credit cost:** same as Import (15 credits), since it's the same pipeline.

---

## Phase 6 — AI Restaurant Copilot ✅ built

A chat inside the dashboard where the owner types requests and the AI performs real mutations — not just answers questions. This is the highest-risk feature in the whole roadmap (natural language driving arbitrary database writes), so its design is captured here in full even though it won't be built until a future session.

### Core safety rule

**The LLM never emits row IDs and never writes directly.** It emits a tool call with a fuzzy, human-readable filter (category name, item name, price delta). A deterministic TypeScript resolver — no LLM involved — turns that filter into concrete row IDs scoped to the caller's own `restaurant_id`, computes a before/after preview, and only a user-confirmed preview triggers the actual write (via the same `src/lib/api.ts` functions the rest of the app already uses, e.g. looping `updateItem(id, {price})`).

### Tool set

**Read-only (execute immediately, no confirmation):**
- `search_items({name_contains?, category_name_contains?, price_min?, price_max?, is_vegetarian?, is_vegan?, is_spicy?, is_gluten_free?, is_active?, menu_id?})` — fuzzy lookup, joined `items → categories → menus`, hard-filtered to the caller's restaurant.
- `get_menu_structure()` — menus/categories/counts only, for cheap orientation without dumping the whole menu into the prompt.

**Mutating (always preview-then-confirm, see below):**
- `bulk_adjust_prices({category_name_filter?, item_name_filter?, price_delta_percent?, price_delta_absolute?, round_to?})` — covers "increase all drink prices by 10%".
- `bulk_update_dietary_flags({filter: {category_name_contains?, name_contains?, has_flag?}, set: {is_active?, is_vegan?, is_vegetarian?, is_gluten_free?, is_spicy?, allergens_add?, allergens_remove?}})` — covers "remove spicy dishes" as `set.is_active = false` (see hard rule below).
- `generate_new_items({category_name_or_id, criteria, count?, price_hint?})` — covers "add vegan options"; **always created with `is_active: false`** regardless of what the model proposes, since the model may hallucinate an incorrect dietary claim — the owner must review and publish.
- `create_menu({name, description?, schedule?, copy_items_from_menu_id?, is_active?})` — covers "create a lunch menu".
- `create_category`, `create_item`, `update_item`, `update_category`, `update_menu` — thin wrappers over the existing `api.ts` operations, with fuzzy-name resolution; if a filter resolves ambiguously (2+ candidates), the tool returns a disambiguation result and the agent asks the user rather than guessing.
- `bulk_translate` — a two-stage tool: resolves the target items/categories deterministically, then calls `translationAgent.translateText()` (Phase 2) per item — reuses the Translation feature rather than reimplementing it.

### Hard rule on destructive language

"Remove", "delete", "get rid of" map **by default to soft-hide** (`is_active = false`), never a hard `DELETE`. There is no hard-delete tool in the default tool set. If true permanent deletion is ever wanted, it should be a separate, rarely-exposed tool invoked only on explicit "delete permanently" language, with a visually distinct (red/warning) preview — recommend not shipping this via the Copilot at all; the existing dashboard's own `deleteItem`/`deleteCategory`/`deleteMenu` already cover real deletion needs.

### Preview/confirm gate

Every mutating tool call — no tiered risk levels, no exceptions — produces a structured preview and requires an explicit Confirm/Cancel in the chat UI before anything executes:
```ts
interface MutationPreview {
  preview_id: string; tool_name: string; summary: string; destructive: boolean; affected_count: number;
  changes: Array<{ entity_type: 'item'|'category'|'menu'; entity_id: string; entity_name: string; field: string; before: unknown; after: unknown }>;
  expires_at: string;
}
```
Flow: tool call → resolver computes the diff without writing anything → preview persisted server-side (short-lived, e.g. 15 min) and rendered in chat → **Confirm** re-validates the preview hasn't expired/drifted, performs the writes, logs an audit row, returns a result → **Cancel** writes nothing, marks the preview cancelled, chat continues.

### Audit log (data requirement for the future migration)

Every mutating action — confirmed or not — needs a row capturing: `restaurant_id`, `user_id`, `conversation_id`, `message_id`, `user_request_text` (verbatim), `tool_name`, `raw_llm_tool_input`, `resolved_params`, `preview_payload`, `status` (`previewed|confirmed|cancelled|executed|failed|partially_failed`), `affected_rows` (actual before/after per row, captured at execute time), `confirmed_by`, timestamps. This is separate from the conversational message log — it must survive even if chat history is later pruned, since it's the forensic trail of what the AI actually did.

### Context management

Per-turn injection is a small restaurant summary (name, currency, languages, counts) — **not** a full menu dump, regardless of restaurant size. `search_items`/`get_menu_structure` are how the agent pulls in specifics on demand, the same way a new human employee would ask rather than being handed a full POS export. Conversation history persists server-side (not client-only), keyed by a `conversation_id`, with a sliding window of the last ~20 messages verbatim plus a periodically-refreshed summary of anything older.

**Credit cost:** 2 credits per Copilot turn (message + any tool call).
**Blocking prerequisite — VALIDATED (2026-08-01):** function-calling was tested against the real OpenCode Zen endpoint with the production key before building the Copilot. Result: `deepseek-v4-flash-free` reliably emits `tool_calls` in `tool_choice:'auto'` and chains read-only→mutating calls across turns; `tool_choice:'required'` is rejected (DeepSeek thinking-mode) so the Copilot only uses `auto`; and thinking-mode must be disabled (`thinking:{type:'disabled'}`) because DeepSeek otherwise demands echoing `reasoning_content` on the next turn. Both gotchas are recorded in `IMPLEMENTATION_PLAN.md` §Phase 6.

---

## Phase 7 — AI Business Insights + AI Recommendations ✅ built

**Insights:** narrative, consultant-style text generated on demand from existing `menu_views`/`items`/`ai_menu_scores` data (e.g. "Seafood receives the most attention", "Vegetarian options are underrepresented"). No new persistent content table — the narrative is ephemeral/re-generatable, stored only in `ai_jobs.output` for the run that produced it (job type `business_insights`). Slots into `src/pages/dashboard/Analytics.tsx` alongside the existing charts.
**Recommendations:** discrete, dismissible suggestion cards ("add a photo to Paella", "merge these two near-duplicate items"), each with its own lifecycle (`open|dismissed|actioned`) rather than a jsonb blob, since dismissing one shouldn't require regenerating everything. Needs one new table, `ai_recommendations` (`restaurant_id`, `ai_job_id?`, `category` free-text, `target_type/target_id?`, `title`, `detail`, `status`).
**Credit cost:** 3 credits per Insights refresh; Recommendations are a byproduct of Optimizer/Insights runs, not separately charged.

---

## Phase 8 — AI Customer Assistant ✅ built

A chat on the **public** menu page (`/m/:slug`, anonymous diners). Recommends dishes given constraints like "I am gluten free", "I want something spicy", "I have 20€", "I don't like seafood". **Read-only — must never mutate data**, and must never recommend something that violates a stated hard constraint.

### The core safety decision

**Deterministic pre-filter first, LLM ranks only within the pre-filtered set — never the reverse.** Concretely:
1. One LLM call extracts structured constraints from the diner's free text (`dietary_constraints`, `exclude_allergens`, `max_price`, `exclude_tags`, a free-text mood/craving signal) — this is a parsing task, not safety-critical.
2. A plain code filter (no LLM) applies every hard constraint against the restaurant's already-public menu rows — exclude any item whose `allergens` intersects `exclude_allergens`, enforce `is_gluten_free`/`is_vegan`/etc., enforce `price <= max_price`. Zero LLM involvement in this step.
3. Only the resulting candidate subset is handed to a second LLM call, asked to rank/explain using the mood/craving text.
4. **Server-side validation:** before responding, confirm every item ID the model's answer references is actually in the pre-filtered candidate set; drop anything that isn't (hallucination safety net).

This makes an allergen-unsafe or dietary-violating recommendation structurally impossible — the model's only latitude is ranking and phrasing, never which items are eligible at all. This matters because allergen mistakes are a real liability issue for a restaurant, not just a UX nicety.

### Tool set
- `search_menu_items({dietary_constraints?, exclude_allergens?, max_price?, exclude_tags?, mood_or_craving_text?})` — the only tool.

### Anonymous rate-limiting

No auth wall, real LLM cost per message. A client-held session token (minted on first message) plus a salted IP hash, checked in the Edge Function **before** calling the LLM at all:
- Per `(restaurant_id, session_token)`: e.g. max 20 messages/hour.
- Per `(restaurant_id, ip_hash)`: caps new-session creation and total messages, to defend against session-token cycling.
- Per-restaurant daily cap, tied to the owner's plan tier (a lever, not a hard number decided yet).
On any limit hit: return a friendly "busy right now" response without ever calling the provider.

**Data model requirement:** an append-only `anon_chat_events (id, restaurant_id, session_token, ip_hash, created_at)` table with composite indexes on `(restaurant_id, session_token, created_at)` and `(restaurant_id, ip_hash, created_at)`, doubling as usage analytics; periodic cleanup of rows older than the rate-limit window.
**Gating:** boolean plan flag (`aiCustomerAssistantEnabled`), not credit-metered against the owner's pool — its cost is driven by diner traffic volume, not the owner's own actions, so charging it against `aiCreditsPerMonth` would be a confusing mental model.

---

## Credit costs (unified pool — see `AI_ARCHITECTURE.md` §7)

| Operation | Credits | Phase |
|---|---|---|
| Description generation (1 item) | 1 | 1 |
| Translation (1 field) | 1 | 2 |
| Menu Optimizer run | 3 | 3 |
| Menu Import (per run) | 15 | 4 |
| AI Setup (per run, reuses Import) | 15 | 5 |
| Copilot message (1 turn) | 2 | 6 |
| Business Insights refresh | 3 | 7 |

Per-tier monthly pool: `free: 100`, `pro_monthly: 300`, `pro_annual: 500`, `lifetime: 1000`. (Free was raised from 20 → 100 on 2026-08-01 so a free owner can complete one full import (15 cr) plus testing; see the credit-costs table.)
