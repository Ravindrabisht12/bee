---
name: skill-forge
description: The library's learning loop. Turns a lesson, correction, or repeated workflow into a new skill or an improvement to an existing one, so you never have to re-type the same prompt. Use after a pipeline run that needed corrections, when the user says "remember how we did this", "make this a skill", "save this workflow", "next time do X", or when you notice you've done the same multi-step task twice.
---

# Skill Forge

Inspired by Hermes Agent's loop of creating skills from experience: every project
should leave the library a little smarter.

## Step 1: Decide what kind of lesson it is

| Lesson | Where it goes |
|--------|---------------|
| Specific to one project ("this repo uses pnpm", "API base is /v2") | that project's `CLAUDE.md` |
| Improves an existing stage ("research must check G2 reviews") | patch that skill's `SKILL.md` |
| A new reusable workflow ("set up Stripe billing", "SEO audit") | new skill folder |
| A one-off | nowhere; don't bloat the library |

Always also append a dated line to `.forge/learnings.md`:
`- 2026-11-23 · feature-dev · Always run DB migrations before tests (cost 20 min).`

## Step 2a: Patch an existing skill
- Find the library: `$SKILL_TO_KILL_HOME`, else the folder `~/.claude/skills/<name>`
  symlinks to.
- Make the **smallest** edit that would have prevented the problem, put it in the step
  where it applies, and give the reason in a few words. Rules with reasons generalize;
  bare commands don't.
- Don't let a skill grow past ~200 lines. Move detail into `references/*.md` and link to it.

## Step 2b: Create a new skill
1. Copy `assets/SKILL.template.md` to `skills/<kebab-name>/SKILL.md` in the library.
2. **The description is the trigger.** Say what it does AND when to use it, with the
   phrases a user would actually type. That's how agents choose skills.
3. Body: purpose, inputs, numbered steps, output format, rules. If the skill produces
   files, use the `.forge/` contract
   (`product-builder/references/workspace.md`) so it chains with the others.
4. Deterministic or repeated mechanics (formatting, validation, scaffolding) go in
   `scripts/`. Long reference material goes in `references/`. Templates go in `assets/`.
5. If it's a pipeline stage, add it to the table in `product-builder/SKILL.md`.

## Step 3: Make it available
Run `./install.sh` from the library root (it symlinks, so edits go live immediately).
Mention the change to the user in one line: what was learned and where it went.

## Ask first when
The change rewrites a stage's core behavior, or deletes rules. Small additive lessons
can be applied directly, then reported.
