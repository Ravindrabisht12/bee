---
name: adr
description: Records architecture and product decisions as numbered ADRs (Architecture Decision Records) in docs/adr/: context, options considered, decision, consequences. Agents propose, humans accept. Use whenever a decision is costly to reverse (framework, database, hosting, auth, data model, API style, major library, structural pattern), when a build deviates from the design, or when the user says "write an ADR", "record this decision", "why did we choose X", or "supersede that decision".
---

# ADR: Architecture Decision Records

An ADR is a short, permanent record of **one** decision: why it was made, which
alternatives lost, and what it costs. ADRs are the main thing a human reviews when
agents do the building, so write them to be reviewed in two minutes.

## When to write one
Write one when reversing the decision later would take more than a day, or when a
future developer would reasonably ask "why is it like this?". Examples: stack choice,
database, auth approach, state management, monorepo vs. multi-repo, a dropped feature,
a deviation from the design.
Don't write one for naming, formatting, or anything a linter enforces.

## Tooling (use the script; don't number files by hand)
```bash
S=<this-skill-dir>/scripts/adr.py
python3 $S new "Use PostgreSQL for primary storage"      # creates docs/adr/NNNN-....md (status: Proposed)
python3 $S list                                          # number, status, title
python3 $S status 3 Accepted                             # Proposed | Accepted | Rejected | Deprecated
python3 $S supersede 3 "Move to SQLite for single-node"  # new ADR, links both ways, old → Superseded
python3 $S index                                         # rebuild docs/adr/README.md
```
Add `--dir path` if the project keeps ADRs somewhere else (check for `docs/decisions/`
or `adr/` first and reuse it).

## Writing it
After `new`, fill in the generated file:
1. **Context:** the forces at play, in 3–6 sentences: requirements (link the spec),
   constraints, team skills, scale. No solution yet.
2. **Options considered:** at least 2 real options, each with honest pros/cons. Include
   "do nothing" when relevant.
3. **Decision:** one sentence starting with "We will…", then the deciding reason.
4. **Consequences:** what gets easier, what gets harder, and what we must now do
   (follow-ups). Negative consequences are required. An ADR without costs is an ad.
5. **Links:** the spec IDs, research/competitor docs, and related ADRs.

## Status rules
- Agents create ADRs as **Proposed**. Only change to **Accepted** when the user approves,
  or explicitly pre-authorized "accept your own ADRs".
- Accepted ADRs are immutable. To change a decision, `supersede` it. Never edit history.
- When you finish a pipeline stage that created ADRs, list the Proposed ones for the
  user in one line each: `ADR-0004 Use Stripe Checkout (Proposed)`.
