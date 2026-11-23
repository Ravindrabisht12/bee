import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const IGNORE = new Set(['.git', '.DS_Store', 'node_modules', '__pycache__']);

export function readJSON<T = unknown>(p: string): T {
  return JSON.parse(fs.readFileSync(p, 'utf8')) as T;
}

export function writeJSON(p: string, v: unknown): void {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(v, null, 2) + '\n');
}

export const sortKeys = <T>(o: Record<string, T>): Record<string, T> =>
  Object.fromEntries(Object.keys(o).sort().map(k => [k, o[k]!]));

export function listFiles(dir: string, base = dir): string[] {
  let out: string[] = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1));
  for (const e of entries) {
    if (IGNORE.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listFiles(p, base));
    else if (e.isFile()) out.push(path.relative(base, p).split(path.sep).join('/'));
  }
  return out;
}

/** Content hash of a skill folder: stable across machines (sorted, '/'-separated paths). */
export function hashDir(dir: string): string {
  const h = crypto.createHash('sha256');
  for (const f of listFiles(dir)) {
    h.update(f); h.update('\0');
    h.update(fs.readFileSync(path.join(dir, f))); h.update('\0');
  }
  return 'sha256-' + h.digest('base64');
}

export function copyDir(src: string, dest: string): void {
  fs.rmSync(dest, { recursive: true, force: true });
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, filter: s => !IGNORE.has(path.basename(s)) });
}

/** Minimal SKILL.md frontmatter reader (flat `key: value` lines). */
export function frontmatter(skillDir: string): Record<string, string> | null {
  const p = path.join(skillDir, 'SKILL.md');
  if (!fs.existsSync(p)) return null;
  const m = fs.readFileSync(p, 'utf8').match(/^---\r?\n([\s\S]*?)\r?\n---/);
  const fm: Record<string, string> = {};
  if (m) for (const line of m[1]!.split(/\r?\n/)) {
    const kv = line.match(/^([\w-]+):\s*(.*)$/);
    if (kv) fm[kv[1]!] = kv[2]!.trim();
  }
  return fm;
}
