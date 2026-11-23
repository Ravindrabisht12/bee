import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { INSTALL_URL, LEGACY_MANIFEST, LIB, LOCKFILE, MANIFEST, PKG, REPO, PROJECT_TYPES, REGISTRY, TARGETS, WORKFLOWS, regEntry } from './config.js';
import { frontmatter, hashDir, sortKeys, writeJSON } from './fsutil.js';
import { compareVersions, fetchLatestVersion } from './update.js';
import { findRoot, install, loadProject, report, syncClaudeMd, targetsOf, writeHook } from './install.js';
import { prompter } from './prompts.js';
import { aiRecommend, detectProject, recommend } from './recommend.js';
import { parseSource, resolveInput } from './sources.js';
import { bold, cyan, die, dim, green, log, red, short, warn, yellow } from './ui.js';
import type { Flags, Manifest, ProjectInfo, RegistrySkill, TargetName } from './types.js';

const str = (v: Flags[string]) => (typeof v === 'string' ? v : undefined);
const requireRoot = () => findRoot() ?? die(`No ${MANIFEST} found here or in any parent folder. Run \`bee init\` first.`);

export async function cmdInit(flags: Flags): Promise<void> {
  const root = process.cwd();
  if ((fs.existsSync(path.join(root, MANIFEST)) || fs.existsSync(path.join(root, LEGACY_MANIFEST))) && !flags.force) {
    die(`${MANIFEST} already exists. Use \`bee add\` / \`bee remove\`, or \`bee init --force\` to start over.`);
  }
  const det = detectProject(root);
  const nonInteractive = !!flags.yes || !process.stdin.isTTY;
  const p = prompter(nonInteractive);
  log(bold('\n🐝 bee init') + dim(' (sets up the skills this project runs on)\n'));
  if (det.hints.length) log(dim(`  Detected: ${det.hints.join(', ')}\n`));
  try {
    const name = str(flags.name) ?? await p.text('Project name?', path.basename(root));
    const type = str(flags.type) ?? await p.choose('What are you building?', PROJECT_TYPES, det.type ?? 'web-app');
    const stage = str(flags.stage) ?? await p.choose('New project or existing codebase?',
      [['new', 'New project'], ['existing', 'Existing codebase']], det.existing ? 'existing' : 'new');
    const description = str(flags.description) ?? await p.text('Describe it in one line (optional):', '');
    const workflow = str(flags.workflow) ?? await p.choose('How much of the process should skills run?', WORKFLOWS, stage === 'existing' ? 'build' : 'full');
    const tgt = str(flags.target) ?? await p.choose('Which agents will use the skills?',
      [['claude', TARGETS.claude.label], ['agents', TARGETS.agents.label], ['both', 'Both']], 'claude');
    const targets: TargetName[] = tgt === 'both' ? ['claude', 'agents'] : [tgt as TargetName];
    targets.forEach(t => TARGETS[t] ?? die(`Unknown target "${t}"`));
    const ans: ProjectInfo & { name: string } = { name, type, stage, workflow, ...(description ? { description } : {}) };

    const pick = (flags.ai && aiRecommend(ans, det)) || recommend(ans);

    // Review: recommended skills are checked; anything else in the registry can be toggled on.
    const all = [...pick.keys(), ...REGISTRY.skills.map(s => s.name).filter(n => !pick.has(n))];
    const chosen = new Set(pick.keys());
    for (;;) {
      log(bold('\nSkills for this project') + dim('  (bundled skills of an orchestrator are installed automatically)'));
      const bundledBy = new Map<string, string>();
      for (const n of chosen) for (const r of regEntry(n)?.requires ?? []) if (!bundledBy.has(r)) bundledBy.set(r, n);
      all.forEach((n, i) => {
        const e = regEntry(n)!;
        const num = dim(String(i + 1).padStart(2));
        if (chosen.has(n)) log(`  ${green('[x]')} ${num} ${bold(n)} ${dim('— ' + (pick.get(n) ?? e.summary))}`);
        else if (bundledBy.has(n)) log(`  ${green('[+]')} ${num} ${n} ${dim('— included with ' + bundledBy.get(n))}`);
        else log(`  ${dim('[ ]')} ${num} ${n} ${dim('— ' + e.summary)}`);
      });
      if (nonInteractive) break;
      const a = (await p.text('Toggle numbers (e.g. "3 12"), or press Enter to accept:', '')).trim();
      if (!a) break;
      for (const tok of a.split(/[\s,]+/)) {
        const n = all[parseInt(tok, 10) - 1];
        if (n) { if (chosen.has(n)) chosen.delete(n); else chosen.add(n); }
      }
    }

    const hook = targets.includes('claude') && (flags['no-hook']
      ? false
      : await p.confirm('Auto-install skills when someone opens this project in Claude Code? (adds a SessionStart hook)', true));
    p.close();

    const manifest: Manifest = {
      name,
      project: { type, stage, workflow, ...(description ? { description } : {}) },
      targets,
      skills: sortKeys(Object.fromEntries([...chosen].map(n => [n, regEntry(n)!.source]))),
    };
    writeJSON(path.join(root, MANIFEST), manifest);
    log(`\n${green('✓')} wrote ${MANIFEST}`);
    syncClaudeMd(root, [], targets.includes('claude'));
    const lock = fs.existsSync(path.join(root, LOCKFILE)) ? loadProject(root).lock : { skills: {} };
    report(install(root, manifest, lock));
    if (hook && writeHook(root)) log(`${green('✓')} added SessionStart hook to .claude/settings.json`);
    log(`\n${bold('Next:')}
  • Commit ${MANIFEST}, ${LOCKFILE}, CLAUDE.md${hook ? ', .claude/settings.json' : ''}. Teammates just run ${cyan('bee install')}.
  • Start a new agent session and describe what to build${manifest.skills['product-builder'] ? `, e.g. "Use product-builder to build ${name}"` : ''}.
  • Add more any time: ${cyan('bee search <topic>')} → ${cyan('bee add <skill>')}`);
  } finally {
    p.close();
  }
}

