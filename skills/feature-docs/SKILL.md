---
name: feature-docs
description: Writes or updates project documentation from what was actually built — README, setup, architecture overview, feature list, CHANGELOG, and API notes — using the build log as the source of truth. Use as the docs stage of product-builder or feature-change, or when the user asks to "document this", "write the README", "update the changelog", or "write docs for this feature".
---

# Feature Docs

Goal: someone new can clone, run, and understand the project in 10 minutes, and docs
describe what **exists**, not what was planned.

## Source of truth
`04-build-log.md` and the code itself. The design doc is only for the "why".

## Build mode (new product)
Write or refresh:
- **README.md:** one-liner, screenshot/GIF placeholder, features, quick start (≤5
  commands), env vars table, scripts table, project structure (top two levels with a
  one-line purpose each), and a link to `docs/` and the explainer.
- **docs/architecture.md:** a Mermaid component diagram, request/data flow for the core
  job, data model, key decisions with reasons (taken from the design + deviations).
- **CHANGELOG.md:** `## [0.1.0] - <date>` with Added/Changed/Fixed sections.

## Change mode (existing app)
Update only what the change affects: README feature list, relevant docs page,
CHANGELOG entry, API reference, and code comments where behavior is non-obvious. Match
the existing doc style and don't restructure.

## Then
Write `.forge/<slug>/05-docs.md`: the list of docs created/updated, with one line each.

## Rules
- Run every command in the quick start yourself. A broken quick start is a bug.
- Explain "why" for non-obvious decisions. "What" is in the code.
- Keep it short and skimmable: tables and lists over paragraphs.
