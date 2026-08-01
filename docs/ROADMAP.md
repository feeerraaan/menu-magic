# SaCarta AI Roadmap

Nine features, sequenced across two horizons: **Phases 1-5 are built.** Phases 6-8 (Copilot, Insights + Recommendations, Customer Assistant) are fully specified in `FEATURE_SPECIFICATIONS.md` but not implemented yet — they're sequenced for a future build.

AI Image Generation is not on this roadmap at all, in any phase — see `VISION.md` for why. It is not "phase 10," it is excluded.

> **Numbering note:** the original plan reserved a "Phase 6" for the (now permanently excluded) AI Image Generator. In practice it never existed, so after Phase 5 the roadmap continues at **Phase 6 = Copilot**, **Phase 7 = Insights + Recommendations**, **Phase 8 = Customer Assistant** — matching `FEATURE_SPECIFICATIONS.md`.

## Sequencing logic (why this order, not feature-brief order)

Four things drive the order: (a) the user's own stated priority (AI Import is "the most important feature"), (b) dependency order (Copilot's "translate everything" needs Translation to exist first; Import needs Translation to auto-translate imported content), (c) infrastructure risk (async job handling is new to this codebase — it should be proven on a read-only, un-corruptible feature before the highest-stakes feature relies on it), (d) revenue leverage (which features most directly justify a plan upgrade).

## Phase 1 — AI Description Generator ✅ this engagement

The smallest possible vertical slice: a single synchronous Edge Function call, no async job infrastructure needed. Chosen to go first specifically because it's the cheapest place to prove out usage-metering (the `ai_usage` credit ledger) end-to-end before anything more complex is layered on top. If something's wrong with how credits are charged, it's far cheaper to find that bug here than inside a multi-step Import pipeline.

## Phase 2 — AI Translation ✅ this engagement

Mechanically almost identical to Phase 1 (text in, text out, staged for owner approval) — cheap to ship second. But it is a hard prerequisite for two later features: the Copilot's "translate everything into German" tool (Phase 7), and AI Import's own auto-translate-into-`supported_languages` step (Phase 4) — so it has to exist before both.

## Phase 3 — AI Menu Optimizer ✅ this engagement

The first feature to use the async-jobs table (`ai_jobs`) for real. Deliberately *not* Import — Optimizer is read-only analysis with zero risk of corrupting menu data if the async plumbing has bugs; the worst outcome is a wrong or stale score. This proves out `ai_jobs` + Realtime end-to-end on the lowest-risk possible feature before Import has to rely on the same mechanism for a feature that writes real data.

## Phase 4 — AI Import ✅ this engagement

The user's explicitly stated top-priority feature, built last of the four on purpose: by this point the async-jobs mechanism (Phase 3) and the translation pipeline (Phase 2) already exist and are proven, so Import only has to add the PDF/document/image parsing and extraction logic — it doesn't also have to invent async infrastructure under pressure on the single highest-visibility feature. This is also the highest revenue-leverage feature (the biggest reason a free-tier owner upgrades), so it ships as early as the dependency/risk order allows, but not first.

---

## Phase 5 — AI Setup ✅ done

Onboarding's alternate path: "upload your menu" next to the existing 3-step manual wizard (`OnboardingWizard.tsx`). Near-zero marginal cost once Import exists — it reuses the exact same pipeline tagged with a different job type (`job_type='ai_setup'`). Sequenced right after Import to capture new-signup conversion while that pipeline is fresh. **Built (2026-08-01):** fork after step 1, same upload UI as AI Import, same 15-credit cost, E2E-verified live.

## Phase 6 — AI Restaurant Copilot *(future)*

The riskiest phase: a chat that performs real mutations (price changes, bulk edits, new items) via natural language. Sequenced after every single-purpose pipeline it depends on (Description, Translation) is already reliable in isolation, because the Copilot's job is to orchestrate those pipelines plus direct table mutations behind a mandatory preview-and-confirm gate — see `FEATURE_SPECIFICATIONS.md` for the full tool-calling and audit-log design, already specified even though not yet built.

## Phase 7 — AI Business Insights + AI Recommendations *(future)*

Bundled together: both are read-mostly (Insights narrates from existing analytics + Optimizer data; Recommendations derives dismissible suggestion cards from Optimizer/Insights output). Lower risk, ships as retention/polish once the core paid-tier value (Import, Translation, Copilot) is already justifying upgrades.

## Phase 8 — AI Customer Assistant *(future)*

Sequenced last because it is the only AI feature exposed to anonymous, potentially adversarial public internet traffic — a qualitatively different cost/abuse surface from every owner-facing feature before it. It has no dependency on any other AI feature to function (it only needs the already-public menu data), so there's no technical reason to rush it; shipping it last means its rate-limiting design benefits from real usage-cost data gathered from Phases 1-8.

---

## Status tracking

This file is updated at the end of each phase (per the project's "after each completed feature, update documentation" rule). See `IMPLEMENTATION_PLAN.md` for the current build checklist and what's actually shipped vs. in progress.
