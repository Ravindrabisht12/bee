# skill-to-kill · 🐝 bee

**Your project's process, as code.** `.bees` declares which agent skills a project
runs on, `.bees.lock` pins exactly what was installed, and the `bee` CLI installs them
anywhere. Any language: Java, Python, Go, JS… Clone a repo, run `bee install`, and your agent works the way
the team works. Your job becomes **reviewing specs, decisions, and explainers**, not
re-typing prompts.

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USER/skill-to-kill/main/install.sh | bash
```

```bash
bee init        # interview → decision step picks skills → .bees → install
bee install     # teammate after cloning: get exactly the pinned skills
bee add pdf     # add more any time (registry name, github:…, or ./local)
```

## Why a manifest and a lockfile

| npm | bee |
|-----|-----|
| `package.json` | `.bees`: skills this project uses (JSON; commit it) |
| `package-lock.json` | `.bees.lock`: exact commit + content hash of each skill (commit it) |
| `node_modules/` | `.claude/skills/*`: restored by `bee install` (auto-gitignored) |
| `npm ci` | `bee install --frozen`: fail instead of drifting (CI) |

Skills are instructions your agent follows and scripts it runs. That's closer to code
than to config, so bee treats them like dependencies:
- Each skill is pinned to an exact commit and content hash.
- If a skill's content no longer matches its pin, bee refuses to install it.
- Local edits to an installed skill are never silently overwritten.
- bee warns you about any source that isn't in the registry.

## `bee init`: the decision step

It asks what you're building (web app, API, mobile, e-commerce, AI agent…), whether
it's new or existing (it also detects this from the repo), how much of the process
skills should run, and which agents you use. Then it recommends skills with reasons,
and you can toggle any skill in the registry on or off.

- `bee init --ai` asks Claude (via the `claude` CLI) to make the choice, with reasons.
- `bee init --yes --type api --stage new` runs without prompts.
- Inside an agent session, the `skill-advisor` skill does the same job later
  ("what skills does this project need?").

`init` also adds a short **working agreement** to `CLAUDE.md` and, if you agree, a
Claude Code `SessionStart` hook. With the hook, opening the project runs
`bee install` automatically, so teammates' skills are always present.

## The skills

| Skill | What it does |
|-------|--------------|
| `product-builder` | **Orchestrator, new product:** research → competitors → design → spec/ADR → build → docs → explainer |
| `feature-change` | **Orchestrator, existing app:** recon → design → spec/ADR → build → docs → explainer |
| `product-research` | Users, pain points, demand, with sources |
| `competitor-analysis` | Landscape, feature matrix, gaps, positioning |
| `product-design` | MVP scope, flows, wireframes, tokens, data model, stack |
| **`spec`** | `docs/specs/NNNN-*.md` with `S<n>-AC<m>` acceptance criteria; `spec.py trace` proves test coverage |
| **`adr`** | `docs/adr/NNNN-*.md` decision records: agents **propose**, humans **accept**; supersede, never edit |
| `feature-dev` | Builds in verified slices against the spec; AC IDs go in test names |
| `feature-docs` | README / architecture / CHANGELOG from what actually exists |
| `feature-explainer` | Interactive page: what was built, plus **specs coverage and ADRs awaiting review** |
| `skill-forge` | Learning loop: corrections → skill patches or new skills |
| `skill-advisor` | Decision agent: recommends skills to add or remove, then applies them with bee |

The registry (`registry.json`) also lists Anthropic's public skills
(`frontend-design`, `webapp-testing`, `mcp-builder`, `claude-api`, `pdf`, …), and
`bee add` accepts any git repo that contains a `SKILL.md`.

### The review loop
```
you: "build blobby"
 → agent writes specs + Proposed ADRs ──▶ YOU REVIEW (approve the contract, not the code)
 → agent builds against the ACs, tests cite AC IDs, `spec.py trace` must be green
 → explainer.html shows what was built, spec coverage, and ADRs still waiting ──▶ YOU REVIEW
```

## Install bee

```bash
curl -fsSL https://raw.githubusercontent.com/YOUR_GITHUB_USER/skill-to-kill/main/install.sh | bash
```

- **No Node, Python, or npm needed.** You get a standalone binary for your platform
  (macOS arm64/x64, Linux x64/arm64), so it works the same in a Java, Go, or Python
  project.
- The binary is checksum-verified and installed to `~/.bee/bin`, which gets added to
  your PATH.
- `bees` is an alias for `bee`.
- Update later with `bee upgrade`.
- Pick a version or a fork with `BEE_VERSION=v0.3.0` or `BEE_REPO=you/fork`, set
  before `bash`.
- Windows: run it in WSL, or download `bee-windows-x64.zip` from Releases.
- If a platform has no prebuilt binary and Node 18+ is installed, the installer falls
  back to a source install.
- Node users can also run `npm i -g github:YOUR_GITHUB_USER/skill-to-kill`.

Some skills (`spec`, `adr`, `feature-explainer`) ship small Python helper scripts, so
agents need `python3` to run those. macOS and most Linux distributions include it.

Using the skills without bee:
- `scripts/link-skills.sh` symlinks every skill into `~/.claude/skills` (global;
  `--hermes` for Hermes).
- Use the repo as a Claude Code plugin (`.claude-plugin/`).

Prefer bee's per-project install for team projects. If you also keep the global
symlinks, the same skill appears twice.

## Sources `bee add` understands

```
frontend-design                                  # registry name
github:owner/repo/path/to/skill#v1.2             # GitHub (any ref: tag, branch, commit)
git+https://host/repo.git::path/to/skill#main    # any git host
./tools/skills/deploy                            # a skill living in this repo
```

## Layout

```
src/                        the CLI in TypeScript (strict), split by concern:
  cli.ts                      argument parsing + command dispatch
  commands.ts                 init / install / add / remove / update / list / search / upgrade
  install.ts                  install engine: lock, integrity, pruning, .gitignore, CLAUDE.md, hook
  sources.ts                  bee: / github: / git+ / file: sources, git cache, pinning
  recommend.ts                project detection + rule-based and Claude-based skill choice
dist/bee.mjs                built single-file CLI (committed, so source installs need no build step)
install.sh                  the curl | bash installer (downloads release binaries)
scripts/package-release.sh  builds standalone binaries with Bun → release/*.tar.gz + SHA256SUMS
.github/workflows/          CI (tests on every PR) and Release (binaries on every v* tag)
test/bee.test.mjs           end-to-end tests (offline; a local git repo stands in for GitHub)
registry.json               skill catalog used by init / search / skill-advisor
skills/<name>/SKILL.md      the skills (+ scripts/, references/, assets/)
agents/*.md                 subagents installed alongside the skills that use them
examples/library-tour/      sample explainer
```

## Developing bee

```bash
npm install          # dev tools only: typescript, esbuild, @types/node (bee itself has zero runtime deps)
npm run typecheck    # tsc --strict
npm test             # build + end-to-end tests
npm run check        # both
```

Releasing: bump `version` in `package.json`, commit, then `git tag v0.3.0 && git push --tags`.
The Release workflow builds the binaries, smoke-tests them through `install.sh`, and
publishes them; `curl … | bash` picks them up immediately.

See [CONTRIBUTING.md](CONTRIBUTING.md) to add a skill or improve bee.
