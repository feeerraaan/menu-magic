# 📋 AUDITORÍA COMPLETA — SaCarta (Hackathon Review)

**Fecha:** Wed Aug 05 2026
**Repo:** `github.com/feeerraaan/menu-magic` (carpeta local: `/root/menu-magic`)
**Rama activa:** `main` (clean, up to date con origin/main) · **255 commits**
**Producto:** **SaCarta** — SaaS de cartas digitales con QR + capa IA, "Nacido en Mallorca, recién horneado".
**Dominio demo:** `https://sacarta.azpy.es`
**Supabase project ref:** `dtmnomjbfziwfwheqcfx`

> Auditoría de sólo lectura. No se modificó ningún archivo del proyecto.

---

## 🧭 Resumen Ejecutivo (TL;DR)

SaCarta es un MVP **hackathon-grade funcional y deployado**. Nació como un boilerplate Lovable (`menu-magic`) y se ha transformado en un producto **AI-first** maduro siguiendo el plan `sacarta-v2-ai-velvety-sloth.md` (ejecutado al completo).

- **8 features de IA** implementadas y verificadas E2E (Description, Translation, Optimizer, Import, AI Setup, Copilot, Insights+Recs, Customer Assistant).
- **Backend híbrido**: Vercel Node serverless (imports largos, 300s, client-driven steps) + Supabase Edge Functions (Deno) para el resto.
- **Capa IA compartida** en `packages/ai/` (TS plano, consumida por Vite y Deno) con boundary ESLint (`no-restricted-imports`).
- **Proveedor LLM único**: OpenCode Zen con **key rotation** y fallback chain (free → paid Go gateway).
- **DB Postgres** con 17 migraciones, 21 tablas, **RLS en todas**, funciones SECURITY DEFINER para admin.
- **Stripe billing** (3 planes) + Resend (email) + Supabase Storage (imágenes).
- **i18n** es/en/ca.
- **Backoffice superadmin** recién añadido (RPCs + cupones Stripe).
- **Build verde**: `tsc --noEmit` OK, `vite build` OK (dist 2.2 MB), lint 40 problemas (no bloqueantes).

### ⚠ Riesgos y debilidades clave (para revisión Hackathon)
1. **Sin Stripe webhook** → drift de entitlement posible si el usuario no vuelve a Billing.
2. **Schema drift parcial**: `instagram_url` / `website_url` / `template` en `src/types/database.ts:9,10,16` pero NO están en migrations (viven en live DB heredada de Lovable).
3. **README sigue siendo boilerplate Lovable** → no está listo para jurado/presentación pública.
4. **Sin tests, sin CI/CD, sin observabilidad** (Sentry/LogRocket).
5. **i18n dual**: `src/lib/i18n.ts` (simple, 7 langs definidos / 3 activos) coexiste con `useTranslation` + `locales/*.json` (rico). MenuEditor parcial (~15/96), Overview/PaymentSuccess/PaymentCanceled pendientes.
6. **40 issues de lint** (`no-explicit-any`) concentrados en `PublicMenu.tsx` y `MenuEditor.tsx` (no bloqueantes).
7. `presentacion.html` es un **email marketing**, no un deck de pitch al jurado.

### ✅ Veredicto Hackathon
**APTO** como entrega. Cumple un "scope" impresionante: AI-first, backend híbrido bcrypt-grade con modelo de créditos, RLS completa, backoffice, billing, i18n y deploy en producción. Para pulir antes del pitch: arreglar los 7 puntos de Riesgos. **Lo más urgente: webhook de Stripe + capturar schema drift + reescribir README.**

---

## 1. 🗂 Estructura general del proyecto

```
menu-magic/                                  # raíz (SaCarta codebase)
├── api/                                     #   2 serverless Vercel (Node, ESM, 857 LOC)
│   ├── ai-import-start.ts                   #   POST /api/ai-import-start  (558 LOC)
│   └── ai-import-step.ts                    #   POST /api/ai-import-step   (299 LOC)
├── packages/ai/                             #   Capa AI compartida (32 files, 3.630 LOC)
│   ├── schemas/                             #   7 schemas zod (boundary público)
│   ├── providers/{types,openaiCompatible,opencodeZen,registry}.ts
│   ├── prompts/                             #   7 prompts
│   ├── agents/                               #   7 agentes
│   ├── pipelines/{optimizer,import,insights}Pipeline.ts
│   ├── tools/{definitions,resolver,executor}.ts
│   └── README.md
├── supabase/
│   ├── migrations/                          #   17 SQL (1.276 LOC)
│   └── functions/                           #   14 Deno Edge Functions (2.307 LOC)
│       ├── _shared/{cors,aiAuth,aiCredits}.ts
│       ├── create-checkout / customer-portal / check-subscription / sync-subscription
│       ├── send-welcome-email / send-contact
│       ├── admin-coupons
│       └── ai-generate-description / ai-translate / ai-optimize-menu
│           / ai-import-start / ai-copilot / ai-insights / ai-customer-assistant
├── docs/                                     #   5 docs de diseño (AI_*)
│   ├── AI_ARCHITECTURE.md / IMPLEMENTATION_PLAN.md
│   ├── ROADMAP.md / VISION.md / FEATURE_SPECIFICATIONS.md
├── public/                                   #   robots.txt, favicon, logo.png|svg, placeholder.svg
├── src/                                      #   SPA Vite/React/TS (113 files, 16.656 LOC)
│   ├── main.tsx / App.tsx / App.css / index.css / vite-env.d.ts
│   ├── contexts/        AuthContext · LanguageContext · SubscriptionContext
│   ├── types/database.ts
│   ├── integrations/supabase/{client.ts,types.ts}
│   ├── lib/             api.ts · ai-api.ts · admin-api.ts · i18n.ts
│   │                    subscription-limits.ts · constants.ts · utils.ts
│   ├── hooks/           15 hooks (auth, analytics, AI, plan, restaurant, admin, i18n…)
│   ├── components/
│   │   ├── ui/                                #   ~50 primitivos shadcn
│   │   ├── dashboard/                         #   8 + admin/1 (OnboardingWizard, AiImportDialog,
│   │   │                                       MenuScheduleEditor, AiCreditsCard, dialogs…)
│   │   ├── public/CustomerAssistantWidget.tsx
│   │   └── subscription/{Upgrade,Limits,index}
│   ├── pages/
│   │   ├── Index.tsx · Auth.tsx · NotFound.tsx · PublicMenu.tsx
│   │   └── dashboard/     Overview · MenuEditor · QRCode · Analytics
│   │                       AiOptimizer · AiCopilot · Settings · Billing
│   │                       PaymentSuccess · PaymentCanceled · Admin
│   └── locales/          es.json · en.json · ca.json (+README + STATUS)
├── dist/                                     #   build presente (Aug 5 13:28, 2.2 MB)
├── README.md (⚠ Lovable boilerplate sin editar)
├── SACARTA_PROJECT_AUDIT.md (670 LOC — auditoría estática previa)
├── DASHBOARD_TRANSLATIONS_SUMMARY.md / TRANSLATION_IMPLEMENTATION.md
├── presentacion.html                          #   email HTML marketing (no deck)
├── .mcp.json (MCP Supabase) · .env / .env.local
└── confs: vite / tailwind / tsconfig / eslint / vercel / components / postcss
```

