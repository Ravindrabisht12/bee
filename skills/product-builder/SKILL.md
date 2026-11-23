---
name: product-builder
description: Orchestrates building a NEW product or app end-to-end from a one-line idea ("build blobby", "make me an app that…", "I want to build a product for…"). Runs the full pipeline — research → competitor analysis → design → development → documentation → interactive explainer — by chaining the other skills in this library and handing off through a .forge/ workspace. Use whenever the user wants a new product, MVP, or app built from scratch, even if they only give a name or a vague idea.
---

# Product Builder (orchestrator)

You are the **lead** of a small product team. You do not do every job yourself in one
long improvised stream — you run a fixed pipeline, call the specialist skill for each
stage, and keep every stage's output in a file so work is resumable, reviewable, and
reusable.

The person at the end of the pipeline should only need to open **one interactive page**
to understand what was built and why.

## The pipeline

| # | Stage        | Skill                 | Output file (in `.forge/<slug>/`) | Gate |
|---|--------------|-----------------------|-----------------------------------|------|
| 0 | Intake       | (this skill)          | `00-brief.md`                     | user confirms brief |
| 1 | Research     | `product-research`    | `01-research.md`                  | — |
| 2 | Competitors  | `competitor-analysis` | `02-competitors.md`               | — |
| 3 | Design       | `product-design`      | `03-design.md` (+ `design/`)      | — |
| 3b| Spec + ADRs  | `spec`, `adr`         | `docs/specs/`, `docs/adr/`        | **user approves specs & ADRs** |
| 4 | Build        | `feature-dev`         | code + `04-build-log.md`          | tests/build pass |
| 5 | Document     | `feature-docs`        | `05-docs.md` + repo docs          | — |
| 6 | Explain      | `feature-explainer`   | `explainer.html`                  | — |
| 7 | Learn        | `skill-forge`         | improved/new skills (optional)    | — |

Read `references/workspace.md` for the exact layout and file formats of `.forge/`.

## How to run it

### 0. Intake (keep it short)
1. Derive a slug from the product name (`blobby`, `invoice-bot`).
2. Check for `.forge/<slug>/STATE.md`. If it exists, **resume** from the first stage not
   marked `done` — never redo finished stages unless asked.
3. Otherwise write `00-brief.md` from what the user said. Fill gaps with sensible
   assumptions and mark each one `(assumed)`. Ask at most **3** questions, and only
   ones whose answer changes what gets built (target user, platform, must-have feature).
   If the user said "just build it", ask nothing and proceed on assumptions.
4. Create `STATE.md` with every stage set to `todo`.

### 1–2. Research + Competitors (parallelizable)
These two are independent. If the Agent tool is available, run them in parallel using
the `researcher` agent (one for market/user research, one for competitors); otherwise
run the `product-research` then `competitor-analysis` skills inline. Each writes its own
file. Mark both `done` in `STATE.md`.

### 3. Design
Run `product-design`. It reads `00`–`02` and produces the MVP scope, user flows,
screens, data model, and tech stack. **Gate:** show the user the MVP feature list (5–10
bullets) and the stack in one short message. Proceed on approval, or immediately if the
user pre-authorized ("don't ask, just build").

### 3b. Specs and decisions (the review surface)
Run `spec` to write one spec per MVP feature (or one product spec for a small MVP), with
numbered acceptance criteria. Run `adr` for each decision that would be costly to
reverse, at minimum the tech stack and data storage. **Gate:** show the user the spec
goals + AC lists and the Proposed ADRs, one line each. Their approval sets specs to
Approved and ADRs to Accepted. This is the main review point: approve the contract,
not the code.

### 4. Build
Run `feature-dev` against the approved specs and `03-design.md`. Build in vertical slices (one working feature
at a time), and append to `04-build-log.md` after each slice: what was added, files
touched, how it was verified. **Gate:** the app must run and its tests/typecheck/build
must pass before moving on. If something is cut or changed versus the design, record it
in the build log — the explainer depends on it.

### 5. Document
Run `feature-docs`: README, setup, architecture, and a feature list derived from the
build log (what actually exists, not what was planned).

### 6. Explain
Run `feature-explainer` to generate `explainer.html` — the single page the end person
reads. Open it in the browser (`open` on macOS, `xdg-open` on Linux) and give the path.

### 7. Learn (optional but encouraged)
If a stage needed a correction, a workaround, or a repeated manual step, run
`skill-forge` to fold that lesson back into the relevant skill. This is how the library
gets better every project.

## Rules
- **Files are the hand-off.** Each stage reads previous stage files, not your memory of
  them. That makes every stage restartable and lets a different agent pick it up.
- **Update `STATE.md` after every stage** (`todo` → `doing` → `done`, plus one line of notes).
- **Scale to the ask.** "Quick prototype" → compress research+competitors into ~1 page
  each and skip the design gate. "Real product" → full depth.
- **No fake facts.** Research stages must cite sources (URLs) or label content as
  assumption. If web access is unavailable, say so in the file.
- **Existing codebase?** If the user wants to change an app that already exists, use the
  `feature-change` skill instead — it's the lighter pipeline for changes.

## Final message to the user
Short: what was built (3–6 bullets), how to run it (one command), spec coverage
(`spec.py trace --all`), any ADRs still Proposed, and the path to `explainer.html`. Everything else lives in `.forge/<slug>/`.
