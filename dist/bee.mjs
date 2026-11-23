#!/usr/bin/env node

// src/config.ts
import fs2 from "node:fs";
import os from "node:os";
import path2 from "node:path";
import { fileURLToPath } from "node:url";

// src/fsutil.ts
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
var IGNORE = /* @__PURE__ */ new Set([".git", ".DS_Store", "node_modules", "__pycache__"]);
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}
function writeJSON(p, v) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + "\n");
}
var sortKeys = (o) => Object.fromEntries(Object.keys(o).sort().map((k) => [k, o[k]]));
function listFiles(dir, base = dir) {
  let out = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name < b.name ? -1 : 1);
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(p, base));
    else if (e.isFile()) out.push(path.relative(base, p).split(path.sep).join("/"));
  }
  return out;
}
function hashDir(dir) {
  const h = crypto.createHash("sha256");
  for (const f of listFiles(dir)) {
    h.update(f);
    h.update("\0");
    h.update(fs.readFileSync(path.join(dir, f)));
    h.update("\0");
  }
  return "sha256-" + h.digest("base64");
}
function copyDir(src, dest) {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, filter: (s) => !IGNORE.has(path.basename(s)) });
}
function frontmatter(skillDir) {
  const p = path.join(skillDir, "SKILL.md");
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, "utf8").match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm = {};
  if (m) for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].trim();
  }
  return fm;
}

// src/config.ts
function findLib() {
  const candidates = [process.env.BEE_HOME];
  try {
    candidates.push(path2.resolve(path2.dirname(fileURLToPath(import.meta.url)), ".."));
  } catch {
  }
  candidates.push(path2.resolve(path2.dirname(process.execPath), ".."));
  for (const c of candidates) if (c && fs2.existsSync(path2.join(c, "registry.json"))) return c;
  console.error("bee: cannot find its skill library (registry.json). Reinstall bee, or set BEE_HOME.");
  process.exit(1);
}
var LIB = findLib();
var PKG = readJSON(path2.join(LIB, "package.json"));
var REGISTRY = readJSON(path2.join(LIB, "registry.json"));
var REPO = process.env.BEE_REPO || "Ravindrabisht12/bee";
var INSTALL_URL = `https://raw.githubusercontent.com/${REPO}/main/install.sh`;
var MANIFEST = ".bees";
var LOCKFILE = ".bees.lock";
var LEGACY_MANIFEST = "harness.json";
var LEGACY_LOCKFILE = "harness.lock";
var CACHE = process.env.BEE_CACHE || path2.join(os.homedir(), ".bee", "cache");
var TARGETS = {
  claude: { skills: ".claude/skills", agents: ".claude/agents", label: "Claude Code (.claude/skills)" },
  agents: { skills: ".agents/skills", agents: null, label: "Other agents (.agents/skills)" }
};
var GITIGNORE_HEADER = "# Managed by bee: restored by `bee install` from .bees. Do not edit.";
var HOOK_CMD = 'if command -v bee >/dev/null 2>&1; then bee install --quiet; else echo "This project declares agent skills in .bees, but the bee CLI is not installed, so they are missing."; fi';
var PROJECT_TYPES = [
  ["web-app", "Web app (SaaS, dashboard, internal tool)"],
  ["mobile-app", "Mobile app"],
  ["api", "API / backend service"],
  ["ecommerce", "E-commerce / Shopify"],
  ["marketing-site", "Marketing site / landing pages"],
  ["ai-agent", "AI agent / LLM / MCP app"],
  ["cli-lib", "CLI tool or library"],
  ["other", "Something else"]
];
var WORKFLOWS = [
  ["full", "Full pipeline: research \u2192 competitors \u2192 design \u2192 spec/ADR \u2192 build \u2192 docs \u2192 explainer"],
  ["build", "Build pipeline: design \u2192 spec/ADR \u2192 build \u2192 docs \u2192 explainer"],
  ["lean", "Lean: spec/ADR \u2192 build \u2192 docs"]
];
var regEntry = (name) => REGISTRY.skills.find((s) => s.name === name);

// src/commands.ts
import fs7 from "node:fs";
import os3 from "node:os";
import path7 from "node:path";
import { spawnSync as spawnSync3 } from "node:child_process";

// src/update.ts
import fs3 from "node:fs";
import os2 from "node:os";
import path3 from "node:path";

// src/ui.ts
var useColor = !!process.stdout.isTTY && !process.env.NO_COLOR;
var paint = (n) => (s) => useColor ? `\x1B[${n}m${s}\x1B[0m` : String(s);
var bold = paint(1);
var dim = paint(2);
var red = paint(31);
var green = paint(32);
var yellow = paint(33);
var cyan = paint(36);
var quiet = false;
var setQuiet = (q) => {
  quiet = q;
};
var isQuiet = () => quiet;
var log = (...a) => {
  if (!quiet) console.log(...a);
};
var warn = (m) => console.error(yellow("! ") + m);
var BeeError = class extends Error {
};
var die = (m) => {
  throw new BeeError(m);
};
var short = (r) => r && /^[0-9a-f]{40}$/.test(r) ? r.slice(0, 10) : r ?? "";

// src/update.ts
function compareVersions(a, b) {
  const pa = a.replace(/^v/, "").split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, "").split(/[.-]/).map((n) => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}