**Métricas de código:**

| Carácter                                | Archivos | LOC aprox |
|-----------------------------------------|---------:|----------:|
| `src/**/*.{ts,tsx}`                      | 113      | 16.656    |
| `api/*.ts`                               | 2        | 857       |
| `packages/ai/**/*.ts`                    | 32       | 3.630     |
| `supabase/functions/**/*.ts`             | 14       | 2.307     |
| `supabase/migrations/*.sql`              | 17       | 1.276     |
| `src/locales/*.json`                     | 3        | 1.293     |
| **Total codebase (sin dist)**            | **~161** | **~24.750** |

---

## 2. 🧱 Stack técnico y dependencias

**`package.json`** (`name: vite_react_shadcn_ts`, `version: 0.0.0`, `type: module`).

| Bloque | Libs clave |
|---|---|
| **Frontend** | React 18.3.1 · react-dom · react-router-dom 6.30.1 · @tanstack/react-query 5.83 · Vite 5.4.19 · @vitejs/plugin-react-swc · TypeScript 5.8.3 |
| **UI** | shadcn/ui (Radix ~28 primitivos) · Tailwind 3.4.17 · tailwindcss-animate · lucide-react · class-variance-authority · clsx · tailwind-merge · cmdk · vaul · sonner · embla-carousel-react · recharts 2.15 · react-day-picker |
| **Forms/data** | react-hook-form 7.61 · @hookform/resolvers · zod 3.25 · date-fns 3.6 |
| **QR / imágenes** | qrcode.react 4.2 · react-easy-crop 6.2 · react-resizable-panels |
| **Backend** | @supabase/supabase-js 2.89 · @vercel/functions 3.7.6 · @firecrawl/pdf-inspector 1.12 (parser Rust) · unpdf 0.11 (fallback) |
| **DnD** | @dnd-kit/{core 6.3, sortable 10, utilities 3.2} |
| **Lint** | eslint 9.32 · typescript-eslint 8.38 · eslint-plugin-react-hooks/react-refresh · lovable-tagger (todavía devDep) |
| **Scripts** | `dev` (vite, port 8080) · `build` · `build:dev` · `lint` (eslint .) · `preview` · **❌ no hay `test` ni `typecheck`** |

**Configuración destacada:**
- `vite.config.ts:7-20` — host `::`, puerto 8080, `componentTagger` (dev only), aliases **`@`=`./src`**, **`@ai`=`./packages/ai/schemas`** (boundary estricto).
- `vercel.json` — 2 functions (`api/ai-import-*`) con `maxDuration: 300`; rewrite SPA `/(.*)` → `/index.html`.
- `tsconfig.json`: `strict:false`, `noImplicitAny:false`, `strictNullChecks:false`, `noUnusedLocals/Parameters:false`, `allowJs:true`, `skipLibCheck:true`. `tsconfig.app.json` añade target ES2020, paths `@/*` y `@ai/*`.
- `tailwind.config.ts` — `darkMode: class`, paleta CSS vars HSL, `fontFamily.display=Playfair Display`, `sans=Inter`, colores brand (primary/secondary/accent/destructive/success/warning/sidebar), keyframes `accordion`, `fade-in`, `slide-in`, `scale-in`, spacing `safe-bottom/top` (notch), plugin `tailwindcss-animate`.
- `eslint.config.js` — **regla crítica `no-restricted-imports`** bloquea `src/**` de importar `packages/ai/{providers,agents,tools,pipelines}/**` (mecanismo de boundary real, error de lint). `@typescript-eslint/no-unused-vars: off`.
- `components.json` — shadcn `style: default`, `rsc: false`, `tsx: true`, baseColor slate, cssVariables true, aliases `@/`.
- `.mcp.json` — MCP `supabase` (project_ref `dtmnomjbfziwfwheqcfx`).

---

## 3. 🧩 Funcionalidades / Features

### Rutas (`src/App.tsx:36-58`) — BrowserRouter + React Query + 3 providers

