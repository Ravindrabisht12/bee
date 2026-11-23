# 🐝 bee

**Skills for agent-driven projects.** Declare which AI-agent skills a project runs on
and pin them, so every teammate's agent works the same way. Your job becomes reviewing
specs, decisions, and explainers, not re-typing prompts.

Works with Claude Code and any agent that reads `SKILL.md` folders, in any language:
Java, Python, Go, JavaScript…

```bash
curl -fsSL https://raw.githubusercontent.com/Ravindrabisht12/bee/main/install.sh | bash
```

```bash
cd your-project
bee init                 # answer a few questions → bee picks skills → writes .bees → installs
bee search testing       # find more skills
bee add webapp-testing   # add one
git add .bees .bees.lock CLAUDE.md && git commit -m "Add agent skills"
```

A teammate clones the repo and runs `bee install`, or just opens it in Claude Code,
where a hook installs the skills automatically.

---

## Contents

- [How it works](#how-it-works)
- [Install](#install)
- [Updating bee](#updating-bee)
- [Finding skills](#finding-skills)
- [Commands](#commands)
- [The skills](#the-skills)
- [Contributing](#contributing)

## How it works

| npm | bee |
|-----|-----|
| `package.json` | **`.bees`**: the skills this project uses (JSON; commit it) |
| `package-lock.json` | **`.bees.lock`**: exact commit + content hash of every skill (commit it) |
| `node_modules/` | `.claude/skills/*`: restored by `bee install` (auto-gitignored) |
| `npm ci` | `bee install --frozen`: fail instead of drifting (for CI) |

Skills are instructions an agent follows and scripts it runs. That's closer to code
than to config, so bee treats them like dependencies:
- Each skill is pinned to an exact commit and content hash.
- If a skill's content no longer matches its pin, bee refuses to install it.
- Local edits to an installed skill are never silently overwritten.
- bee warns before adding a source that isn't in the registry.

**`bee init` is the decision step.** It asks:
- what you're building (and detects it from `package.json`, `pom.xml`, `go.mod`, …)
- whether the project is new or existing
- how much of the process skills should run
- which agents you use

Then it recommends skills with a reason for each, and you can toggle any of them.
`bee init --ai` lets Claude make the choice instead. Later, the `skill-advisor` skill
does the same job inside an agent session.

`init` also writes a short **working agreement** into `CLAUDE.md`: specs before code,
ADRs for big decisions, and an explainer at the end. It can add a Claude Code
`SessionStart` hook so skills install themselves.

## Install

```bash
curl -fsSL https://raw.githubusercontent.com/Ravindrabisht12/bee/main/install.sh | bash
```

- **No Node, Python, or npm needed.** You get a standalone binary for macOS
  (Apple Silicon / Intel) or Linux (x64 / arm64).
- The binary is checksum-verified and installed to `~/.bee/bin`, which gets added to
  your PATH.
- `bees` is an alias for `bee`.

| Option | Example |
|--------|---------|
| Specific version | `curl -fsSL …/install.sh \| BEE_VERSION=v0.3.0 bash` |
| Install somewhere else | `… \| BEE_INSTALL_DIR=/opt/bee bash` |
| Don't edit shell profile | `… \| BEE_NO_MODIFY_PATH=1 bash` |
| From a fork | `… \| BEE_REPO=you/bee bash` |

**Windows:** run the installer in WSL, or download `bee-windows-x64.zip` from
[Releases](https://github.com/Ravindrabisht12/bee/releases).
**No prebuilt binary for your platform?** If Node 18+ is installed, the installer
builds from source automatically.

Some skills (`spec`, `adr`, `feature-explainer`) ship small Python helper scripts, so
agents need `python3` to run those. macOS and most Linux distributions include it.

## Updating bee

```bash
bee upgrade            # install the latest release
bee upgrade --check    # just tell me if there's a newer one
```

- **bee tells you when an update exists.** Once a day it checks GitHub for the latest
  release and prints one line:
  `🐝 bee 0.4.0 is available (you have 0.3.0). Update: bee upgrade`.
  The check is silent in CI and in scripts, and you can turn it off with
  `BEE_NO_UPDATE_CHECK=1`.
- **Updating your projects:** the bundled skills ship with bee. After `bee upgrade`,
  run `bee update` in a project to move it to the new skill versions, then commit
  `.bees.lock`.
- **Mixed versions on a team:** if a teammate has an older or newer bee than the one
  that wrote `.bees.lock`, `bee install` tells them exactly what to do: either
  `bee upgrade` or `bee update`.

**For maintainers:** pushing code to `main` doesn't change anything for users.
Publishing a **release** does:

```bash
# 1. bump "version" in package.json (e.g. 0.4.0), commit, push
# 2. tag it:
git tag v0.4.0 && git push origin v0.4.0
```

The tag triggers the Release workflow. It runs the tests, builds binaries for every
platform, smoke-tests them through `install.sh`, and publishes them on the Releases
page. From then on:
- new installs get v0.4.0
- existing users see the update notice within a day
- `bee upgrade` installs it

## Finding skills

```bash
bee search                      # list every skill
bee search test                 # best match first: webapp-testing, feature-dev, …
bee search decision record      # every word must match → adr
bee search --tag docs           # by tag
bee search --for api            # recommended for a project type
bee info spec                   # what it does, what bundles it, whether it's installed
bee search testing --json       # for scripts and agents
```

Tags in the registry include `pipeline`, `research`, `design`, `specs`, `adr`,
`build`, `testing`, `docs`, `review`, `frontend`, `ai`, `mcp`, and `files`.

Any git repo that contains a `SKILL.md` works, even if it isn't in the registry:

```bash
bee add github:owner/repo/path/to/skill#v1.2       # GitHub (tag, branch, or commit)
bee add git+https://host/repo.git::path/to/skill   # any git host
bee add ./tools/skills/deploy                      # a skill inside your own repo
```

## Commands

| Command | What it does |
|---------|--------------|
| `bee init` | Interview → recommended skills → `.bees` → install (`--ai`, `--yes`) |
| `bee install` | Install exactly what `.bees` / `.bees.lock` declare (`--frozen` for CI) |
| `bee add <skill…>` | Add skills by registry name or source |
| `bee remove <skill…>` | Remove skills (and bundled skills nothing else needs) |
| `bee update [skill]` | Move skills to their newest versions and re-pin |
| `bee list` | Installed skills and whether they match the lock |
| `bee search [words…]` | Find skills (`--tag`, `--for`, `--json`) |
| `bee info <skill>` | Details for one skill |
| `bee upgrade` | Update bee itself (`--check`) |

## The skills

| Skill | What it does |
|-------|--------------|
| `product-builder` | **Orchestrator, new product:** research → competitors → design → spec/ADR → build → docs → explainer |
| `feature-change` | **Orchestrator, existing app:** recon → design → spec/ADR → build → docs → explainer |
| `product-research` | Users, pain points, demand, with sources |
| `competitor-analysis` | Landscape, feature matrix, gaps, positioning |
| `product-design` | MVP scope, flows, wireframes, tokens, data model, stack |
| `spec` | `docs/specs/` with `S<n>-AC<m>` acceptance criteria; `spec.py trace` proves test coverage |
| `adr` | `docs/adr/` decision records: agents **propose**, humans **accept**; supersede, never edit |
| `feature-dev` | Builds in verified slices against the spec; AC IDs go in test names |
| `feature-docs` | README / architecture / CHANGELOG from what actually exists |
| `feature-explainer` | One interactive page: what was built, spec coverage, ADRs awaiting review |
| `skill-forge` | Learning loop: corrections → skill patches or new skills |
| `skill-advisor` | Decision agent: recommends skills to add or remove and applies them with bee |

The registry also lists Anthropic's public skills: `frontend-design`,
`webapp-testing`, `mcp-builder`, `claude-api`, `skill-creator`, `pdf`, `docx`,
`xlsx`, `pptx`, and more.

**The review loop:**
```
you: "build blobby"
 → agent writes specs + Proposed ADRs ─────────────▶ YOU REVIEW (approve the contract, not the code)
 → agent builds against the acceptance criteria; spec.py trace must be green
 → explainer.html: what was built, coverage, ADRs still waiting ─▶ YOU REVIEW
```

See a sample explainer: [`examples/library-tour/explainer.html`](examples/library-tour/explainer.html).

**Using the skills without bee:**
- `scripts/link-skills.sh` symlinks every skill into `~/.claude/skills`
  (`--hermes` for Hermes Agent).
- Add this repo as a Claude Code plugin marketplace (`.claude-plugin/`).

## Contributing

New skills, improvements, and fixes are welcome. See [CONTRIBUTING.md](CONTRIBUTING.md).

```
src/                        bee CLI (TypeScript, strict, zero runtime dependencies)
dist/bee.mjs                built CLI (committed; used by source installs)
test/bee.test.mjs           end-to-end tests (offline)
install.sh                  curl | bash installer
scripts/package-release.sh  builds standalone binaries (Bun) + SHA256SUMS
registry.json               the skill catalog behind init / search / info
skills/<name>/SKILL.md      the skills
agents/*.md                 subagents installed with the skills that use them
.github/workflows/          CI on every PR; binaries on every v* tag
```

```bash
npm install && npm run check    # typecheck + tests
```

## License

[MIT](LICENSE): free to use, modify, and share. Contributions are accepted under the same license.