var STATE_FILE = path3.join(process.env.BEE_STATE_DIR || path3.join(os2.homedir(), ".bee"), "update-check.json");
var DAY = 24 * 60 * 60 * 1e3;
function readState() {
  try {
    return JSON.parse(fs3.readFileSync(STATE_FILE, "utf8"));
  } catch {
    return { checkedAt: 0, latest: null };
  }
}
function writeState(s) {
  try {
    fs3.mkdirSync(path3.dirname(STATE_FILE), { recursive: true });
    fs3.writeFileSync(STATE_FILE, JSON.stringify(s));
  } catch {
  }
}
async function fetchLatestVersion(timeoutMs = 1500) {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { "User-Agent": "bee-cli", Accept: "application/vnd.github+json" },
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j.tag_name ?? null;
  } catch {
    return null;
  }
}
async function notifyIfOutdated() {
  if (process.env.BEE_NO_UPDATE_CHECK || process.env.CI || !process.stderr.isTTY || isQuiet()) return;
  let state = readState();
  if (Date.now() - state.checkedAt > DAY) {
    state = { checkedAt: Date.now(), latest: await fetchLatestVersion() ?? state.latest };
    writeState(state);
  }
  if (state.latest && compareVersions(state.latest, PKG.version) > 0) {
    console.error(yellow(`
\u{1F41D} bee ${state.latest.replace(/^v/, "")} is available (you have ${PKG.version}). Update: `) + cyan("bee upgrade"));
  }
}

// src/install.ts
import fs5 from "node:fs";
import path5 from "node:path";

// src/sources.ts
import fs4 from "node:fs";
import path4 from "node:path";
import crypto2 from "node:crypto";
import { spawnSync } from "node:child_process";
function parseSource(spec) {
  const splitRef = (s) => {
    const i = s.lastIndexOf("#");
    return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, null];
  };
  if (spec.startsWith("bee:")) return { kind: "bee", name: spec.slice(4) };
  if (spec.startsWith("github:")) {
    const [rest, ref] = splitRef(spec.slice(7));
    const [owner, repo, ...sub] = rest.split("/");
    if (!owner || !repo) die(`Bad source "${spec}". Use github:owner/repo[/path/to/skill][#ref]`);
    return { kind: "git", url: `https://github.com/${owner}/${repo}.git`, sub: sub.join("/"), ref };
  }
  if (spec.startsWith("git+")) {
    let [rest, ref] = splitRef(spec.slice(4));
    let sub = "";
    const i = rest.indexOf("::");
    if (i >= 0) {
      sub = rest.slice(i + 2);
      rest = rest.slice(0, i);
    }
    return { kind: "git", url: rest, sub, ref };
  }
  if (spec.startsWith("file:")) return { kind: "file", path: spec.slice(5) };
  if (/^(\.{1,2}\/|\/)/.test(spec)) return { kind: "file", path: spec };
  return null;
}
function resolveInput(arg, root) {
  const src = parseSource(arg);
  if (!src) {
    const e = regEntry(arg);
    if (!e) return die(`Unknown skill "${arg}". Try \`bee search ${arg}\`, or pass a source like github:owner/repo/path.`);
    return { name: e.name, spec: e.source };
  }
  const spec = src.kind === "file" && !arg.startsWith("file:") ? "file:" + arg : arg;
  let name;
  if (src.kind === "bee") name = src.name;
  else if (src.kind === "file") name = frontmatter(path4.resolve(root, src.path))?.name || path4.basename(src.path);
  else name = path4.basename(src.sub || src.url.replace(/\.git$/, ""));
  return { name, spec };
}
function git(args) {
  const r = spawnSync("git", args, { encoding: "utf8" });
  if (r.status !== 0) die(`git ${args.join(" ")} failed: ${(r.stderr || r.error?.message || "").trim()}`);
  return r.stdout.trim();
}
function tryRev(dir, rev) {
  const r = spawnSync("git", ["-C", dir, "rev-parse", "--verify", "--quiet", `${rev}^{commit}`], { encoding: "utf8" });
  return r.status === 0 ? r.stdout.trim() : null;
}
function gitCheckout(url, ref, lockedCommit, refresh) {
  const dir = path4.join(CACHE, crypto2.createHash("sha1").update(url).digest("hex").slice(0, 16));
  if (!fs4.existsSync(path4.join(dir, ".git"))) {
    fs4.mkdirSync(CACHE, { recursive: true });
    git(["clone", "--quiet", "--filter=blob:none", "--no-checkout", url, dir]);
  } else if (refresh || !lockedCommit || !tryRev(dir, lockedCommit)) {
    git(["-C", dir, "fetch", "--quiet", "--tags", "--force", "origin"]);
  }
  let sha = lockedCommit && !refresh ? tryRev(dir, lockedCommit) : null;
  if (lockedCommit && !refresh && !sha) die(`Locked commit ${lockedCommit.slice(0, 10)} not found in ${url}`);
  if (!sha) sha = ref ? tryRev(dir, `origin/${ref}`) || tryRev(dir, ref) : tryRev(dir, "origin/HEAD");
  if (!sha) return die(`Ref "${ref || "HEAD"}" not found in ${url}`);
  git(["-C", dir, "checkout", "--quiet", "--force", "--detach", sha]);
  return { dir, commit: sha };
}
function fetchSkill(spec, root, lockedCommit, refresh) {
  const src = parseSource(spec) ?? die(`Bad source "${spec}"`);
  let out;
  if (src.kind === "bee") out = { dir: path4.join(LIB, "skills", src.name), resolved: `bee@${PKG.version}`, kind: "bee" };
  else if (src.kind === "file") out = { dir: path4.resolve(root, src.path), resolved: "file", kind: "file" };
  else {
    const co = gitCheckout(src.url, src.ref, lockedCommit, refresh);
    out = { dir: src.sub ? path4.join(co.dir, src.sub) : co.dir, resolved: co.commit, commit: co.commit, kind: "git" };
  }
  if (!fs4.existsSync(path4.join(out.dir, "SKILL.md"))) die(`No SKILL.md found for ${spec} (looked in ${out.dir})`);
  return out;
}
function skillAgents(name, spec, dir) {
  const e = regEntry(name);
  const fromRegistry = e && e.source === spec ? (e.agents ?? []).map((a) => ({ name: a, file: path4.join(LIB, "agents", `${a}.md`) })) : [];
  const own = fs4.existsSync(path4.join(dir, "agents")) ? fs4.readdirSync(path4.join(dir, "agents")).filter((f) => f.endsWith(".md")).map((f) => ({ name: f.slice(0, -3), file: path4.join(dir, "agents", f) })) : [];
  return [...fromRegistry, ...own];
}