| Ruta | Componente | Estado |
|---|---|---|
| `/` | `Index.tsx` | Landing (hero, features, pricing, footer) |
| `/auth` | `Auth.tsx` | Sign in/up, magic link, reset password |
| `/m/:slug` | `PublicMenu.tsx` | **Menú público anónimo** · idioma · dietary badges · modal ítem · scroll-spy · widget IA cliente |
| `/dashboard` | `DashboardLayout` (sidebar siempre abierto, logo → dashboard) | Protegido |
| `/dashboard` (index) | `Overview.tsx` | Resumen métricas |
| `/dashboard/editor` | `MenuEditor.tsx` | CRUD multi-menu/categoría/ítem + drag&drop + AiImportDialog + traducciones tabbed |
| `/dashboard/qr` | `QRCode.tsx` | Genera QR PNG/SVG/PDF, **logo embebido** (free=SaCarta, paid=brand/restaurante) |
| `/dashboard/analytics` | `Analytics.tsx` | Views totales/hoy/7d · chart · top ítems · **sección Insights IA + Recomendaciones** |
| `/dashboard/ai-optimizer` | `AiOptimizer.tsx` | Score 0-100 · breakdown · historial (`ai_menu_scores`) |
| `/dashboard/ai-copilot` | `AiCopilot.tsx` | Chat con confirm-preview cards · conversaciones |
| `/dashboard/settings` | `Settings.tsx` | Config restaurante, moneda, idiomas, plantilla, tema, visibilidad |
| `/dashboard/billing` | `Billing.tsx` | Plan, límites, créditos IA, portal Stripe |
| `/dashboard/billing/success` | `PaymentSuccess.tsx` | |
| `/dashboard/billing/canceled` | `PaymentCanceled.tsx` | |
| `/dashboard/admin` | `Admin.tsx` | **Backoffice superadmin** (gated `useIsAdmin`): usuarios, restaurantes, cupones |
| `*` | `NotFound.tsx` | 404 |

### Features principales

- **Auth**: magic link + email/password + reset (Supabase Auth).
- **Onboarding 3 pasos** (`OnboardingWizard.tsx`) con **fork AI Setup**: "Subir mi menú — la IA lo monta" (`jobType: 'ai_setup'`).
- **CRUD menús**: multi-menu con scheduling día/hora + detección de overlaps; categorías; ítems con drag&drop (`@dnd-kit`); flags dietary (vegano/vegetariano/picante/gluten-free); alérgenos; foto con **compresión client-side** + **crop cuadrado** (commits `75a73d6`, `80b5061`); `is_featured`.
- **Traducciones** multi-idioma por ítem/categoría (UI tabbed, tab "filled" borde verde).
- **QR**: `qrcode.react`, descarga PNG/SVG/PDF, **logo embebido centro** (free=SaCarta, paid=brand propio).
- **Analytics**: vistas totales/hoy/7d, top-5 ítems, breakdown por idioma (de `menu_views`, client-side); sección **Insights IA + recommendation cards** (dismiss/action lifecycle).
- **Stripe billing**: 2 planes recurring (Ferreret mensual/anual) + lifetime (Myotragus, setup manual). Checkout + Customer Portal. **❌ NO webhook** (ver §5).
- **Plan limits**: `subscription-limits.ts` es la fuente única de verdad (de-duplicado tras refactor), `aiCreditsPerMonth` = unified pool. `UpgradeBanner` / `LimitIndicator` en toda la UI.
- **i18n**: ver §7.
- **AI layer** (8 features, ver §5).
- **Backoffice superadmin**: `useIsAdmin` (rol `admin` via `user_roles`), RPCs `admin_list_users`, `admin_update_restaurant`, `admin_update_subscription` (con `manual_override`), `admin_get_restaurant`, `admin_list_menus`, admin CRUD menús, **cupones Stripe** (`admin-coupons`).
- **Customer Assistant widget** público en `PublicMenu.tsx` footer (`CustomerAssistantWidget.tsx`): chat anónimo con session token localStorage + tarjetas de recomendación.

---

## 4. 🛠 Backend / API

### 4a. Vercel serverless (`api/`, Node, ESM)

- **`POST /api/ai-import-start`** (`api/ai-import-start.ts:505`)
  Valida JWT Bearer, verifica owner del restaurante, check créditos (15) contra `get_ai_credits_used_this_period` + límite por plan.
  Extrae texto PDF (`@firecrawl/pdf-inspector` → fallback `unpdf`) o texto plano (max 20.000 chars). Crea `ai_jobs` (`status: processing`, `input` con raw source). `maxDuration: 300`.

- **`POST /api/ai-import-step`** (`api/ai-import-step.ts:250`)
  Ejecuta **exactamente un paso** (prepare / un chunk extract / un idioma traducir). El frontend drive el loop → sin límite de duración, sin self-invocation, sin 508 Vercel. `STEP_BUDGET_MS: 280_000`.
  Schema-repair (2 retries) + fallback chain (paid GO `AI_IMPORT_GO_*` → free Zen `deepseek-v4-flash-free` → `mimo-v2.5-free`). Chunk 2.500 chars, overlap 350.

  Funciones puras exportadas: `buildEndpoints`, `buildExtractionPrompt`, `buildMenuBatchTranslationPrompt`, `splitText`, `mergeExtractions`, `callStructured`, `withFallback`, `sourceText`, schemas zod `extractionSchema` / `translationSchema`.

### 4b. Supabase Edge Functions (`supabase/functions/`, Deno, 14)

| Función | LOC | Rol |
|---|---:|---|
| `create-checkout` | 117 | Stripe Checkout session |
| `check-subscription` | 259 | Sincroniza estado Stripe → `subscriptions` (soporta `manual_override`) |
| `sync-subscription` | 267 | Idem, distinto trigger |
| `customer-portal` | 82 | Stripe Billing Portal |
| `send-welcome-email` | 230 | Resend |
| `send-contact` | 136 | Form contacto → Resend |
| `admin-coupons` | 101 | Crea/lista/desactiva Stripe promotion codes (gated `has_role('admin')`) |
| `ai-generate-description` | 102 | Phase 1 (1 crédito) |
| `ai-translate` | 62 | Phase 2 (1 crédito) |
| `ai-optimize-menu` | 97 | Phase 3 — async job (3 créditos) |
| `ai-import-start` | 138 | Phase 4 — `EdgeRuntime.waitUntil` (fallback sync, 15 créditos) |
| `ai-copilot` | 334 | Phase 6 — multi-turn tool-calling, preview/confirm, 6 actions (2 cr/turn) |
| `ai-insights` | 127 | Phase 7 — narrative + recommendation cards (3 créditos) |
| `ai-customer-assistant` | 255 | Phase 8 — **anon**, rate-limit pre-LLM, pre-filter determinista, validación hallucination server-side (plan-gated, no credit-metered) |
| `_shared/{cors,aiAuth,aiCredits}.ts` | — | helpers compartidos |