export function cmdInstall(pos: string[], flags: Flags): void {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  if (pos.length) {
    for (const arg of pos) {
      const { name, spec } = resolveInput(arg, root);
      if (manifest.skills[name] && manifest.skills[name] !== spec) warn(`${name}: replacing source ${manifest.skills[name]} → ${spec}`);
      manifest.skills[name] = spec;
      const src = parseSource(spec);
      if (src?.kind === 'git' && !REGISTRY.skills.some(s => s.source === spec)) {
        warn(`${name} comes from ${src.url}, which is not in the bee registry. Review its SKILL.md and scripts before relying on it.`);
      }
    }
    manifest.skills = sortKeys(manifest.skills);
    writeJSON(path.join(root, MANIFEST), manifest);
  }
  report(install(root, manifest, lock, { frozen: !!flags.frozen, force: !!flags.force }));
}

export function cmdRemove(pos: string[]): void {
  if (!pos.length) die('Usage: bee remove <skill...>');
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  for (const n of pos) {
    if (!(n in manifest.skills)) {
      const via = lock.skills[n]?.requiredBy;
      die(via ? `${n} is bundled by ${via.join(', ')}; remove that instead.` : `${n} is not in ${MANIFEST}.`);
    }
    delete manifest.skills[n];
  }
  writeJSON(path.join(root, MANIFEST), manifest);
  const res = install(root, manifest, lock);
  log(`${green('✓')} removed ${pos.join(', ')}`);
  report(res, 'remaining');
}

export function cmdUpdate(pos: string[], flags: Flags): void {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  const before = lock.skills;
  const res = install(root, manifest, lock, { update: true, only: pos.length ? pos : null, force: !!flags.force });
  for (const [n, e] of Object.entries(res.lock.skills)) {
    const b = before[n];
    if (b && b.integrity !== e.integrity) log(`  ${yellow('↑')} ${bold(n)} ${dim(`${short(b.resolved)} → ${short(e.resolved)}`)}`);
  }
  report(res, 'up to date');
}