// src/install.ts
function findRoot(start = process.cwd()) {
  for (let d = path5.resolve(start); ; d = path5.dirname(d)) {
    if (fs5.existsSync(path5.join(d, MANIFEST))) return d;
    if (fs5.existsSync(path5.join(d, LEGACY_MANIFEST))) {
      migrateLegacy(d);
      return d;
    }
    if (path5.dirname(d) === d) return null;
  }
}
function migrateLegacy(root) {
  if (fs5.existsSync(path5.join(root, MANIFEST))) return;
  fs5.renameSync(path5.join(root, LEGACY_MANIFEST), path5.join(root, MANIFEST));
  if (fs5.existsSync(path5.join(root, LEGACY_LOCKFILE))) fs5.renameSync(path5.join(root, LEGACY_LOCKFILE), path5.join(root, LOCKFILE));
  warn(`Renamed ${LEGACY_MANIFEST} \u2192 ${MANIFEST} and ${LEGACY_LOCKFILE} \u2192 ${LOCKFILE}. Commit the rename.`);
}
function loadProject(root) {
  const manifest = readJSON(path5.join(root, MANIFEST));
  manifest.skills ||= {};
  const lockPath = path5.join(root, LOCKFILE);
  const lock = fs5.existsSync(lockPath) ? readJSON(lockPath) : { skills: {} };
  lock.skills ||= {};
  return { manifest, lock };
}
var targetsOf = (m) => (m.targets?.length ? m.targets : ["claude"]).map(
  (t) => TARGETS[t] ?? die(`Unknown target "${t}" (use: ${Object.keys(TARGETS).join(", ")})`)
);
function install(root, manifest, lock, opts = {}) {
  const { update = false, only = null, frozen = false, force = false } = opts;
  const targets = targetsOf(manifest);
  const queue = Object.entries(manifest.skills).map(([name, spec]) => ({ name, spec, requiredBy: null }));
  const done = /* @__PURE__ */ new Map();
  const results = [];
  const problems = [];
  while (queue.length) {
    const { name, spec, requiredBy } = queue.shift();
    const seen = done.get(name);
    if (seen) {
      if (requiredBy && seen.requiredBy && !seen.requiredBy.includes(requiredBy)) seen.requiredBy.push(requiredBy);
      continue;
    }
    const re = regEntry(name);
    if (re && re.source === spec) for (const r of re.requires ?? []) {
      const dep = regEntry(r);
      if (dep && !(r in manifest.skills)) queue.push({ name: r, spec: dep.source, requiredBy: name });
    }
    const owned = lock.skills[name];
    const prev = owned?.source === spec ? owned : null;
    const refresh = update && (!only || only.includes(name));
    let fetched;
    try {
      fetched = fetchSkill(spec, root, prev?.commit, refresh);
    } catch (e) {
      problems.push(`${name}: ${e.message}`);
      if (prev) done.set(name, { ...prev });
      continue;
    }
    const integrity = hashDir(fetched.dir);
    if (prev && prev.integrity !== integrity && !refresh) {
      if (fetched.kind === "file") warn(`${name}: local source changed since .bees.lock; accepting new content.`);
      else if (!force) {
        problems.push(lockMismatch(name, prev.resolved, fetched.resolved));
        done.set(name, { ...prev });
        continue;
      }
    }
    if (frozen && (!prev || prev.integrity !== integrity)) {
      problems.push(`${name}: ${prev ? "changed" : "missing"} in .bees.lock (--frozen). Run \`bee install\` without --frozen and commit the lock.`);
      continue;
    }
    let blocked = null;
    for (const t of targets) {
      const dest = path5.join(root, t.skills, name);
      if (!fs5.existsSync(dest) || force) continue;
      if (!owned) {
        blocked = `${path5.relative(root, dest)} exists and is not managed by bee (use --force to replace)`;
        break;
      }
      const current = hashDir(dest);
      if (current !== owned.integrity && current !== integrity) {
        blocked = "installed copy was edited locally; not overwriting (use --force, or move the edits into the skill's source)";
        break;
      }
    }
    if (blocked) {
      problems.push(`${name}: ${blocked}`);
      if (owned) done.set(name, { ...owned });
      continue;
    }
    const agents = skillAgents(name, spec, fetched.dir);
    for (const t of targets) {
      copyDir(fetched.dir, path5.join(root, t.skills, name));
      if (t.agents) for (const a of agents) {
        fs5.mkdirSync(path5.join(root, t.agents), { recursive: true });
        fs5.copyFileSync(a.file, path5.join(root, t.agents, `${a.name}.md`));
      }
    }
    const entry = { source: spec, resolved: fetched.resolved, integrity };
    if (fetched.commit) entry.commit = fetched.commit;
    if (agents.length) entry.agents = agents.map((a) => a.name);
    if (requiredBy) entry.requiredBy = [requiredBy];
    done.set(name, entry);
    results.push({ name, entry, changed: !prev || prev.integrity !== integrity });
  }
  const keep = new Set(done.keys());
  const keepAgents = new Set([...done.values()].flatMap((e) => e.agents ?? []));
  for (const [name, e] of Object.entries(lock.skills)) {
    if (!keep.has(name)) for (const t of targets) fs5.rmSync(path5.join(root, t.skills, name), { recursive: true, force: true });
    for (const a of e.agents ?? []) if (!keepAgents.has(a)) {
      for (const t of targets) if (t.agents) fs5.rmSync(path5.join(root, t.agents, `${a}.md`), { force: true });
    }
  }
  const newLock = { lockfileVersion: 1, generatedBy: `bee@${PKG.version}`, skills: sortKeys(Object.fromEntries(done)) };
  if (!frozen) writeJSON(path5.join(root, LOCKFILE), newLock);
  if (!manifest.vendor) writeGitignores(root, targets, [...keep], [...keepAgents]);
  syncClaudeMd(root, [...keep], false);
  return { results, problems, lock: newLock };
}
function lockMismatch(name, locked, current) {
  const lv = locked.match(/^bee@(.+)$/)?.[1];
  const cv = current.match(/^bee@(.+)$/)?.[1];
  if (lv && cv && lv !== cv) {
    return compareVersions(lv, cv) > 0 ? `${name}: ${LOCKFILE} was made with bee ${lv}, but you have ${cv}. Run \`bee upgrade\`.` : `${name}: ${LOCKFILE} was made with bee ${lv}; you have the newer ${cv}. Run \`bee update\` to move this project to the new skills, then commit ${LOCKFILE}.`;
  }
  return `${name}: content differs from ${LOCKFILE} (${short(locked)} \u2192 ${short(current)}). Run \`bee update ${name}\` to accept it.`;
}
function writeGitignores(root, targets, skills, agents) {
  const put = (dir, entries) => {
    const p = path5.join(root, dir, ".gitignore");
    const existing = fs5.existsSync(p) ? fs5.readFileSync(p, "utf8") : null;
    if (existing && !existing.startsWith(GITIGNORE_HEADER)) return;
    if (!entries.length) {
      if (existing) fs5.rmSync(p);
      return;
    }
    fs5.mkdirSync(path5.dirname(p), { recursive: true });
    fs5.writeFileSync(p, [GITIGNORE_HEADER, ...entries.sort()].join("\n") + "\n");
  };
  for (const t of targets) {
    put(t.skills, skills.map((s) => `/${s}/`));
    if (t.agents) put(t.agents, agents.map((a) => `/${a}.md`));
  }
}
function syncClaudeMd(root, skills, create) {
  const p = path5.join(root, "CLAUDE.md");
  const text = fs5.existsSync(p) ? fs5.readFileSync(p, "utf8") : "";
  const re = /<!-- bee:start -->[\s\S]*?<!-- bee:end -->/;
  if (!re.test(text) && !create) return;
  const has = (n) => skills.includes(n);
  const rules = [
    has("spec") && "- Non-trivial features start with a spec in `docs/specs/` (`spec` skill). Put acceptance-criteria IDs (`S<n>-AC<m>`) in test names.",
    has("adr") && "- Decisions that are costly to reverse get an ADR in `docs/adr/` (`adr` skill), created as **Proposed**; a human accepts it. Never contradict an Accepted ADR; supersede it.",
    has("feature-explainer") && "- Finish features with an explainer (`feature-explainer`) so reviewers can review without reading the diff.",
    has("skill-forge") && "- When you get corrected or repeat a workflow, use `skill-forge` to capture it."
  ].filter((x) => !!x);
  const block = [
    "<!-- bee:start -->",
    "## Agent skills (managed by bee)",
    "",
    "Skills are declared in `.bees` and pinned in `.bees.lock`. After cloning, run `bee install`. To add more, run `bee add <skill>` (see `bee search`).",
    "",
    `Installed: ${[...skills].sort().map((s) => "`" + s + "`").join(", ")}`,
    ...rules.length ? ["", "### Working agreement", ...rules] : [],
    "<!-- bee:end -->"
  ].join("\n");
  const out = re.test(text) ? text.replace(re, block) : (text ? text.replace(/\s*$/, "\n\n") : "") + block + "\n";
  fs5.writeFileSync(p, out);
}
function writeHook(root) {
  const p = path5.join(root, ".claude", "settings.json");
  let s = {};
  if (fs5.existsSync(p)) {
    try {
      s = readJSON(p);
    } catch {
      warn(".claude/settings.json is not plain JSON; skipped adding the auto-install hook.");
      return false;
    }
  }
  s.hooks ||= {};
  s.hooks.SessionStart ||= [];
  if (JSON.stringify(s.hooks.SessionStart).includes("bee install")) return false;
  s.hooks.SessionStart.push({ hooks: [{ type: "command", command: HOOK_CMD }] });
  writeJSON(p, s);
  return true;
}
function report({ results, problems }, verb = "installed") {
  for (const { name, entry, changed } of results) {
    const dep = entry.requiredBy ? dim(`  \u21B3 via ${entry.requiredBy.join(", ")}`) : "";
    const at = entry.commit ? "@" + entry.commit.slice(0, 7) : "";
    log(`  ${changed ? green("+") : dim("\u2713")} ${bold(name)} ${dim(entry.source + at)}${dep}`);
  }
  for (const p of problems) console.error(red("  \u2717 ") + p);
  const n = results.length;
  if (isQuiet()) {
    if (problems.length) console.error(red(`bee: ${problems.length} skill problem(s); run \`bee install\` for details.`));
  } else {
    log(`
${problems.length ? yellow(`${n} ${verb}, ${problems.length} problem(s)`) : green(`${n} skill${n === 1 ? "" : "s"} ${verb}`)}`);
  }
  if (problems.length) process.exitCode = 1;
}

