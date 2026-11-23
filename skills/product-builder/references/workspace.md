# The `.forge/` workspace contract

Every skill in this library reads and writes the same folder at the root of the
project being built or changed. That shared contract is what lets the skills chain
without anyone re-typing prompts.

```
.forge/
  <slug>/                  # one folder per product or per change request
    STATE.md               # pipeline status — the resume point
    00-brief.md            # what & why (intake)
    01-research.md         # market, users, problems          (product-research)
    02-competitors.md      # who else, gaps, positioning      (competitor-analysis)
    03-design.md           # MVP scope, flows, screens, data  (product-design)
    design/                # optional wireframes / mockups (HTML/SVG/PNG)
    04-build-log.md        # what was actually built, slice by slice (feature-dev)
    05-docs.md             # pointer + summary of docs written (feature-docs)
    explainer.json         # data behind the explainer       (feature-explainer)
    explainer.html         # THE page the end person reads
  learnings.md             # cross-project lessons (skill-forge)
```

Slugs: lowercase, hyphenated. For changes, use `change-<short-name>` (e.g.
`change-dark-mode`).

Durable project docs live in the repo, not in `.forge/`:

```
docs/specs/NNNN-*.md   # feature contracts with S<n>-AC<m> acceptance criteria  (spec)
docs/adr/NNNN-*.md     # decision records                                       (adr)
```

## STATE.md format

```markdown
# <Product or change name>
mode: build | change
started: 2026-11-23

| stage        | status | notes |
|--------------|--------|-------|
| brief        | done   | 2 assumptions |
| research     | done   | |
| competitors  | doing  | |
| design       | todo   | |
| spec+adr     | todo   | |
| build        | todo   | |
| docs         | todo   | |
| explain      | todo   | |
```

## 00-brief.md format

```markdown
# <Name> — brief
**One-liner:** …
**Who it's for:** …
**Problem:** …
**Must-have (v1):** - … 
**Out of scope:** - …
**Platform / constraints:** … (assumed)
**Success looks like:** …
```

## 04-build-log.md entry format (one per slice)

```markdown
## Slice 3 — Share a blob via link
- **What:** users can generate a public link for any blob
- **Why:** design §2.3, top competitor gap
- **Files:** `src/routes/share.ts` (new), `src/db/schema.ts` (+`shares` table)
- **How it works:** one or two sentences
- **Verified:** `npm test` 24/24, manual: created link, opened in incognito
- **Deviations from design:** none | <what and why>
```

The explainer is built mostly from the build log, so write it for a reader who
was not in the room.

## Should `.forge/` be committed?
Yes, by default. It's the project's decision record. Add it to `.gitignore` only if
the user asks.
