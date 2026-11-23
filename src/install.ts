import fs from 'node:fs';
import path from 'node:path';
import { GITIGNORE_HEADER, HOOK_CMD, LOCKFILE, MANIFEST, PKG, TARGETS, regEntry } from './config.js';
import { copyDir, hashDir, readJSON, sortKeys, writeJSON } from './fsutil.js';
import { fetchSkill, skillAgents } from './sources.js';
import { bold, die, dim, green, isQuiet, log, red, warn, yellow, short } from './ui.js';
import type { InstallOptions, InstallResult, Lock, LockEntry, Manifest, Target } from './types.js';

export function findRoot(start = process.cwd()): string | null {
  for (let d = path.resolve(start); ; d = path.dirname(d)) {
    if (fs.existsSync(path.join(d, MANIFEST))) return d;
    if (path.dirname(d) === d) return null;
  }
}

export function loadProject(root: string): { manifest: Manifest; lock: Lock } {
  const manifest = readJSON<Manifest>(path.join(root, MANIFEST));
  manifest.skills ||= {};
  const lockPath = path.join(root, LOCKFILE);
  const lock: Lock = fs.existsSync(lockPath) ? readJSON<Lock>(lockPath) : { skills: {} };
  lock.skills ||= {};
  return { manifest, lock };
}

export const targetsOf = (m: Manifest): Target[] =>
  (m.targets?.length ? m.targets : ['claude' as const]).map(
    t => TARGETS[t] ?? die(`Unknown target "${t}" (use: ${Object.keys(TARGETS).join(', ')})`),
  );

/**
 * Make the installed skills match harness.json, honoring harness.lock.
 * Resolves registry dependencies, protects local edits and unmanaged folders,
 * prunes what is no longer wanted, and rewrites the lock (unless frozen).
 */
export function install(root: string, manifest: Manifest, lock: Lock, opts: InstallOptions = {}): InstallResult {
  const { update = false, only = null, frozen = false, force = false } = opts;
  const targets = targetsOf(manifest);
  const queue = Object.entries(manifest.skills).map(([name, spec]) => ({ name, spec, requiredBy: null as string | null }));
  const done = new Map<string, LockEntry>();
  const results: InstallResult['results'] = [];
  const problems: string[] = [];

  while (queue.length) {
    const { name, spec, requiredBy } = queue.shift()!;
    const seen = done.get(name);
    if (seen) {
      if (requiredBy && seen.requiredBy && !seen.requiredBy.includes(requiredBy)) seen.requiredBy.push(requiredBy);
      continue;
    }
    // Queue dependencies whatever happens to this skill, so they are never pruned by accident.
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
      problems.push(`${name}: ${(e as Error).message}`);
      if (prev) done.set(name, { ...prev });
      continue;
    }
    const integrity = hashDir(fetched.dir);

    if (prev && prev.integrity !== integrity && !refresh) {
      if (fetched.kind === 'file') warn(`${name}: local source changed since harness.lock; accepting new content.`);
      else if (!force) {
        problems.push(`${name}: content differs from harness.lock (${short(prev.resolved)} → ${short(fetched.resolved)}). Run \`bee update ${name}\` to accept it.`);
        done.set(name, { ...prev });
        continue;
      }
    }
    if (frozen && (!prev || prev.integrity !== integrity)) {
      problems.push(`${name}: ${prev ? 'changed' : 'missing'} in harness.lock (--frozen). Run \`bee install\` without --frozen and commit the lock.`);
      continue;
    }

    // Never clobber folders bee doesn't own, or local edits to ones it does.
    let blocked: string | null = null;
    for (const t of targets) {
      const dest = path.join(root, t.skills, name);
      if (!fs.existsSync(dest) || force) continue;
      if (!owned) { blocked = `${path.relative(root, dest)} exists and is not managed by bee (use --force to replace)`; break; }
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
      copyDir(fetched.dir, path.join(root, t.skills, name));
      if (t.agents) for (const a of agents) {
        fs.mkdirSync(path.join(root, t.agents), { recursive: true });
        fs.copyFileSync(a.file, path.join(root, t.agents, `${a.name}.md`));
      }
    }
    const entry: LockEntry = { source: spec, resolved: fetched.resolved, integrity };
    if (fetched.commit) entry.commit = fetched.commit;
    if (agents.length) entry.agents = agents.map(a => a.name);
    if (requiredBy) entry.requiredBy = [requiredBy];
    done.set(name, entry);
    results.push({ name, entry, changed: !prev || prev.integrity !== integrity });
  }

  // Prune skills/agents bee installed before that are no longer wanted.
  const keep = new Set(done.keys());
  const keepAgents = new Set([...done.values()].flatMap(e => e.agents ?? []));
  for (const [name, e] of Object.entries(lock.skills)) {
    if (!keep.has(name)) for (const t of targets) fs.rmSync(path.join(root, t.skills, name), { recursive: true, force: true });
    for (const a of e.agents ?? []) if (!keepAgents.has(a)) {
      for (const t of targets) if (t.agents) fs.rmSync(path.join(root, t.agents, `${a}.md`), { force: true });
    }
  }

  const newLock: Lock = { lockfileVersion: 1, generatedBy: `bee@${PKG.version}`, skills: sortKeys(Object.fromEntries(done)) };
  if (!frozen) writeJSON(path.join(root, LOCKFILE), newLock);
  if (!manifest.vendor) writeGitignores(root, targets, [...keep], [...keepAgents]);
  syncClaudeMd(root, [...keep], false);
  return { results, problems, lock: newLock };
}