// src/prompts.ts
import readline from "node:readline/promises";
function prompter(nonInteractive) {
  const rl = nonInteractive ? null : readline.createInterface({ input: process.stdin, output: process.stdout });
  let closed = false;
  return {
    async text(q, def = "") {
      if (!rl) return def;
      const a = (await rl.question(`${cyan("?")} ${q}${def ? dim(` (${def})`) : ""} `)).trim();
      return a || def;
    },
    async choose(q, options, def) {
      if (!rl) return def;
      console.log(`${cyan("?")} ${q}`);
      options.forEach(([id, label], i) => console.log(`  ${dim(String(i + 1).padStart(2))} ${label}${id === def ? dim(" (default)") : ""}`));
      for (; ; ) {
        const a = (await rl.question(dim("  number: "))).trim();
        if (!a) return def;
        const byNum = options[parseInt(a, 10) - 1];
        if (byNum) return byNum[0];
        const byId = options.find((o) => o[0] === a);
        if (byId) return byId[0];
      }
    },
    async confirm(q, def = true) {
      if (!rl) return def;
      const a = (await rl.question(`${cyan("?")} ${q} ${dim(def ? "(Y/n)" : "(y/N)")} `)).trim().toLowerCase();
      return a ? a.startsWith("y") : def;
    },
    close() {
      if (rl && !closed) {
        closed = true;
        rl.close();
      }
    }
  };
}