`supabase/config.toml`: `project_id="dtmnomjbfziwfwheqcfx"`, todas las functions con `verify_jwt = false` (verifican manualmente Ctrl).

### 4c. Base de datos (Supabase Postgres, 17 migrations, 1.276 LOC)

**Enums**: `app_role('admin','owner','user')` · `plan_type('free','pro_monthly','pro_annual','lifetime')` · `subscription_status` · `ai_job_type('menu_optimizer_run','menu_import','ai_setup','business_insights')` · `ai_job_status` · `ai_usage_kind('description','translation','optimizer_run','import','copilot','insights')` · `ai_content_type('description','translation')` · `ai_content_target('item','category')` · `ai_content_status` · `content_origin('human','ai_generated','ai_edited')`.

**Tablas** (columnas principales · RLS):

| Tabla | Columnas principales | RLS |
|---|---|---|
| `profiles` | id, user_id, email, full_name, avatar_url | owner SELECT/INSERT/UPDATE |
| `user_roles` | user_id, role | owner SELECT; `has_role(_user,_role)` SECURITY DEFINER |
| `restaurants` | id, owner_id, name, **slug unique**, logo_url, address, phone, currency, default_language, supported_languages TEXT[], hide_prices, theme, custom_domain, is_published, onboarding_completed | owner FOR ALL + anon SELECT published by slug |
| `menus` | id, restaurant_id, name, description, is_active, schedule_rules JSONB, display_order | owner FOR ALL + anon SELECT active/published |
| `categories` | id, menu_id, name, description, display_order, is_active | owner + anon vía join chain |
| `items` | id, category_id, name, description, price DECIMAL(10,2), photo_url, is_active, is_featured, is_vegetarian/_vegan/_spicy/_gluten_free, allergens TEXT[], display_order, **description_generated_by content_origin** | owner + anon published |
| `category_translations` | id, category_id, language, name, description, **generated_by content_origin** (UNIQUE category+lang) | owner FOR ALL + anon SELECT true |
| `item_translations` | id, item_id, language, name, description, **generated_by content_origin** (UNIQUE item+lang) | owner + anon |
| `subscriptions` | id, restaurant_id UNIQUE, plan, status, stripe_customer_id, stripe_subscription_id, is_lifetime, current_period_start/end, cancel_at_period_end, photos_limit, languages_limit, **manual_override** | owner SELECT/UPDATE; INSERT/DELETE bloqueados (`WITH CHECK (false)`) — service-role only |
| `menu_views` | id, restaurant_id, item_id, language, viewed_at | anon INSERT; owner SELECT |
| `ai_jobs` | id, restaurant_id, created_by, job_type, status, input JSONB, output JSONB, error, progress, ai_credits_charged, started/completed_at | owner SELECT+INSERT; UPDATE/DELETE bloqueados; **en `supabase_realtime`** |
| `ai_usage` | id, restaurant_id, kind, credits_charged, ai_job_id, metadata, created_at | owner SELECT only; service-role writes |
| `ai_menu_scores` | id, restaurant_id, ai_job_id, score 0-100, breakdown JSONB | owner SELECT only |
| `ai_generated_content` | id, restaurant_id, ai_job_id, content_type, target_type, target_id, language, style, content, status | owner FOR ALL (accept/reject) |
| `ai_copilot_conversations` | id, restaurant_id, title, status, created/updated_at | owner SELECT+INSERT; UPDATE/DELETE block |
| `ai_copilot_messages` | id, conversation_id, role('user'/'assistant'/'system'/'tool'), content | owner SELECT only |
| `ai_copilot_actions` | id, restaurant_id, user_id, conversation_id, message_id, user_request_text, tool_name, raw_llm_tool_input, resolved_params, preview_payload, status('previewed'/'confirmed'/'cancelled'/'executed'/'failed'/'partially_failed'), affected_rows, confirmed_by, expires_at | owner SELECT; no client writes — **audit trail forense** |
| `ai_recommendations` | id, restaurant_id, ai_job_id, category, target_type('item'/'category'/'menu'/'restaurant'), target_id, title, detail, status('open'/'dismissed'/'actioned') | owner SELECT + UPDATE (dismiss/action); INSERT service-role only |
| `anon_chat_events` | id, restaurant_id, session_token, ip_hash, created_at | **RLS: ninguna política** (denied by default); service-role writes. Indexes `(restaurant_id, session_token, created_at)` + `(restaurant_id, ip_hash, created_at)` |

**Funciones SQL SECURITY DEFINER**: `has_role` · `handle_updated_at` (trigger) · `handle_new_user` (auto profile+role al signup) · `generate_unique_slug` · `get_ai_credits_used_this_period(_restaurant_id)` · `handle_new_restaurant_subscription` (trigger AFTER INSERT restaurants → free sub; backfill incluido) · `admin_list_users` · `admin_update_restaurant` · `admin_update_subscription` · `admin_get_restaurant` · `admin_update_restaurant_config` · `admin_list_menus` · `admin_create_menu` · `admin_update_menu` · `admin_delete_menu` · `admin_get_menu_details`.

**Triggers**: `set_*_updated_at` en todas las tablas con `updated_at`; `on_auth_user_created` → `handle_new_user`; `trg_new_restaurant_subscription` → free sub.

**Storage**: bucket `menu-images` (public, 5MB, JPEG/PNG/WebP) — storage policies fortified 3× (migrations `20251223190339`, `20251223191851`, `20251224154453`).

---

## 5. 🤖 AI / Integraciones

**Proveedor LLM**: **OpenCode Zen** (`https://opencode.ai/zen/v1/chat/completions`, OpenAI-compatible, Bearer). Implementado en `packages/ai/providers/opencodeZen.ts` con **key rotation** (env `OPENCODE_ZEN_API_KEYS` comma-separated, round-robin, retry 429/balance). `registry.ts` resuelve modelo por feature (`AI_MODEL_DESCRIPTION`, `..._TRANSLATION`, `..._OPTIMIZER`, `..._MENU_IMPORT`, `..._COPILOT`, default `deepseek-v4-flash-free`).

