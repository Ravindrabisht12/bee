---
name: product-research
description: Market and user research for a product idea — who has the problem, how painful it is, how people solve it today, market signals, and risks. Writes .forge/<slug>/01-research.md with cited sources. Use as stage 1 of product-builder, or on its own when the user asks to "research this idea", "is there a market for…", "validate my idea", or "who would use…".
---

# Product Research

Goal: in one readable document, give the designer enough evidence to make good scope
decisions. Facts must have sources; everything else is labelled as inference.

## Inputs
`.forge/<slug>/00-brief.md` (or the user's message, when run standalone).

## Process
1. **Frame 3–5 research questions** from the brief. Examples:
   - Who exactly has this problem, and in what situation?
   - How do they solve it today, and what does that cost them (time, money, frustration)?
   - What signals show demand (search interest, communities, funding, reviews)?
   - What would make someone switch?
2. **Search** (use WebSearch/WebFetch or the `researcher` agent). Good sources:
   Reddit/HN/forum threads (real pain, real words), app-store and G2/Capterra reviews,
   Product Hunt launches, industry reports, Google Trends. Run independent searches
   in parallel.
3. **Pull out the user's own words.** Quotes from real users are the most valuable
   output, because they shape copy, features, and priorities.
4. **Synthesize.** Don't list findings; turn them into decisions for the designer.

## Output: `01-research.md`

```markdown
# <Name> — research
_Generated <date>. Sources at bottom. [A] = assumption, not sourced._

## TL;DR (5 bullets max)
## Target users
- **Primary persona:** name, context, job-to-be-done
- **Secondary:** …
## The problem, in their words
> "quote" — source
## How they solve it today
| Workaround | Pain | Source |
## Demand signals
## Risks & unknowns
## Implications for design   ← most important section
- Must have: … because …
- Avoid: … because …
## Sources
1. [title](url)
```

## Rules
- Target 1–2 pages. Depth goes into "Implications for design", not into volume.
- If web tools are unavailable, write from general knowledge, mark every claim [A],
  and add a warning at the top of the file.
- Never invent statistics, quotes, or URLs.