// src/recommend.ts
import fs6 from "node:fs";
import path6 from "node:path";
import { spawnSync as spawnSync2 } from "node:child_process";
function detectProject(root) {
  const has = (f) => fs6.existsSync(path6.join(root, f));
  const markers = [
    "package.json",
    "pyproject.toml",
    "requirements.txt",
    "go.mod",
    "Cargo.toml",
    "composer.json",
    "Gemfile",
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "Package.swift",
    "pubspec.yaml",
    "src",
    "app",
    "layout/theme.liquid"
  ];
  const hints = [];
  let type = null;
  const setType = (t, why) => {
    hints.push(why);
    type ??= t;
  };
  if (has("package.json")) {
    try {
      const pj = readJSON(path6.join(root, "package.json"));
      const names = Object.keys({ ...pj.dependencies, ...pj.devDependencies });
      const d = (n) => names.some((k) => k === n || k.startsWith(n + "/"));
      if (d("@shopify")) setType("ecommerce", "Shopify packages");
      if (d("react-native") || d("expo")) setType("mobile-app", "React Native / Expo");
      if (d("@modelcontextprotocol") || d("@anthropic-ai") || d("openai") || d("langchain")) setType("ai-agent", "LLM / MCP SDK");
      if (d("astro")) setType("marketing-site", "Astro");
      if (d("next") || d("react") || d("vue") || d("svelte") || d("@angular/core") || d("nuxt")) setType("web-app", "frontend framework");
      if (d("express") || d("fastify") || d("@nestjs/core") || d("hono") || d("koa")) setType("api", "Node HTTP server");
      if (pj.bin) setType("cli-lib", "package with bin");
    } catch {
    }
  }
  const py = ["pyproject.toml", "requirements.txt"].filter(has).map((f) => fs6.readFileSync(path6.join(root, f), "utf8")).join("\n").toLowerCase();
  if (/\b(anthropic|mcp|langchain|openai)\b/.test(py)) setType("ai-agent", "Python LLM SDK");
  if (/\b(fastapi|django|flask)\b/.test(py)) setType("api", "Python web framework");
  const gradle = ["build.gradle", "build.gradle.kts"].filter(has).map((f) => fs6.readFileSync(path6.join(root, f), "utf8")).join("\n");
  if (/com\.android\.application|com\.android\.library/.test(gradle)) setType("mobile-app", "Android (Gradle)");
  if (has("pom.xml") || gradle) setType("api", has("pom.xml") ? "Java/Kotlin (Maven)" : "Java/Kotlin (Gradle)");
  if (has("go.mod")) setType("api", "Go module");
  if (has("layout/theme.liquid")) setType("ecommerce", "Shopify theme");
  if (has("pubspec.yaml") || has("Package.swift")) setType("mobile-app", "native mobile project");
  return { existing: markers.some(has), type, hints };
}
function recommend(ans) {
  const pick = /* @__PURE__ */ new Map();
  const add = (n, why) => {
    if (regEntry(n) && !pick.has(n)) pick.set(n, why);
  };
  const existing = ans.stage === "existing";
  if (ans.workflow === "full") {
    if (existing) {
      add("feature-change", "Existing codebase: change pipeline that starts with codebase recon");
      add("product-research", "Full workflow includes user/market research");
      add("competitor-analysis", "Full workflow includes competitor analysis");
    } else add("product-builder", "New product: full pipeline from idea to explainer");
  } else if (ans.workflow === "build") {
    if (existing) add("feature-change", "Existing codebase: change pipeline that starts with codebase recon");
    else for (const n of ["product-design", "spec", "adr", "feature-dev", "feature-docs", "feature-explainer"]) add(n, "Build pipeline stage");
  } else {
    for (const n of ["spec", "adr", "feature-dev", "feature-docs"]) add(n, "Lean workflow: contracts, decisions, build, docs");
  }
  for (const s of REGISTRY.skills) if ((s.for ?? []).includes(ans.type)) add(s.name, `Fits ${ans.type} projects`);
  add("skill-advisor", "Lets the agent suggest more skills as the project grows");
  add("skill-forge", "Turns corrections into skill improvements");
  return pick;
}
function aiRecommend(ans, detected) {
  if (spawnSync2("claude", ["--version"], { encoding: "utf8" }).status !== 0) {
    warn("`claude` CLI not found; using built-in rules.");
    return null;
  }
  const catalog = REGISTRY.skills.map((s) => `- ${s.name} [${(s.tags ?? []).join(", ")}]: ${s.summary}${s.requires ? ` (bundles: ${s.requires.join(", ")})` : ""}`).join("\n");
  const prompt = `You are a decision agent choosing which agent skills a software project should use.
Project: ${JSON.stringify({ ...ans, detectedFromRepo: detected.hints })}
Available skills (choose ONLY from these names):
${catalog}
Rules: choose the smallest set that covers how this project will actually be built and reviewed. Orchestrators bundle the skills listed after them, so don't repeat those. Prefer product-builder for new products and feature-change for existing codebases when a pipeline is wanted. Always include skill-advisor and skill-forge.
Reply with ONLY a JSON object: {"skills":[{"name":"<skill>","reason":"<one short sentence>"}]}`;
  log(dim("  Asking Claude to choose skills\u2026"));
  const r = spawnSync2("claude", ["-p", prompt], { encoding: "utf8", timeout: 18e4 });
  try {
    const json = (r.stdout || "").match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error("no JSON");
    const parsed = JSON.parse(json);
    const pick = /* @__PURE__ */ new Map();
    for (const s of parsed.skills ?? []) if (regEntry(s.name)) pick.set(s.name, s.reason || "Chosen by Claude");
    return pick.size ? pick : null;
  } catch {
    warn("Could not parse Claude's answer; using built-in rules.");
    return null;
  }
}

