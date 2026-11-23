---
name: feature-dev
description: Implements a design or change in vertical slices with verification after each slice, keeping a build log that later feeds the docs and explainer. Reads .forge/<slug>/03-design.md (or a direct request) and writes code plus 04-build-log.md. Use as the build stage of product-builder or feature-change, or whenever the user asks to implement, code, or build a planned feature.
---

# Feature Development

Goal: working software, built in small verified steps, with a log that a junior dev
could follow.

## Before writing code
1. Read the approved specs in `docs/specs/` (the acceptance criteria are the contract),
   `03-design.md` (build plan), the Accepted ADRs in `docs/adr/` (decisions you must
   respect), and, in change mode, `01-recon.md`.
2. **New project:** scaffold with the stack's standard generator (e.g. `npm create vite`,
   `npx create-next-app`, `uv init`). Set up lint, a test runner, and a single `dev`
   command first.
   **Existing project:** run the existing tests/build first and record the baseline.
3. Create a task list from the slices.

## Per slice (repeat)
1. Implement the smallest end-to-end version: UI → logic → data.
2. Add or extend tests for the acceptance criteria, putting the AC ID in the test name
   (`"S3-AC2: expired link returns 410"`) so `spec.py trace` can prove coverage.
3. **Verify for real:** run tests, typecheck, and build. For UI, start the app and check
   it (screenshot or browser tool if available). Don't claim it works without running it.
4. Append a slice entry to `04-build-log.md` (format in
   `product-builder/references/workspace.md`): what, why, files, how it works, how it
   was verified, deviations.
5. Update `STATE.md`.

## Parallelism
Independent slices (e.g. backend API vs. a separate UI screen) can be given to the
`developer` agent in parallel, ideally in separate git worktrees. Integrate and
re-verify after merging.

## Quality bar
- Follow the existing conventions; match the design's tokens.
- Handle the empty, loading, and error states listed in the design.
- No secrets in code; use `.env.example`.
- If a design decision turns out wrong while building, make the sensible call, record
  it under "Deviations", and if it's costly to reverse, write a Proposed ADR (`adr`
  skill). Never silently contradict an Accepted ADR.

## Done means
All slices are logged, the app runs with one command, tests/build pass,
`spec.py trace --all` shows every AC covered (or explains why not), and the build log
matches reality.
