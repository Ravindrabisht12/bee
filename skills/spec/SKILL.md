---
name: spec
description: Writes and maintains feature specs in docs/specs/: goal, non-goals, requirements, numbered acceptance criteria (S3-AC1 style), API/data contracts, edge cases, and status. Also traces which acceptance criteria are covered by tests. Use before building any non-trivial feature, as the contract between design and build, and whenever the user says "write a spec", "spec this out", "PRD", "requirements", "acceptance criteria", or "does the code match the spec?".
---

# Spec

A spec is the **contract**: humans review and approve it, agents build against it,
tests prove it. Keep it short, testable, and current.

## Tooling
```bash
S=<this-skill-dir>/scripts/spec.py
python3 $S new "Shareable blob links"     # docs/specs/NNNN-....md (status: Draft)
python3 $S list
python3 $S status 3 Approved              # Draft | Approved | Implemented | Superseded
python3 $S trace 3                        # which S3-ACn IDs appear in tests/code, and which are missing
python3 $S trace --all
python3 $S index                          # rebuild docs/specs/README.md
```
`--dir` overrides the folder. Reuse an existing `docs/prd/` or `specs/` folder if
the project already has one.

## Writing a spec
Fill in the generated file. Inputs: the brief, `03-design.md`, research, and related ADRs.
- **Goal:** the user outcome in 1–2 sentences. **Non-goals** are required; they stop
  scope creep.
- **Requirements:** `R1`, `R2`… each one a "must". Non-functional ones too
  (performance, a11y, security, privacy).
- **Acceptance criteria:** `S<spec#>-AC<n>`, written as **Given / When / Then**. Each
  one is independently testable. Cover the empty, error, and permission cases, not just
  the happy path.
- **Contracts:** API endpoints (method, path, request/response shapes, errors), events,
  and data model changes. These are exact, not prose.
- **Open questions:** anything that blocks approval. Ask the user instead of guessing on
  anything that changes behavior.
- **Decisions:** link the ADRs. The spec says *what*; ADRs say *why this way*.

## Lifecycle
1. Draft → show the user the Goal, Non-goals, and AC list → **Approved** on their OK.
2. While building, every test that proves a criterion mentions its ID in the test name
   or a comment, e.g. `it("S3-AC2: expired link returns 410", …)`.
3. Before calling a feature done, run `trace`. Every AC must be covered, or have a
   written reason why not (e.g. manual check). Then set the status to **Implemented**.
4. Behavior changed later? Update the spec in the same change. A stale spec is worse
   than none.

Small change (one file, obvious behavior)? Skip the spec, but say so.
