# SaCarta — Product Vision

## From "QR digital menu" to "AI operating system for restaurant menus"

SaCarta today is a solid, working SaaS: a restaurant owner creates a menu, publishes it behind a QR code, and customers view it on their phones. That product works. But it stops at *display* — every category, every dish, every translation, every description is typed in by hand. The owner is the entire content pipeline.

The vision for this transformation is simple to state and hard to overstate: **the owner should almost never manually create a menu item again.** They provide raw material — a PDF, a photo of a printed menu, a stack of half-finished notes — and SaCarta's AI layer does the work a junior marketing hire or a translator would otherwise be paid to do: extracting structure, writing appetizing copy, translating with genuine culinary sensitivity, and continuously telling the owner how to make the menu better.

We want a restaurant owner to feel like they hired an AI employee, not like they bought software. That employee:

- **Saves hours of manual work** — importing an entire existing menu should take minutes, not an evening of data entry.
- **Improves the restaurant continuously** — a menu is never "done"; the AI should keep suggesting what to fix, add, or refine.
- **Makes better business decisions possible** — surfacing what's actually working (via views, language coverage, description quality) in plain language, not just raw chart data the owner has to interpret themselves.

## What does NOT change

This is an evolution, not a rewrite. Every existing capability — auth, the 3-step onboarding, the menu editor, QR generation, Stripe billing, the public menu experience, manual translations, scheduling, analytics — stays exactly as it is today. AI is a new layer added *on top of* this foundation, never a replacement for it. An owner who wants to keep doing everything by hand can still do so; nothing is forced.

The visual identity does not change either. SaCarta's warm terracotta-and-serif, minimal, restaurant-appropriate design stays as it is (see the existing design system in `SACARTA_PROJECT_AUDIT.md` §13) — AI surfaces are built to feel like a natural part of this product, not a bolted-on gadget.

## A deliberate exclusion: no AI-generated food photography

This transformation explicitly does **not** include an "AI Image Generator" feature, despite it being commonly bundled into similar AI-menu products. The reasoning is a trust decision, not a technical limitation: a photo attached to a real dish on a real menu is an implicit promise to the diner about what they will be served. Generating a synthetic, AI-imagined photo of "the paella" and presenting it next to a real price on a real menu crosses from marketing into misrepresentation — it risks the diner feeling deceived the moment the real dish arrives looking nothing like the picture.

SaCarta's existing photo-upload feature (client-compressed, owner-provided real photos) stays completely untouched and is not affected by this decision. If AI-assisted photography is revisited in the future, it should take a form that keeps the provenance honest to the diner (e.g., AI-assisted *editing* of a real photo the owner uploaded, clearly framed as enhancement, not invention) — but that is explicitly out of scope for this transformation and is not scaffolded anywhere in the codebase.

## What "AI-first" means concretely, feature by feature

1. **AI Import** — the flagship feature. Upload a PDF, Word doc, spreadsheet, photo of a printed menu, or point at an existing restaurant website, and the AI builds the full category/dish/price/allergen/dietary structure automatically. Everything remains editable afterward — AI proposes, the owner disposes.
2. **AI Translation** — translations that understand food, not just language. A local dish name is explained to a foreign diner, not mistranslated word-for-word.
3. **AI Description Generator** — turns a bare dish name into an appetizing description, in a style the owner picks (Luxury, Traditional, Modern, Casual, Fine Dining).
4. **AI Menu Optimizer** — a single page that scores the whole menu (0–100) across balance, pricing, description quality, image coverage, language coverage, and more, and explains exactly what to fix.
5. **AI Business Insights** *(future phase)* — narrative, consultant-style read of the existing analytics data ("your desserts have unusually short descriptions") instead of raw charts.
6. **AI Restaurant Copilot** *(future phase)* — a chat that can act on the owner's behalf ("raise all drink prices by 10%"), always previewing the exact change and asking for confirmation before writing anything.
7. **AI Recommendations** *(future phase)* — a continuously-updated list of concrete, dismissible suggestions.
8. **AI Customer Assistant** *(future phase)* — a chat on the public menu itself, helping a diner find the right dish for their constraints (allergies, budget, mood) — safety-critical, so hard constraints like allergens are enforced deterministically in code, never left to model judgment alone.
9. **AI Setup** *(future phase)* — onboarding's alternate path: "upload your menu" instead of typing it all in by hand.

## Sequencing philosophy

Not all nine features ship at once. This engagement builds the four that are cheapest to prove safe and that compound into the flagship Import feature: **Description Generator → Translation → Menu Optimizer → AI Import** (see `ROADMAP.md` for the full phase-by-phase reasoning). The remaining five — Setup, Copilot, Insights, Recommendations, Customer Assistant — are fully specified in `FEATURE_SPECIFICATIONS.md` so a future session can build them directly against a settled design, but they are not implemented yet. Anything that can mutate a menu through natural language (the Copilot) or that talks to anonymous strangers on the internet (the Customer Assistant) is sequenced last, deliberately, after every underlying single-purpose AI pipeline has already been proven reliable in isolation.