function writeGitignores(root: string, targets: Target[], skills: string[], agents: string[]): void {
  const put = (dir: string, entries: string[]) => {
    const p = path.join(root, dir, '.gitignore');
    const existing = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
    if (existing && !existing.startsWith(GITIGNORE_HEADER)) return; // the user's own file: leave it alone
    if (!entries.length) { if (existing) fs.rmSync(p); return; }
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, [GITIGNORE_HEADER, ...entries.sort()].join('\n') + '\n');
  };
  for (const t of targets) {
    put(t.skills, skills.map(s => `/${s}/`));
    if (t.agents) put(t.agents, agents.map(a => `/${a}.md`));
  }
}

/** Keep a marked block in CLAUDE.md describing the skill set and the review working agreement. */
export function syncClaudeMd(root: string, skills: string[], create: boolean): void {
  const p = path.join(root, 'CLAUDE.md');
  const text = fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : '';
  const re = /<!-- bee:start -->[\s\S]*?<!-- bee:end -->/;
  if (!re.test(text) && !create) return;
  const has = (n: string) => skills.includes(n);
  const rules = [
    has('spec') && '- Non-trivial features start with a spec in `docs/specs/` (`spec` skill). Put acceptance-criteria IDs (`S<n>-AC<m>`) in test names.',
    has('adr') && '- Decisions that are costly to reverse get an ADR in `docs/adr/` (`adr` skill), created as **Proposed**; a human accepts it. Never contradict an Accepted ADR; supersede it.',
    has('feature-explainer') && '- Finish features with an explainer (`feature-explainer`) so reviewers can review without reading the diff.',
    has('skill-forge') && '- When you get corrected or repeat a workflow, use `skill-forge` to capture it.',
  ].filter((x): x is string => !!x);
  const block = [
    '<!-- bee:start -->', '## Agent skills (managed by bee)', '',
    'Skills are declared in `harness.json` and pinned in `harness.lock`. After cloning, run `bee install`. To add more, run `bee add <skill>` (see `bee search`).',
    '', `Installed: ${[...skills].sort().map(s => '`' + s + '`').join(', ')}`,
    ...(rules.length ? ['', '### Working agreement', ...rules] : []),
    '<!-- bee:end -->',
  ].join('\n');
  const out = re.test(text) ? text.replace(re, block) : (text ? text.replace(/\s*$/, '\n\n') : '') + block + '\n';
  fs.writeFileSync(p, out);
}

/** Add a Claude Code SessionStart hook that runs `bee install` (idempotent). */
export function writeHook(root: string): boolean {
  const p = path.join(root, '.claude', 'settings.json');
  let s: { hooks?: { SessionStart?: unknown[] } & Record<string, unknown> } & Record<string, unknown> = {};
  if (fs.existsSync(p)) {
    try { s = readJSON(p); } catch { warn('.claude/settings.json is not plain JSON; skipped adding the auto-install hook.'); return false; }
  }
  s.hooks ||= {};
  s.hooks.SessionStart ||= [];
  if (JSON.stringify(s.hooks.SessionStart).includes('bee install')) return false;
  s.hooks.SessionStart.push({ hooks: [{ type: 'command', command: HOOK_CMD }] });
  writeJSON(p, s);
  return true;
}

export function report({ results, problems }: InstallResult, verb = 'installed'): void {
  for (const { name, entry, changed } of results) {
    const dep = entry.requiredBy ? dim(`  ↳ via ${entry.requiredBy.join(', ')}`) : '';
    const at = entry.commit ? '@' + entry.commit.slice(0, 7) : '';
    log(`  ${changed ? green('+') : dim('✓')} ${bold(name)} ${dim(entry.source + at)}${dep}`);
  }
  for (const p of problems) console.error(red('  ✗ ') + p);
  const n = results.length;
  if (isQuiet()) {
    if (problems.length) console.error(red(`bee: ${problems.length} skill problem(s); run \`bee install\` for details.`));
  } else {
    log(`\n${problems.length ? yellow(`${n} ${verb}, ${problems.length} problem(s)`) : green(`${n} skill${n === 1 ? '' : 's'} ${verb}`)}`);
  }
  if (problems.length) process.exitCode = 1;
}
