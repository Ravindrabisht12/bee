import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { CACHE, LIB, PKG, regEntry } from './config.js';
import { frontmatter } from './fsutil.js';
import { die } from './ui.js';
import type { Source } from './types.js';

/**
 * Source specs:
 *   bee:<name>                               bundled with this library
 *   github:owner/repo[/path/to/skill][#ref]
 *   git+<url>[::path/to/skill][#ref]
 *   file:<path> | ./path | ../path | /abs     a skill folder on disk
 */
export function parseSource(spec: string): Source | null {
  const splitRef = (s: string): [string, string | null] => {
    const i = s.lastIndexOf('#');
    return i >= 0 ? [s.slice(0, i), s.slice(i + 1)] : [s, null];
  };
  if (spec.startsWith('bee:')) return { kind: 'bee', name: spec.slice(4) };
  if (spec.startsWith('github:')) {
    const [rest, ref] = splitRef(spec.slice(7));
    const [owner, repo, ...sub] = rest.split('/');
    if (!owner || !repo) die(`Bad source "${spec}". Use github:owner/repo[/path/to/skill][#ref]`);
    return { kind: 'git', url: `https://github.com/${owner}/${repo}.git`, sub: sub.join('/'), ref };
  }
  if (spec.startsWith('git+')) {
    let [rest, ref] = splitRef(spec.slice(4));
    let sub = '';
    const i = rest.indexOf('::');
    if (i >= 0) { sub = rest.slice(i + 2); rest = rest.slice(0, i); }
    return { kind: 'git', url: rest, sub, ref };
  }
  if (spec.startsWith('file:')) return { kind: 'file', path: spec.slice(5) };
  if (/^(\.{1,2}\/|\/)/.test(spec)) return { kind: 'file', path: spec };
  return null;
}

/** Turn what the user typed (registry name or source) into a manifest entry. */
export function resolveInput(arg: string, root: string): { name: string; spec: string } {
  const src = parseSource(arg);
  if (!src) {
    const e = regEntry(arg);
    if (!e) return die(`Unknown skill "${arg}". Try \`bee search ${arg}\`, or pass a source like github:owner/repo/path.`);
    return { name: e.name, spec: e.source };
  }
  const spec = src.kind === 'file' && !arg.startsWith('file:') ? 'file:' + arg : arg;
  let name: string;
  if (src.kind === 'bee') name = src.name;
  else if (src.kind === 'file') name = frontmatter(path.resolve(root, src.path))?.name || path.basename(src.path);
  else name = path.basename(src.sub || src.url.replace(/\.git$/, ''));
  return { name, spec };
}

// ---------- git ----------
function git(args: string[]): string {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  if (r.status !== 0) die(`git ${args.join(' ')} failed: ${(r.stderr || r.error?.message || '').trim()}`);
  return r.stdout.trim();
}

function tryRev(dir: string, rev: string): string | null {
  const r = spawnSync('git', ['-C', dir, 'rev-parse', '--verify', '--quiet', `${rev}^{commit}`], { encoding: 'utf8' });
  return r.status === 0 ? r.stdout.trim() : null;
}

/** Check out a repo in the shared cache at the locked commit (or the ref's latest when refreshing). */
function gitCheckout(url: string, ref: string | null, lockedCommit: string | undefined, refresh: boolean) {
  const dir = path.join(CACHE, crypto.createHash('sha1').update(url).digest('hex').slice(0, 16));
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.mkdirSync(CACHE, { recursive: true });
    git(['clone', '--quiet', '--filter=blob:none', '--no-checkout', url, dir]);
  } else if (refresh || !lockedCommit || !tryRev(dir, lockedCommit)) {
    git(['-C', dir, 'fetch', '--quiet', '--tags', '--force', 'origin']);
  }
  let sha = lockedCommit && !refresh ? tryRev(dir, lockedCommit) : null;
  if (lockedCommit && !refresh && !sha) die(`Locked commit ${lockedCommit.slice(0, 10)} not found in ${url}`);
  if (!sha) sha = ref ? (tryRev(dir, `origin/${ref}`) || tryRev(dir, ref)) : tryRev(dir, 'origin/HEAD');
  if (!sha) return die(`Ref "${ref || 'HEAD'}" not found in ${url}`);
  git(['-C', dir, 'checkout', '--quiet', '--force', '--detach', sha]);
  return { dir, commit: sha };
}

export interface Fetched {
  /** Valid only until the next fetch from the same repo: copy it immediately. */
  dir: string;
  resolved: string;
  commit?: string;
  kind: Source['kind'];
}

export function fetchSkill(spec: string, root: string, lockedCommit: string | undefined, refresh: boolean): Fetched {
  const src = parseSource(spec) ?? die(`Bad source "${spec}"`);
  let out: Fetched;
  if (src.kind === 'bee') out = { dir: path.join(LIB, 'skills', src.name), resolved: `bee@${PKG.version}`, kind: 'bee' };
  else if (src.kind === 'file') out = { dir: path.resolve(root, src.path), resolved: 'file', kind: 'file' };
  else {
    const co = gitCheckout(src.url, src.ref, lockedCommit, refresh);
    out = { dir: src.sub ? path.join(co.dir, src.sub) : co.dir, resolved: co.commit, commit: co.commit, kind: 'git' };
  }
  if (!fs.existsSync(path.join(out.dir, 'SKILL.md'))) die(`No SKILL.md found for ${spec} (looked in ${out.dir})`);
  return out;
}

/** Agents to install with a skill: registry-declared library agents plus the skill's own agents/*.md. */
export function skillAgents(name: string, spec: string, dir: string): { name: string; file: string }[] {
  const e = regEntry(name);
  const fromRegistry = e && e.source === spec
    ? (e.agents ?? []).map(a => ({ name: a, file: path.join(LIB, 'agents', `${a}.md`) }))
    : [];
  const own = fs.existsSync(path.join(dir, 'agents'))
    ? fs.readdirSync(path.join(dir, 'agents')).filter(f => f.endsWith('.md'))
        .map(f => ({ name: f.slice(0, -3), file: path.join(dir, 'agents', f) }))
    : [];
  return [...fromRegistry, ...own];
}