Modelos observados en uso: `deepseek-v4-flash-free`, `mimo-v2.5-free`, `ling-3.0-flash-free` (dropped), `deepseek-v4-flash`/`deepseek-v4-pro` (paid GO gateway `AI_IMPORT_GO_*`).

**Sin SDK OpenAI directo** — el provider es un wrapper sobre `fetch` (`openaiCompatible.ts`, 403 LOC): streaming SSE, schema-repair (re-llama con output inválido + error), 3× retry en `generateStructured` para mitigar flakiness de modelos free, function-calling (`LLMToolDefinition` / `tool_calls`, formato `type:'function' + function:{...}` — DeepSeek rechaza compact), `thinking:{type:'disabled'}` (DeepSeek thinking-mode no soporta `tool_choice:'required'`).

### 8 features IA (todas build + E2E verified 2026-08-01/05)

| # | Feature | Endpoint | Coste | Notas |
|---|---|---|---:|---|
| 1 | **Description Generator** | `ai-generate-description` | 1 cr | style selector (luxury/traditional/modern/casual/fine_dining) en `ItemDialogWithTranslations` |
| 2 | **Translation** | `ai-translate` | 1 cr | "Traducir con IA" por tab idioma |
| 3 | **Menu Optimizer** | `ai-optimize-menu` | 3 cr | async job (`ai_jobs` + Realtime), score 0-100, breakdown, historial |
| 4 | **AI Import** | `ai-import-start` + pipeline | 15 cr | Vercel backend en prod (`VITE_AI_IMPORT_BACKEND=vercel`). Solo text + PDF. Schema-repair + multi-model fallback |
| 5 | **AI Setup** | (fork onboarding) | 15 cr | `job_type='ai_setup'` |
| 6 | **AI Copilot** | `ai-copilot` | 2 cr/turn | 12 tools (2 read-only + 10 mutating), resolver→preview→confirm gate, audit `ai_copilot_actions`, "delete" → soft-hide (`is_active=false`), no hard-delete |
| 7 | **Business Insights + Recs** | `ai-insights` | 3 cr | narrative en `ai_jobs.output`, recommendation cards con lifecycle |
| 8 | **Customer Assistant** | `ai-customer-assistant` | plan-gated (no credit) | anon, deterministic pre-filter first (allergens/diet/price enforced en código), LLM solo rankea, validación hallucination server-side, rate-limit session 20/h + IP 60/h + daily cap plan |

**Stripe** (pagos): plans `pro_monthly` (price_1SikkX…), `pro_annual` (price_1Sikkr…), `lifetime` (price_1Sikn6…). Edge Functions via `esm.sh/stripe@18.5.0`. **❌ NO webhook** — sync via `check-subscription` / `sync-subscription` triggered client-side on tab focus/page load. ⚠ debilidad señalada en audit previo y no corregida.

**Email**: **Resend** (`esm.sh/resend@2.0.0`) en `send-welcome-email` y `send-contact`.

**PDF**: `@firecrawl/pdf-inspector` (napi-rs Rust, prebuilt Linux x64/arm64 glibc para Vercel) → fallback `unpdf` (pdf.js edge-safe). Rechaza PDFs escaneados sin text layer.

**Exclusiones deliberadas**: NO embeddings, NO vector DB, NO OpenAI/Anthropic/Gemini SDKs, NO AI Image Gen (por honestidad al comensal — ver `docs/VISION.md`).

### Env vars (nombres, sin secretos)

`/root/menu-magic/.env` (3 líneas): `VITE_SUPABASE_PROJECT_ID`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.
`/root/menu-magic/.env.local` (Vercel CLI): `VERCEL_OIDC_TOKEN`.

**`VITE_*` referenciados en código**: `VITE_AI_IMPORT_BACKEND` (vercel|edge, default prod=vercel), `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_URL`.

**Backend / Vercel / Supabase / Deno vars** (NO en .env, deben setearse en dashboards): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `OPENCODE_ZEN_API_KEYS`, `AI_MODEL_DEFAULT`, `AI_MODEL_DESCRIPTION`/`TRANSLATION`/`OPTIMIZER`/`MENU_IMPORT`/`COPILOT`, `AI_IMPORT_GO_BASE_URL`, `AI_IMPORT_GO_KEY`, `AI_IMPORT_GO_MODEL`, `AI_IMPORT_GO_FALLBACK_MODEL`, `RESEND_API_KEY`, Stripe key.

---

## 6. 🔐 Autenticación y seguridad

- **Supabase Auth** (`AuthContext.tsx`): `onAuthStateChange` + `getSession`, magic link (`signInWithOtp`) + email/password (`signInWithPassword`) + `signUp` + `resetPasswordForEmail`. redirect `/dashboard`.
- **ProtectedRoute** (`src/components/ProtectedRoute.tsx`): si `loading` → `LoadingPage`; si no user → `Navigate to="/auth"` con `state.from`.
- **Trigger `handle_new_user`** (SQL SECURITY DEFINER): crea `profiles` + `user_roles('user')` tras signup.
- **Roles**: enum `app_role`, tabla `user_roles`, `has_role(_user,_role)` SECURITY DEFINER STABLE. `useIsAdmin` lee `user_roles` propios (RLS allow). Backoffice gating server-side via `has_role(auth.uid(),'admin')` en cada RPC.
- **RLS habilitada en TODAS las tablas**. Patrón owner-join: `EXISTS (SELECT 1 FROM restaurants WHERE id=restaurant_id AND owner_id=auth.uid())`. Tablas "service-role only" (`subscriptions` INSERT/DELETE, `ai_jobs` UPDATE, `ai_usage`, `ai_menu_scores`, `ai_copilot_messages/actions`, `ai_recommendations` INSERT, `anon_chat_events`) → `WITH CHECK (false)` explícito. Traducciones públicas SELECT true.
- **Edge Functions**: `verify_jwt = false` en config.toml pero **todas hacen manual JWT check** (`_shared/aiAuth.ts` `authenticate()`) + ownership check + credit check. Patrón: anon key + caller's forwarded JWT por defecto (doble RLS); service-role solo para writes bloqueados por RLS.
- **Customer Assistant**: rate-limit pre-LLM (session/IP/plan), IP hash salado vía Web Crypto (raw IP nunca almacenado).
- **⚠ Debilidad conocida**: no Stripe webhook → posible drift de entitlement si el usuario no vuelve a Billing.
- **Storage**: bucket `menu-images` 5MB client-side, MIME allowlist; storage policies reforzadas 3×.
- **Import boundary**: ESLint `no-restricted-imports` bloquea `src/**` de importar `packages/ai/{providers,agents,tools,pipelines}/**` (error real).