export function cmdList(flags: Flags): void {
  const root = requireRoot();
  const { manifest, lock } = loadProject(root);
  const t = targetsOf(manifest)[0]!;
  type Row = { name: string; source: string; resolved?: string; status: string; requiredBy?: string[] | null; declared: boolean };
  const rows: Row[] = Object.entries(lock.skills).map(([name, e]) => {
    const dir = path.join(root, t.skills, name);
    const status = !fs.existsSync(dir) ? 'missing' : hashDir(dir) === e.integrity ? 'ok' : 'modified';
    return { name, source: e.source, resolved: e.resolved, status, requiredBy: e.requiredBy ?? null, declared: name in manifest.skills };
  });
  for (const [n, spec] of Object.entries(manifest.skills)) {
    if (!lock.skills[n]) rows.push({ name: n, source: spec, status: 'not installed', declared: true });
  }
  if (flags.json) { console.log(JSON.stringify(rows, null, 2)); return; }
  log(bold(manifest.name || path.basename(root)) + dim(` · ${MANIFEST} · targets: ${(manifest.targets ?? ['claude']).join(', ')}`));
  rows.sort((a, b) => (a.declared === b.declared ? a.name.localeCompare(b.name) : a.declared ? -1 : 1));
  for (const r of rows) {
    const st = r.status === 'ok' ? green('ok') : r.status === 'modified' ? yellow('modified locally') : red(r.status);
    const via = r.requiredBy ? dim(`  via ${r.requiredBy.join(', ')}`) : '';
    log(`  ${r.declared ? '•' : dim('↳')} ${r.declared ? bold(r.name) : r.name} ${dim(r.source)} ${st}${via}`);
  }
}

/** Rank registry skills against search terms. Every term must match somewhere. */
export function searchRegistry(terms: string[], opts: { tag?: string; forType?: string } = {}): { skill: RegistrySkill; score: number }[] {
  const t = terms.map(x => x.toLowerCase()).filter(Boolean);
  const out: { skill: RegistrySkill; score: number }[] = [];
  for (const skill of REGISTRY.skills) {
    const tags = (skill.tags ?? []).map(x => x.toLowerCase());
    const types = (skill.for ?? []).map(x => x.toLowerCase());
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
      else if (tags.some(x => x.includes(term))) s += 3;
      if (types.includes(term)) s += 4;
      if (summary.includes(term)) s += 2;
      if (!s) { all = false; break; }
      score += s;
    }
    if (all) out.push({ skill, score });
  }
  return out.sort((x, y) => y.score - x.score || x.skill.name.localeCompare(y.skill.name));
}

export function cmdSearch(pos: string[], flags: Flags): void {
  const root = findRoot();
  const installed = new Set(root ? Object.keys(loadProject(root).lock.skills) : []);
  const hits = searchRegistry(pos, { tag: str(flags.tag), forType: str(flags.for) });
  if (flags.json) {
    console.log(JSON.stringify(hits.map(h => ({ ...h.skill, score: h.score, installed: installed.has(h.skill.name) })), null, 2));
    return;
  }
  const q = [pos.join(' '), flags.tag && `tag:${flags.tag}`, flags.for && `for:${flags.for}`].filter(Boolean).join(' ');
  if (!hits.length) {
    log(`No skills match "${q}".`);
    const tags = [...new Set(REGISTRY.skills.flatMap(s => s.tags ?? []))].sort();
    log(dim(`  Tags: ${tags.join(', ')}`));
    log(dim('  Any git repo with a SKILL.md works too: bee add github:owner/repo/path'));
    return;
  }
  log(dim(`${hits.length} skill${hits.length === 1 ? '' : 's'}${q ? ` for "${q}"` : ''}  ·  ✓ = installed in this project\n`));
  for (const { skill: s } of hits) {
    const origin = s.source.startsWith('bee:') ? 'bundled' : s.source.replace(/^github:/, '').split('/').slice(0, 2).join('/');
    log(`  ${installed.has(s.name) ? green('✓') : ' '} ${bold(s.name)} ${dim('· ' + origin + ' · ' + (s.tags ?? []).join(', '))}`);
    log(`      ${s.summary}`);
  }
  log(dim(`\n  Details: bee info <skill>    Add: bee add <skill>`));
}

