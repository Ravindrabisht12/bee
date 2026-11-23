# Contributing

Contributions of new skills, skill improvements, and bee fixes are all welcome.

## Add or improve a skill

1. Create `skills/<name>/SKILL.md`. Start from `skills/skill-forge/assets/SKILL.template.md`.
   - The `description` frontmatter is what makes an agent pick the skill. Say what it
     does **and** when to use it, with phrases users actually type.
   - Keep `SKILL.md` under ~200 lines. Put long material in `references/`, scripts in
     `scripts/` (stdlib only), and templates in `assets/`.
   - If the skill writes files that other skills read, follow the `.forge/` contract
     in `skills/product-builder/references/workspace.md`.
2. Add an entry to `registry.json` (`name`, `source: "bee:<name>"`, `summary`, `tags`,
   and optionally `requires`, `agents`, `for`).
3. Try it in a real project: `BEE_HOME=$PWD node dist/bee.mjs add <name>` from that
   project's folder.

Third-party skills don't need to live here. To list one in the registry, add an entry
whose `source` is `github:owner/repo/path`.

## Change bee itself

```bash
npm install
npm run check        # strict typecheck + end-to-end tests
npm run build        # regenerate dist/bee.mjs and commit it (CI checks it's up to date)
```

Code lives in `src/`; tests in `test/bee.test.mjs` are offline and run against the built CLI.

## Pull requests

- One topic per PR, with a short description of the problem and how you checked the fix.
- CI must pass. It runs the tests on Linux and macOS, checks that `dist/` is up to
  date, and runs shellcheck on the installer.
