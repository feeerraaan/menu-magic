# tools/

Empty for now. This folder is populated when the AI Restaurant Copilot (Phase 6, see
`/docs/ROADMAP.md` and `/docs/FEATURE_SPECIFICATIONS.md`) is built — it will hold typed
function-calling definitions plus their executors (the only code allowed to mutate the
database on an agent's behalf; see `/docs/AI_ARCHITECTURE.md` §3).

Phases 1-4 (Description Generator, Translation, Menu Optimizer, AI Import) are single-shot
structured-output generation, not multi-turn tool-calling agents, so they don't need this
folder yet.