---

## 7. 🌍 Internacionalización (i18n)

**Dos sistemas i18n coexisten**:

1. **`src/lib/i18n.ts`** (278 LOC): define `Language = 'en'|'es'|'fr'|'de'|'it'|'pt'|'ca'` pero `languages[]` solo lista **en/es/ca activos**. Traducciones inline (auth/menu/dashboard/common), `getBrowserLanguage()`, `t(key,lang)`, fallback `en`. Consumido por `LanguageContext.tsx` (persistencia `localStorage['SaCarta-language']`, default browser-lang).
2. **`src/hooks/useTranslation.ts`** + `src/locales/{es,en,ca}.json` (~430 líneas c/u, 1.293 total): sistema "rico" con resolución de claves anidadas (`t('header.signIn')`), `tReplace` con `{placeholders}`. Consumido por Billing, Settings, Analytics, QRCode, MenuEditor (parcial), Overview, PricingCard, DashboardSidebar.

**Idiomas soportados**: **es, en, ca** (fr/de/it/pt definidos en `i18n.ts` pero no listados en selector ni en `locales/`).

**Estado** (según `DASHBOARD_TRANSLATIONS_SUMMARY.md`):
- ✅ Completos: header, hero, features, pricing, footer, auth, dashboard{menus,analytics,settings,billing,qrCode}, common, menu, billing, settings, analytics, qrCode, menuEditor.
- ⚠ Parcial: **MenuEditor.tsx (~15/96 claves), UI text hardcoded EN/ES**.
- ⚠ Pendientes de revisión: **Overview**, **PaymentSuccess**, **PaymentCanceled**.

---

## 8. 🏗 Estado del build

- `src/main.tsx` (5 LOC): `createRoot(#root).render(<App/>)` + `./index.css`.
- `src/App.tsx` (66 LOC): providers + rutas (ver §3).
- **`tsc -p tsconfig.app.json --noEmit`: ✅ PASS** (sin errores; config relajado `strict:false`).
- **`npm run lint`: ⚠ 40 problemas** (24 errors, 16 warnings) — todos `@typescript-eslint/no-explicit-any` en:
  - `src/lib/api.ts:84` (1×, cast `schedule_rules`).
  - `src/pages/PublicMenu.tsx:675-678` (5×, schedule_rules/JSON dynamic).
  - `src/pages/dashboard/MenuEditor.tsx:457,469,798,830,843,856,1162,1164` (8×, DnD handlers + schedule).
  - `supabase/functions/{check-subscription,customer-portal,send-contact,send-welcome-email,sync-subscription}` (Deno, no parte del Vite build).
  - 1× `no-require-imports` en `tailwind.config.ts:117` (`require("tailwindcss-animate")`).
  - 16 warnings `react-refresh/only-export-components` AllowConstantExport cosméticos.
- **`dist/`**: build verde presente (Aug 5 13:28, 2.2 MB). `index.html` (789 B), `assets/index-BgCE4gvg.js` (738 KB minified), `assets/index-CYhwgBq7.css`, + favicon/logo/placeholder/robots copiados de `public/`. **Vite build exitoso**.
- **Sin errores TS bloqueantes** (strict desactivado por diseño post-Lovable). El único `any` en boundary API está documentado.

---

## 9. 📚 Documentación existente

| Archivo | LOC | Estado |
|---|---:|---|
| `README.md` | 108 | ⚠ **boilerplate Lovable sin editar** — dice "Welcome to your Lovable project", URLs `lovable.dev`, placeholders `REPLACE_WITH_PROJECT_ID`. Solo paleta colores (light/dark, terracotta `#CC5C3D`/`#DA7561`, gold `#FFC62E`). Lista stack Vite/TS/React/shadcn/Tailwind |
| `SACARTA_PROJECT_AUDIT.md` | 670 | ⭐ Auditoría estática exhaustiva previa (2026-08-01). Exec summary, vision, current state (finished/missing), personas, design system (§13), **schema drift §16** (`instagram_url`/`website_url`/`template` en TS pero no en migrations), **Stripe webhook missing §20**, planned-not-implemented §25. Recomendado leer completo |
| `DASHBOARD_TRANSLATIONS_SUMMARY.md` | 120 | Estado traducciones dashboard (Billing/Settings/Analytics/QRCode completos, MenuEditor parcial 15/96, tablas es/en/ca 96+ claves c/u) |
| `TRANSLATION_IMPLEMENTATION.md` | 203 | Resumen implementación i18n — estructura carpetas, useTranslation hook, LanguageContext, placeholders, detección navegador, persistencia |
| `docs/AI_ARCHITECTURE.md` | 138 | Boundary Vite↔Deno, provider abstraction OpenCode Zen, prompts/agents/pipelines/tools, async jobs (Realtime, no polling, no worker), UI/hooks contract, RLS conventions, plan limits centralized |
| `docs/IMPLEMENTATION_PLAN.md` | 124 | Checklist por fase Phases 0-8 todas ✅, deployment checklist DONE, caveats (free-model flakiness), AI Image Gen permanently excluded |
| `docs/ROADMAP.md` | 51 | 9 features, todas build except AI Image Gen (excluded) |
| `docs/VISION.md` | 41 | "AI operating system for restaurant menus", aditivo no rewrite, exclusión imagen deliberada |
| `docs/FEATURE_SPECIFICATIONS.md` | 162 | Spec por feature con inputs/outputs/UI/edge function/credit cost + tabla `Credit costs` |
| `src/locales/{README.md, DASHBOARD_TRANSLATIONS_STATUS.md}` | — | Docs internas locales |