// src/commands.ts
var str = (v) => typeof v === "string" ? v : void 0;
var requireRoot = () => findRoot() ?? die(`No ${MANIFEST} found here or in any parent folder. Run \`bee init\` first.`);
async function cmdInit(flags) {
  const root = process.cwd();
  if ((fs7.existsSync(path7.join(root, MANIFEST)) || fs7.existsSync(path7.join(root, LEGACY_MANIFEST))) && !flags.force) {
    die(`${MANIFEST} already exists. Use \`bee add\` / \`bee remove\`, or \`bee init --force\` to start over.`);
  }
  const det = detectProject(root);
  const nonInteractive = !!flags.yes || !process.stdin.isTTY;
  const p = prompter(nonInteractive);
  log(bold("\n\u{1F41D} bee init") + dim(" (sets up the skills this project runs on)\n"));
  if (det.hints.length) log(dim(`  Detected: ${det.hints.join(", ")}
`));
  try {
    const name = str(flags.name) ?? await p.text("Project name?", path7.basename(root));
    const type = str(flags.type) ?? await p.choose("What are you building?", PROJECT_TYPES, det.type ?? "web-app");
    const stage = str(flags.stage) ?? await p.choose(
      "New project or existing codebase?",
      [["new", "New project"], ["existing", "Existing codebase"]],
      det.existing ? "existing" : "new"
    );
    const description = str(flags.description) ?? await p.text("Describe it in one line (optional):", "");
    const workflow = str(flags.workflow) ?? await p.choose("How much of the process should skills run?", WORKFLOWS, stage === "existing" ? "build" : "full");
    const tgt = str(flags.target) ?? await p.choose(
      "Which agents will use the skills?",
      [["claude", TARGETS.claude.label], ["agents", TARGETS.agents.label], ["both", "Both"]],
      "claude"
    );
    const targets = tgt === "both" ? ["claude", "agents"] : [tgt];
    targets.forEach((t) => TARGETS[t] ?? die(`Unknown target "${t}"`));
    const ans = { name, type, stage, workflow, ...description ? { description } : {} };
    const pick = flags.ai && aiRecommend(ans, det) || recommend(ans);
    const all = [...pick.keys(), ...REGISTRY.skills.map((s) => s.name).filter((n) => !pick.has(n))];
    const chosen = new Set(pick.keys());
    for (; ; ) {
      log(bold("\nSkills for this project") + dim("  (bundled skills of an orchestrator are installed automatically)"));
      const bundledBy = /* @__PURE__ */ new Map();
      for (const n of chosen) for (const r of regEntry(n)?.requires ?? []) if (!bundledBy.has(r)) bundledBy.set(r, n);
      all.forEach((n, i) => {
        const e = regEntry(n);
        const num = dim(String(i + 1).padStart(2));
        if (chosen.has(n)) log(`  ${green("[x]")} ${num} ${bold(n)} ${dim("\u2014 " + (pick.get(n) ?? e.summary))}`);
        else if (bundledBy.has(n)) log(`  ${green("[+]")} ${num} ${n} ${dim("\u2014 included with " + bundledBy.get(n))}`);
        else log(`  ${dim("[ ]")} ${num} ${n} ${dim("\u2014 " + e.summary)}`);
      });
      if (nonInteractive) break;
      const a = (await p.text('Toggle numbers (e.g. "3 12"), or press Enter to accept:', "")).trim();
      if (!a) break;
      for (const tok of a.split(/[\s,]+/)) {
        const n = all[parseInt(tok, 10) - 1];
        if (n) {
          if (chosen.has(n)) chosen.delete(n);
          else chosen.add(n);
        }
      }
    }
    const hook = targets.includes("claude") && (flags["no-hook"] ? false : await p.confirm("Auto-install skills when someone opens this project in Claude Code? (adds a SessionStart hook)", true));
    p.close();
    const manifest = {
      name,
      project: { type, stage, workflow, ...description ? { description } : {} },
      targets,
      skills: sortKeys(Object.fromEntries([...chosen].map((n) => [n, regEntry(n).source])))
    };
    writeJSON(path7.join(root, MANIFEST), manifest);
    log(`
${green("\u2713")} wrote ${MANIFEST}`);
    syncClaudeMd(root, [], targets.includes("claude"));
    const lock = fs7.existsSync(path7.join(root, LOCKFILE)) ? loadProject(root).lock : { skills: {} };
    report(install(root, manifest, lock));
    if (hook && writeHook(root)) log(`${green("\u2713")} added SessionStart hook to .claude/settings.json`);
    log(`
${bold("Next:")}
  \u2022 Commit ${MANIFEST}, ${LOCKFILE}, CLAUDE.md${hook ? ", .claude/settings.json" : ""}. Teammates just run ${cyan("bee install")}.
  \u2022 Start a new agent session and describe what to build${manifest.skills["product-builder"] ? `, e.g. "Use product-builder to build ${name}"` : ""}.
  \u2022 Add more any time: ${cyan("bee search <topic>")} \u2192 ${cyan("bee add <skill>")}`);
  } finally {
    p.close();
  }
}
function cmdInstall(pos, flags) {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  if (pos.length) {
    for (const arg of pos) {
      const { name, spec } = resolveInput(arg, root);
      if (manifest.skills[name] && manifest.skills[name] !== spec) warn(`${name}: replacing source ${manifest.skills[name]} \u2192 ${spec}`);
      manifest.skills[name] = spec;
      const src = parseSource(spec);
      if (src?.kind === "git" && !REGISTRY.skills.some((s) => s.source === spec)) {
        warn(`${name} comes from ${src.url}, which is not in the bee registry. Review its SKILL.md and scripts before relying on it.`);
      }
    }
    manifest.skills = sortKeys(manifest.skills);
    writeJSON(path7.join(root, MANIFEST), manifest);
  }
  report(install(root, manifest, lock, { frozen: !!flags.frozen, force: !!flags.force }));
}
function cmdRemove(pos) {
  if (!pos.length) die("Usage: bee remove <skill...>");
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  for (const n of pos) {
    if (!(n in manifest.skills)) {
      const via = lock.skills[n]?.requiredBy;
      die(via ? `${n} is bundled by ${via.join(", ")}; remove that instead.` : `${n} is not in ${MANIFEST}.`);
    }
    delete manifest.skills[n];
  }
  writeJSON(path7.join(root, MANIFEST), manifest);
  const res = install(root, manifest, lock);
  log(`${green("\u2713")} removed ${pos.join(", ")}`);
  report(res, "remaining");
}
function cmdUpdate(pos, flags) {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  const before = lock.skills;
  const res = install(root, manifest, lock, { update: true, only: pos.length ? pos : null, force: !!flags.force });
  for (const [n, e] of Object.entries(res.lock.skills)) {
    const b = before[n];
    if (b && b.integrity !== e.integrity) log(`  ${yellow("\u2191")} ${bold(n)} ${dim(`${short(b.resolved)} \u2192 ${short(e.resolved)}`)}`);
  }
  report(res, "up to date");
}
function cmdList(flags) {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  const t = targetsOf(manifest)[0];
  const rows = Object.entries(lock.skills).map(([name, e]) => {
    const dir = path7.join(root, t.skills, name);
    const status = !fs7.existsSync(dir) ? "missing" : hashDir(dir) === e.integrity ? "ok" : "modified";
    return { name, source: e.source, resolved: e.resolved, status, requiredBy: e.requiredBy ?? null, declared: name in manifest.skills };
  });
  for (const [n, spec] of Object.entries(manifest.skills)) {
    if (!lock.skills[n]) rows.push({ name: n, source: spec, status: "not installed", declared: true });
  }
  if (flags.json) {
    console.log(JSON.stringify(rows, null, 2));
    return;
  }
  log(bold(manifest.name || path7.basename(root)) + dim(` \xB7 ${MANIFEST} \xB7 targets: ${(manifest.targets ?? ["claude"]).join(", ")}`));
  rows.sort((a, b) => a.declared === b.declared ? a.name.localeCompare(b.name) : a.declared ? -1 : 1);
  for (const r of rows) {
    const st = r.status === "ok" ? green("ok") : r.status === "modified" ? yellow("modified locally") : red(r.status);
    const via = r.requiredBy ? dim(`  via ${r.requiredBy.join(", ")}`) : "";
    log(`  ${r.declared ? "\u2022" : dim("\u21B3")} ${r.declared ? bold(r.name) : r.name} ${dim(r.source)} ${st}${via}`);
  }
}
function searchRegistry(terms, opts = {}) {
  const t = terms.map((x) => x.toLowerCase()).filter(Boolean);
  const out = [];
  for (const skill of REGISTRY.skills) {
    const tags = (skill.tags ?? []).map((x) => x.toLowerCase());
    const types = (skill.for ?? []).map((x) => x.toLowerCase());
    if (opts.tag && !tags.includes(opts.tag.toLowerCase())) continue;
    if (opts.forType && !types.includes(opts.forType.toLowerCase())) continue;
    const name = skill.name.toLowerCase();
    const summary = skill.summary.toLowerCase();
    let score = 0;
    let all = true;
    for (const term of t) {
      let s = 0;
      if (name === term) s += 20;
      else if (name.startsWith(term)) s += 12;
      else if (name.includes(term)) s += 8;
      if (tags.includes(term)) s += 6;
      else if (tags.some((x) => x.includes(term))) s += 3;
      if (types.includes(term)) s += 4;
      if (summary.includes(term)) s += 2;
      if (!s) {
        all = false;
        break;
      }
      score += s;
    }
    if (all) out.push({ skill, score });
  }
  return out.sort((x, y) => y.score - x.score || x.skill.name.localeCompare(y.skill.name));
}
function cmdSearch(pos, flags) {
  const root = findRoot();
  const installed = new Set(root ? Object.keys(loadProject(root).lock.skills) : []);
  const hits = searchRegistry(pos, { tag: str(flags.tag), forType: str(flags.for) });
  if (flags.json) {
    console.log(JSON.stringify(hits.map((h) => ({ ...h.skill, score: h.score, installed: installed.has(h.skill.name) })), null, 2));
    return;
  }
  const q = [pos.join(" "), flags.tag && `tag:${flags.tag}`, flags.for && `for:${flags.for}`].filter(Boolean).join(" ");
  if (!hits.length) {
    log(`No skills match "${q}".`);
    const tags = [...new Set(REGISTRY.skills.flatMap((s) => s.tags ?? []))].sort();
    log(dim(`  Tags: ${tags.join(", ")}`));
    log(dim("  Any git repo with a SKILL.md works too: bee add github:owner/repo/path"));
    return;
  }
  log(dim(`${hits.length} skill${hits.length === 1 ? "" : "s"}${q ? ` for "${q}"` : ""}  \xB7  \u2713 = installed in this project
`));
  for (const { skill: s } of hits) {
    const origin = s.source.startsWith("bee:") ? "bundled" : s.source.replace(/^github:/, "").split("/").slice(0, 2).join("/");
    log(`  ${installed.has(s.name) ? green("\u2713") : " "} ${bold(s.name)} ${dim("\xB7 " + origin + " \xB7 " + (s.tags ?? []).join(", "))}`);
    log(`      ${s.summary}`);
  }
  log(dim(`
  Details: bee info <skill>    Add: bee add <skill>`));
}
function cmdInfo(pos, flags) {
  const name = pos[0] ?? die("Usage: bee info <skill>");
  const s = regEntry(name);
  if (!s) {
    const near = searchRegistry([name]).slice(0, 3).map((h) => h.skill.name);
    return die(`No skill named "${name}" in the registry.${near.length ? ` Did you mean: ${near.join(", ")}?` : ""}`);
  }
  const root = findRoot();
  const lockEntry = root ? loadProject(root).lock.skills[name] : void 0;
  const bundledBy = REGISTRY.skills.filter((x) => x.requires?.includes(name)).map((x) => x.name);
  let description;
  if (s.source.startsWith("bee:")) description = frontmatter(path7.join(LIB, "skills", name))?.description;
  if (flags.json) {
    console.log(JSON.stringify({ ...s, description, bundledBy, installed: lockEntry ?? null }, null, 2));
    return;
  }
  log(`${bold(s.name)}  ${dim(s.source)}`);
  log(`  ${s.summary}`);
  if (description) log(dim(`
  When agents use it: ${description}`));
  const rows = [
    ["Tags", s.tags?.join(", ")],
    ["Recommended for", s.for?.join(", ")],
    ["Bundles", s.requires?.join(", ")],
    ["Bundled by", bundledBy.join(", ") || void 0],
    ["Agents", s.agents?.join(", ")],
    ["In this project", root ? lockEntry ? `installed (${short(lockEntry.resolved)})` : "not installed" : void 0]
  ];
  log("");
  for (const [k, v] of rows) if (v) log(`  ${dim(k.padEnd(16))} ${v}`);
  if (!lockEntry) log(`
  Add it: ${cyan("bee add " + s.name)}`);
}
async function cmdUpgrade(flags) {
  const latest = await fetchLatestVersion(5e3);
  if (flags.check) {
    if (!latest) return die(`No published release found for ${REPO} (none released yet, or GitHub is unreachable). See https://github.com/${REPO}/releases`);
    log(compareVersions(latest, PKG.version) > 0 ? `Update available: ${PKG.version} \u2192 ${latest.replace(/^v/, "")}. Run ${cyan("bee upgrade")}` : `${green("\u2713")} bee ${PKG.version} is the latest version.`);
    return;
  }
  if (latest && compareVersions(latest, PKG.version) <= 0 && !flags.force) {
    log(`${green("\u2713")} bee ${PKG.version} is already the latest version.`);
    return;
  }
  const home = path7.join(os3.homedir(), ".bee");
  const managed = LIB === home || LIB === path7.join(home, "src") || !!process.env.BEE_HOME;
  if (!managed) {
    log(`bee is running from ${LIB}. Update it there: ${cyan("git pull && npm run build")}`);
    return;
  }
  log(dim(`Running installer from ${INSTALL_URL} \u2026`));
  const r = spawnSync3("sh", ["-c", `curl -fsSL "${INSTALL_URL}" | bash`], { stdio: "inherit" });
  if (r.status !== 0) die("Upgrade failed (see output above).");
  log(`
In each project, run ${cyan("bee update")} to move it to the new bundled skills, then commit ${LOCKFILE}.`);
}
var HELP = `${bold("\u{1F41D} bee")} ${dim("v" + PKG.version)}: skills for agent-driven projects

  ${cyan("bee init")}               Interview \u2192 pick skills \u2192 write .bees \u2192 install
      --ai                  let Claude (claude CLI) choose the skills
      --yes                 accept defaults (non-interactive); also --type --stage --workflow --target --name
  ${cyan("bee install")}            Install everything in .bees (exactly as pinned in .bees.lock)
      --frozen              fail instead of changing .bees.lock (CI)
  ${cyan("bee add")} <skill|source>  Add skills: registry name, github:owner/repo/path[#ref], git+<url>::path#ref, ./local
  ${cyan("bee remove")} <skill>      Remove a skill (and the bundled skills only it needed)
  ${cyan("bee update")} [skill]      Pull newer versions and re-pin them
  ${cyan("bee list")}               Show installed skills and whether they match the lock
  ${cyan("bee search")} [words\u2026]    Find skills, best match first (all words must match)
      --tag <tag>           only skills with this tag (e.g. testing, docs, adr)
      --for <type>          only skills recommended for a project type (web-app, api, \u2026)
      --json                machine-readable (used by the skill-advisor agent)
  ${cyan("bee info")} <skill>        What a skill does, what it bundles, whether it's installed
  ${cyan("bee upgrade")}            Update bee to the latest release (--check: just tell me)

  Files: .bees (commit) \xB7 .bees.lock (commit) \xB7 .claude/skills/* (gitignored, restored by bee install)`;

