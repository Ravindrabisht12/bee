---
name: product-design
description: Turns a brief plus research into a buildable product design — MVP scope, user flows, screen list with wireframes, visual direction, data model, and tech stack. Writes .forge/<slug>/03-design.md and optional HTML wireframes in design/. Use as stage 3 of product-builder or feature-change, or when the user asks to "design", "plan the MVP", "wireframe", "define scope", or "choose a stack".
---

# Product Design

Goal: a design specific enough that `feature-dev` can build it without guessing, and
small enough to ship.

## Inputs
`00-brief.md`, plus `01-research.md` and `02-competitors.md` if they exist. In change
mode, also `01-recon.md` and the existing UI.

## Process
1. **Scope the MVP.** Use MoSCoW. "Must" holds at most ~7 features, and each one traces
   to a research insight or competitor gap (cite the section).
2. **User flows.** For the 2–3 core jobs, write numbered steps or a Mermaid flowchart.
3. **Screens.** One line per screen: purpose, key components, empty/loading/error states.
4. **Wireframes** (for user-facing products): write simple, self-contained HTML
   wireframes to `design/<screen>.html` (grey boxes and real labels, no lorem ipsum). If
   Figma/Paper design tools are connected and the user wants them, use those instead.
5. **Visual direction.** A small token set: 2 fonts, a 5–6 color palette with roles,
   spacing scale, radius, plus a one-line tone ("calm, dense, for power users"). Reuse
   the existing design system when there is one.
6. **Data model.** Entities, fields, relations (Mermaid `erDiagram`).
7. **Tech stack.** Prefer boring, well-known choices that fit the platform and what the
   user already uses. Give one line of reasoning per choice. In change mode, the stack
   is whatever already exists.
8. **Build order.** Split the musts into vertical slices, each one demoable on its own.

## Output: `03-design.md`

```markdown
# <Name> — design
## MVP scope
| Priority | Feature | Why (source) |
## Core flows
## Screens
## Visual direction (tokens)
## Data model
## Tech stack
## Build plan (slices)
1. Slice — acceptance criteria
## Open questions
```

Change mode: replace "MVP scope" with **Before → After** for each affected flow/screen.

## Rules
- Design for the empty state first. It's the first screen a new user sees.
- Accessibility is part of the design: contrast, keyboard paths, labels.
- If a slice can't be tested, it's too vague. Rewrite its acceptance criteria.
