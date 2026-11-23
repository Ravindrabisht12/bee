---
name: feature-explainer
description: Generates a single interactive HTML page that explains what was built or changed the way a senior dev would walk a junior dev through it — summary, features, before/after, diagrams, step-by-step code walkthrough, file map, "try it yourself" checklist, glossary, and a quick quiz. Use as the final stage of product-builder or feature-change, or whenever the user asks to "explain what changed", "walk me through this feature", "make an onboarding page for this code", or "show me visually what you built".
---

# Feature Explainer

Goal: the last person in the chain (a PM, a client, or a junior dev) opens **one page**
and understands what was added, why, how it works, and how to try it, without reading
the diff.

You never hand-write the HTML. You write **data** (`explainer.json`), and the bundled
template renders it, so every explainer looks consistent and you spend your effort on
the content.

## Steps
1. **Gather facts** from `docs/specs/` and `docs/adr/` (they fill the `specs` and
   `decisions` sections), and from `.forge/<slug>/`: `00-brief.md`, `03-design.md`,
   `04-build-log.md` (main source), `05-docs.md`, and the actual diff/code
   (`git diff`, or read the files the build log lists). Standalone use with no
   `.forge/`: use `git log`/`git diff` for the range the user names.
2. **Write `.forge/<slug>/explainer.json`** following `references/schema.md`. Every
   field is optional except `title`, so leave out sections that don't apply.
3. **Render:**
   ```bash
   python3 <this-skill-dir>/scripts/render.py .forge/<slug>/explainer.json
   ```
   This writes `explainer.html` next to the JSON and validates the data.
4. **Open it** (`open` on macOS / `xdg-open` on Linux) and give the user the path. If
   the user wants a shareable link and an Artifact/publish tool is available, offer to
   publish it.

## Writing like a good mentor
- **Lead with the outcome**, not the implementation: "Users can now share a blob with a
  link" before "added `shares` table".
- **Every walkthrough step answers three things:** what this code does, why it's done
  this way, and what would break without it. Keep each `code` snippet under ~25 lines.
  Show the important part, not the whole file.
- **Diagrams show the real mechanism:** the actual request/data flow with real
  component names. One sequence diagram of the core flow beats three generic boxes.
- **"Try it" steps must be runnable as written:** exact commands, exact clicks,
  expected result.
- **Glossary** covers every project-specific or framework term a junior might not know.
- **Quiz:** 3–5 questions that check understanding of the *why*, not trivia.
- Be honest: list known limitations and cut scope under `limitations`.