### Plan `sacarta-v2-ai-velvety-sloth.md` (`/root/.claude/plans/`)
Es el **plan original de transformación AI-first** aprobado y ejecutado. Cubre: contexto (auditoría previa confirma **0 AI features → hoy hay 8**), decisiones (OpenCode Zen only, NO image gen, Phases 1-4 originalmente, 5-8 "future" → ahora todas implementadas), deliverables docs (VISION/ROADMAP/AI_ARCHITECTURE/FEATURE_SPECIFICATIONS/IMPLEMENTATION_PLAN), arquitectura `packages/ai/` boundary, provider design (key rotation), async jobs (`ai_jobs` + Realtime), UI/hooks contract, data model (tablas nuevas Phases 1-4 + deferred 5-8 implementadas), **PlanLimits fix** (de-dup + `aiCreditsPerMonth` unified pool, free 20→50 real — luego halved en commit `dddd433`), phased build plan (Phase 0 foundations → 1 Description → 2 Translation → 3 Optimizer → 4 Import), verification, archivos críticos.

**Cost tables originalmente**: free:20 / pro:300 / pro_a:500 / lifetime:1000 — **halved to 50/150/250/500** el 2026-08-05 (commit `dddd433`).

---

## 10. 🔧 Git status e historial

- **Branch**: `main`, clean (`nothing to commit, working tree clean`), up to date con `origin/main`.
- **Branches**: local `feature/ai-layer-phase-1-4` (fase de desarrollo AI original, mergeada) + `main*`; remoto solo `origin/main`.
- **255 commits totales**. Seed: `bebc3a2 template: new_style_vite_react_shadcn_ts` (Lovable). Author: `feeerraaan <fazpiazuadrover@cifpfbmoll.eu>`.
- **Cambios sin commitear**: ninguno.

### Últimos commits (tema dominante: iteración intensiva sobre backend AI Import para hacerlo viable dentro del límite Vercel Hobby 300s)

```
80b5061  Fix crop modal                                              (Aug 5 13:28) ← último
75a73d6  Square-crop on image upload + live logo save; larger QR logo
cce74cb  Only show active coupons in admin backoffice
05f1bc4  Admin backoffice full restaurant config + menus CRUD + tree view
1d6566d  Add superadmin backoffice (users/restaurants RPCs, coupon EF, admin page)
a18de4b  Ensure restaurants always get a subscription row (trigger+backfill)
39430f5  Fix duplicate common i18n section + missing keys
12a0dd2  Sidebar always open + logo links to dashboard
9b377bd  Embed brand/restaurante logo in QR center (free=SaCarta, paid=own/plain)
dddd433  Halve per-plan AI credit pools (100/300/500/1000 → 50/150/250/500)
18437c1  Honor manual_override in subscription sync
112baab  Restrict import to text+PDF + extract with pdf-inspector
4ea1d61  Route imports through paid Go gateway with pro fallback
64ff784  Shrink chunks to 2500 chars for deepseek
2bc4d86  Schema-repair retries
03239d1 / 24ed09d / e15d452  Model switching (ling ↔ deepseek ↔ flash-free ↔ mimo)
c20b3bb  Abort import at budget deadline even mid-call
7f0e6af / 022ca54 / f3f5494 / 1c4e5ae / 1df1e97  Cadena de intentos Vercel backend
                                                              (sync → async worker → self-enqueue
                                                               → distributed steps → client-driven steps final)
… anteriores: streaming structured imports desde Zen (c31a172, 63d4e2a, 212a89e, 4c38a2e, 09bc9b0)
```

---

## 11. 🧹 Calidad del código

`npm run lint` → **40 problemas (24 errors, 16 warnings)** no bloqueantes:

- `src/lib/api.ts:84` — 1× `no-explicit-any` (cast `schedule_rules as unknown as any`).
- `src/pages/PublicMenu.tsx:675,676,677(x2),678` — 5× `any` (parsing de `schedule_rules`/JSON dynamic).
- `src/pages/dashboard/MenuEditor.tsx:457,469,798,830,843,856,1162,1164` — 8× `any` (DnD handlers, schedule object, drag events).
- `supabase/functions/{check-subscription,customer-portal,sync-subscription}:10` — `any` en `import Stripe from 'esm.sh/stripe@18.5.0'` (Deno, no Vite).
- `supabase/functions/send-contact.ts:124`, `send-welcome-email.ts:221` — `any`.
- `tailwind.config.ts:117` — `require("tailwindcss-animate")` (`no-require-imports`).
- 16 warnings restantes — `react-refresh/only-export-components` AllowConstantExport (cosméticos).

**Sin errores de boundary AI** (`no-restricted-imports` limpia). **Sin errores TS bloqueantes**. Recomendaría typear los DnD handlers + `schedule_rules` para eliminar los 8 `any` del `MenuEditor`.

---

## 12. 📝 TODOs / FIXMEs / HACKs / XXXs

- **`src/`**: 0 coincidencias (clean).
- **`api/`**: 1 coincidencia en `api/ai-import-start.ts:159` — **falso positivo** (literal español `Traduce TODO el árbol de menú…`, palabra "todo", no marcador TODO).

**No hay TODOs / FIXMEs / HACKs / XXXs reales en el código.** Limpio.

---

## 13. 📤 Presentación / demo Hackathon

`presentacion.html` (107 LOC): **email HTML marketing** (no slide deck). Inline styles, tabla presentación, header gradient naranja `#f76201 → #e65d01`, logo SaCarta circular, tag `📍 Nacido en Mallorca • Recién horneado`, frase `"Porque tu comida merece ser vista antes de ser probada."`. Features 2×2: ✨ Diseño Impecable · 🌍 Multilingüe · 📱 QR Personalizado · 📊 Analíticas. CTA "Empezar Gratis Ahora" → `https://sacarta.azpy.es`. Footer "Hecho con ❤️ desde Mallorca para la hostelería del mundo." Mismo branding naranja/terracotta que el resto del producto. No es un deck como tal — es un email template (probablemente enviado vía Resend desde las Edge Functions welcome/contact).