export function cmdInfo(pos: string[], flags: Flags): void {
  const name = pos[0] ?? die('Usage: bee info <skill>');
  const s = regEntry(name);
  if (!s) {
    const near = searchRegistry([name]).slice(0, 3).map(h => h.skill.name);
    return die(`No skill named "${name}" in the registry.${near.length ? ` Did you mean: ${near.join(', ')}?` : ''}`);
  }
  const root = findRoot();
  const lockEntry = root ? loadProject(root).lock.skills[name] : undefined;
  const bundledBy = REGISTRY.skills.filter(x => x.requires?.includes(name)).map(x => x.name);
  let description: string | undefined;
  if (s.source.startsWith('bee:')) description = frontmatter(path.join(LIB, 'skills', name))?.description;
  if (flags.json) { console.log(JSON.stringify({ ...s, description, bundledBy, installed: lockEntry ?? null }, null, 2)); return; }
  log(`${bold(s.name)}  ${dim(s.source)}`);
  log(`  ${s.summary}`);
  if (description) log(dim(`\n  When agents use it: ${description}`));
  const rows: [string, string | undefined][] = [
    ['Tags', s.tags?.join(', ')],
    ['Recommended for', s.for?.join(', ')],
    ['Bundles', s.requires?.join(', ')],
    ['Bundled by', bundledBy.join(', ') || undefined],
    ['Agents', s.agents?.join(', ')],
    ['In this project', root ? (lockEntry ? `installed (${short(lockEntry.resolved)})` : 'not installed') : undefined],
  ];
  log('');
  for (const [k, v] of rows) if (v) log(`  ${dim(k.padEnd(16))} ${v}`);
  if (!lockEntry) log(`\n  Add it: ${cyan('bee add ' + s.name)}`);
}

/** Re-run the installer (standalone/source installs); dev checkouts update with git. */
export async function cmdUpgrade(flags: Flags): Promise<void> {
  const latest = await fetchLatestVersion(5000);
  if (flags.check) {
    if (!latest) return die(`No published release found for ${REPO} (none released yet, or GitHub is unreachable). See https://github.com/${REPO}/releases`);
    log(compareVersions(latest, PKG.version) > 0
      ? `Update available: ${PKG.version} → ${latest.replace(/^v/, '')}. Run ${cyan('bee upgrade')}`
      : `${green('✓')} bee ${PKG.version} is the latest version.`);
    return;
  }
  if (latest && compareVersions(latest, PKG.version) <= 0 && !flags.force) {
    log(`${green('✓')} bee ${PKG.version} is already the latest version.`);
    return;
  }
  const home = path.join(os.homedir(), '.bee');
  const managed = LIB === home || LIB === path.join(home, 'src') || !!process.env.BEE_HOME;
  if (!managed) {
    log(`bee is running from ${LIB}. Update it there: ${cyan('git pull && npm run build')}`);
    return;
  }
  log(dim(`Running installer from ${INSTALL_URL} …`));
  const r = spawnSync('sh', ['-c', `curl -fsSL "${INSTALL_URL}" | bash`], { stdio: 'inherit' });
  if (r.status !== 0) die('Upgrade failed (see output above).');
  log(`\nIn each project, run ${cyan('bee update')} to move it to the new bundled skills, then commit ${LOCKFILE}.`);
}

export const HELP = `${bold('🐝 bee')} ${dim('v' + PKG.version)}: skills for agent-driven projects

  ${cyan('bee init')}               Interview → pick skills → write .bees → install
      --ai                  let Claude (claude CLI) choose the skills
      --yes                 accept defaults (non-interactive); also --type --stage --workflow --target --name
  ${cyan('bee install')}            Install everything in .bees (exactly as pinned in .bees.lock)
      --frozen              fail instead of changing .bees.lock (CI)
  ${cyan('bee add')} <skill|source>  Add skills: registry name, github:owner/repo/path[#ref], git+<url>::path#ref, ./local
  ${cyan('bee remove')} <skill>      Remove a skill (and the bundled skills only it needed)
  ${cyan('bee update')} [skill]      Pull newer versions and re-pin them
  ${cyan('bee list')}               Show installed skills and whether they match the lock
  ${cyan('bee search')} [words…]    Find skills, best match first (all words must match)
      --tag <tag>           only skills with this tag (e.g. testing, docs, adr)
      --for <type>          only skills recommended for a project type (web-app, api, …)
      --json                machine-readable (used by the skill-advisor agent)
  ${cyan('bee info')} <skill>        What a skill does, what it bundles, whether it's installed
  ${cyan('bee upgrade')}            Update bee to the latest release (--check: just tell me)

  Files: .bees (commit) · .bees.lock (commit) · .claude/skills/* (gitignored, restored by bee install)`;
