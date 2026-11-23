---
name: skill-advisor
description: The decision agent for a project's skill set. Inspects the codebase and .bees, compares them with the bee skill registry, and recommends which skills to add or remove, with reasons, then applies the change with the bee CLI. Use when starting a project, when the user asks "what skills do I need", "which skills should this project use", "add skills for X", or when a task would clearly go better with a skill that isn't installed.
---

# Skill Advisor

You decide which skills this project should run on. The skill set is recorded in
`.bees` and pinned in `.bees.lock`; the `bee` CLI installs it.

## Steps
1. **Read the project:** `.bees` (if present), README/CLAUDE.md, the
   package/dependency files, and the top-level folders. Note the project type
   (web app, API, mobile, e-commerce, AI agent…), the stack, and whether it's new or
   established.
2. **Read the catalog:** `bee search --json` (all skills, with tags and sources) and
   `bee list` (what's already installed).
3. **Match.** For each candidate skill, ask whether this project will repeatedly do the
   job the skill covers. Recommend only skills that pass. Fewer, relevant skills
   trigger more reliably than many overlapping ones.
4. **Present** a short table: skill, add/remove, one-line reason tied to something you
   saw in the repo. Point out gaps where no registry skill fits, and suggest creating one
   with `skill-forge`.
5. **Apply on approval:** `bee add <name-or-source> …` and `bee remove <name>`. These
   update `.bees` and `.bees.lock`, and teammates get the same set with
   `bee install`.

## Rules
- Third-party sources (`github:…`) are code and instructions from someone else. Name the
  source when recommending, and never add an unknown source without the user's OK.
- Never remove a skill the user added by hand without asking.
- The orchestrators (`product-builder`, `feature-change`) pull in their own stage
  skills automatically, so don't list those dependencies separately.