**No hay `deck.html`, `slides.*`, ni otros artefactos hackathon en el repo.** El `README.md` sigue siendo boilerplate Lovable → está sin preparar para presentación pública/jurado.

---

## 14. 🎯 Hallazgos finales (síntesis para jurado)

1. **AI-first build completo** (8/8 features shipped + E2E verified) sobre OpenCode Zen. `feature/ai-layer-phase-1-4` mergeada a `main`.
2. **Backend híbrido Vercel + Supabase Edge**: Vercel Node para imports largos (client-driven steps, sin 508/cap), Denos para el resto. Lógica AI compartida en `packages/ai/` (plain TS).
3. **Sin tests, sin CI/CD, sin observabilidad** (Sentry/LogRocket) — solo `console.*` mayormente gated `import.meta.env.DEV`. README sin reescribir.
4. **Sin Stripe webhook** → entitlement drift risk (debilidad confirmada en audit previo y **no corregida**).
5. **Schema drift parcial**: `instagram_url` / `website_url` / `template` en `src/types/database.ts:9,10,16` pero NO en migrations — viven solo en live DB (Lovable original). No se han capturado.
6. **i18n dual** convive sin problema pero MenuEditor parcial + Overview/PaymentSuccess/PaymentCanceled pendientes.
7. **Lint limpio de TODOs**; 40 issues `no-explicit-any` concentrados en `PublicMenu.tsx` y `MenuEditor.tsx` (no bloqueantes).
8. **Build verde**: `tsc --noEmit` OK, `vite build` OK (dist 2.2 MB), `npm run lint` no bloquea.
9. **Backoffice superadmin** recién añadido (commits `1d6566d`, `05f1bc4`, `cce74cb`) — `admin_list_users/update_restaurant/update_subscription`, CRUD menús via RPCs SECURITY DEFINER, cupones Stripe. Ruta `/dashboard/admin` gated client+server.
10. **Créditos IA halved** el 2026-08-05 (`dddd433`): pools más pequeños hacen upgrades más significativos (free 50 = ~2 imports + testing).
11. **Plan original** ejecutado al completo — documento de referencia del engagement de transformación.
12. **Working tree clean** en `main`, 255 commits, intensa iteración reciente (45+ commits) sobre el backend del AI Import para hacerlo viable en Vercel Hobby.

---

## 🚦 Checklist Hackathon

| Criterio | Estado | Notas |
|---|---|---|
| Producto deploy en producción | ✅ | `https://sacarta.azpy.es` |
| Funciona end-to-end | ✅ | 8 features IA verificadas E2E |
| Auth segura | ✅ | Supabase Auth + RLS en todas las tablas + roles admin |
| Billing/monetización | ⚠ | Stripe Checkout + Customer Portal, pero **NO webhook** (drift risk) |
| Multi-tenant / SaaS correcto | ✅ | Owner-join pattern en RLS, slugs únicos |
| IA madura (no demo de juguete) | ✅ | Key rotation, schema-repair, fallback chain, async jobs, auditoría acciones copilot |
| Safety de IA (hallucination control) | ✅ | Customer Assistant: pre-filter determinista + validación server-side + rate-limit |
| i18n | ⚠ | es/en/ca OK, MenuEditor parcial, 3 pages pendientes |
| Backoffice admin | ✅ | Recién añadido |
| Build/lint/typecheck limpio | ⚠ | `tsc` OK, `vite build` OK; lint 40 issues no bloqueantes |
| Tests | ❌ | No hay suite de tests |
| CI/CD | ❌ | No hay pipeline |
| Observabilidad | ❌ | Solo `console.*` gated dev |
| README listo para jurado | ❌ | Sigue siendo boilerplate Lovable |
| Deck de pitch | ❌ | Solo `presentacion.html` (email) |
| Schema DB versionado completo | ⚠ | Schema drift: 3 columnas en TS no en migrations |
| Documentación de diseño | ✅ | `docs/` con 5 archivos AI_* + audit previa |
| Repo limpio (working tree) | ✅ | main limpio, up to date |
| Story del proyecto (commits) | ✅ | 255 commits, narrativa clara de evolución |

---

## 🛠 Acciones recomendadas (priorizadas para ganar tiempo pre-pitch)

1. **🔴 Alta** — Implementar **Stripe webhook** (`stripe-webhook` Edge Function) que llame a `sync-subscription` para eliminar el drift de entitlement. (~2h)
2. **🔴 Alta** — Capturar **schema drift** en una migration nueva: `ALTER TABLE restaurants ADD COLUMN IF NOT EXISTS instagram_url TEXT, website_url TEXT, template TEXT` (tomar definiciones exactas del live DB). (~30min)
3. **🟠 Media** — **Reescribir `README.md`** como README de SaCarta (no Lovable): pitch, arquitectura, cómo arrancar, env vars, deploy, créditos IA. (~1h)
4. **🟠 Media** — Crear un **deck de pitch** real (`pitch.html` o `slides.md`) de 8-10 slides: problema, solución, demo IA, arquitectura, billo, tracción/demo. (~2h)
5. **🟡 Baja** — Typear DnD handlers y `schedule_rules` en `MenuEditor.tsx` para eliminar 8 `any`. (~1h)
6. **🟡 Baja** — Completar traducciones MenuEditor (~81 claves restantes) + Overview/PaymentSuccess/PaymentCanceled. (~2h)
7. **🟢 Opcional** — Añadir un script `test` mínimo (smoke test del `build` + comprobar 200 en `/` y `/m/:slug`) para CI. (~1h)
8. **🟢 Opcional** — Añadir Sentry (free tier) para observabilidad mínima del pitch. (~30min)

**Total estimado pitch-ready: ~6-7h para items Alta+Media.**

---

*Auditoría generada automáticamente por opencode. Solo lectura — no se modificó ningún archivo del proyecto.*