// src/cli.ts
var VALUED = /* @__PURE__ */ new Set(["type", "stage", "workflow", "target", "name", "description", "tag", "for"]);
function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const [k, v] = a.slice(2).split(/=(.*)/s);
      if (v !== void 0) flags[k] = v;
      else if (VALUED.has(k)) flags[k] = argv[++i];
      else flags[k] = true;
    } else if (a === "-y") flags.yes = true;
    else if (a === "-h") flags.help = true;
    else if (a === "-v") flags.version = true;
    else pos.push(a);
  }
  return { flags, pos };
}
async function main() {
  const { flags, pos } = parseArgs(process.argv.slice(2));
  await run(flags, pos);
  if (pos[0] !== "upgrade" && !flags.version) await notifyIfOutdated();
}
async function run(flags, pos) {
  setQuiet(!!flags.quiet);
  const cmd = pos.shift();
  if (flags.version) {
    console.log(PKG.version);
    return;
  }
  if (!cmd || flags.help || cmd === "help") {
    console.log(HELP);
    return;
  }
  switch (cmd) {
    case "init":
      return cmdInit(flags);
    case "install":
    case "i":
      return cmdInstall(pos, flags);
    case "add":
      if (!pos.length) die("Usage: bee add <skill|source...>");
      return cmdInstall(pos, flags);
    case "remove":
    case "rm":
      return cmdRemove(pos);
    case "update":
    case "up":
      return cmdUpdate(pos, flags);
    case "list":
    case "ls":
      return cmdList(flags);
    case "search":
    case "s":
      return cmdSearch(pos, flags);
    case "info":
    case "show":
      return cmdInfo(pos, flags);
    case "upgrade":
    case "self-update":
      return cmdUpgrade(flags);
    default:
      die(`Unknown command "${cmd}". Run \`bee help\`.`);
  }
}
main().catch((e) => {
  console.error(red("\u2717 ") + (e instanceof BeeError ? e.message : e?.stack ?? String(e)));
  process.exit(1);
});
export {
  parseArgs
};
