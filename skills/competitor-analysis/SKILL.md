---
name: competitor-analysis
description: Finds and analyzes competitors and alternatives for a product or a single feature — features, pricing, UX patterns, strengths, complaints, and gaps to exploit. Writes .forge/<slug>/02-competitors.md. Use as stage 2 of product-builder, or whenever the user asks "who are the competitors", "how does X do it", "compare us to…", or wants a feature built "like <other app>".
---

# Competitor Analysis

Goal: know the field well enough to copy what's proven, avoid what users hate, and pick
one or two places to be clearly better.

## Process
1. **Find 4–8 competitors** across three tiers:
   - **Direct:** same problem, same users.
   - **Indirect:** same problem, different approach (including spreadsheets, Notion
     templates, doing it by hand).
   - **Adjacent:** big players that could add this as a feature.
2. **For each one, collect** (from their site, pricing page, docs, app-store/G2 reviews,
   changelog): core features, pricing model, onboarding flow, standout UX pattern, top
   praise, top complaints. If the browser/screenshot tools are available, capture key
   screens into `.forge/<slug>/design/refs/`.
3. **Mine complaints.** 1–3★ reviews and "X alternative" threads are where the gaps are.
4. **Build the matrix**, then decide on positioning.

Scoped mode (one feature, e.g. "pricing page like Stripe's"): analyze only that feature
across 3–5 products and focus on UX patterns.

## Output: `02-competitors.md`

```markdown
# <Name> — competitors
## TL;DR
## Landscape
| Product | Tier | Price | Core strength | Top complaint | Link |
## Feature matrix
| Feature | Us (planned) | A | B | C |
## Patterns worth copying (table stakes)
## Gaps / complaints to exploit
## Positioning: we win on ___ for ___ because ___
## Sources
```

## Rules
- Every price, feature claim, and review quote needs a link and the date you checked it.
- Keep the matrix to the 8–12 features that matter for the decision.
- End with an opinion. "Positioning" must be one sentence the designer can act on.
