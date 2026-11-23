---
name: feature-change
description: Lighter pipeline for adding a feature to, or changing, an EXISTING app or codebase ("in my X app I want…", "add dark mode", "change checkout to…", "fix/rework the onboarding flow"). Understands the codebase first, plans, implements, documents, and produces an interactive explainer of what changed. Use whenever the request is a change to code that already exists rather than a brand-new product.
---

# Feature Change

The same team as `product-builder`, minus market research, aimed at a codebase that
already exists. The workspace is `.forge/change-<short-name>/` (see
`product-builder/references/workspace.md`).

## Stages

1. **Brief** → `00-brief.md`: the change in the user's words, plus acceptance criteria
   you infer (3–6 checkable bullets). Ask questions only if the request is ambiguous
   enough that you could build the wrong thing.

2. **Recon** → `01-recon.md`: understand before touching anything.
   - Read the project's CLAUDE.md / README / AGENTS.md, plus any earlier `.forge/`
     folders (they record past decisions).
   - Map the code paths the change touches: entry points, components, data, tests.
   - Write down the conventions you must follow (naming, state management, styling,
     test style). Your change should look like the existing team wrote it.
   - List risks: what could break, and who else calls this code.

3. **Design** (only when the change is user-visible or structural) → `03-design.md`, via
   the `product-design` skill in "change mode": affected screens and flows, before →
   after. If competitors matter (e.g. "make our pricing page like X"), run
   `competitor-analysis` scoped to that one feature first.

3b. **Spec + ADR**: for anything beyond a trivial change, run `spec` (or update the
   existing spec this change touches) so the acceptance criteria are reviewable before
   code. If the change alters architecture (new dependency, new pattern, data model
   change), run `adr`. Check `docs/adr/` first: if an Accepted ADR conflicts, the
   change must `supersede` it, never quietly contradict it.

4. **Build**: run `feature-dev`. Smallest diff that meets the acceptance criteria.
   Log slices in `04-build-log.md`, **including before/after behavior** — the explainer
   needs it.

5. **Docs**: run `feature-docs` in change mode: update the docs that already exist
   (README sections, CHANGELOG, API docs) rather than writing new ones.

6. **Explain**: run `feature-explainer`. For a change, the page leads with before → after.

7. **Learn**: if recon found a non-obvious convention, offer to save it to the project's
   CLAUDE.md so the next change starts smarter (`skill-forge` covers this).

## Rules
- Never refactor unrelated code. Put "noticed but didn't touch" items in the build log.
- Run the existing test suite before and after. If tests were already failing, record
  that before you start so the failures aren't blamed on the change.
- Commit only when asked. If asked, one commit per slice with clear messages.
