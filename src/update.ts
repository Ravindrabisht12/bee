import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { PKG, REPO } from './config.js';
import { cyan, isQuiet, yellow } from './ui.js';

/** Compare dotted versions ("v0.10.1" vs "0.9.0"); >0 when a is newer. */
export function compareVersions(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.-]/).map(n => parseInt(n, 10) || 0);
  const pb = b.replace(/^v/, '').split(/[.-]/).map(n => parseInt(n, 10) || 0);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

const STATE_FILE = path.join(process.env.BEE_STATE_DIR || path.join(os.homedir(), '.bee'), 'update-check.json');
const DAY = 24 * 60 * 60 * 1000;

interface State { checkedAt: number; latest: string | null }

function readState(): State {
  try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')) as State; } catch { return { checkedAt: 0, latest: null }; }
}
function writeState(s: State): void {
  try { fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true }); fs.writeFileSync(STATE_FILE, JSON.stringify(s)); } catch { /* best effort */ }
}

/** Latest release tag on GitHub, or null if it can't be determined quickly. */
export async function fetchLatestVersion(timeoutMs = 1500): Promise<string | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { 'User-Agent': 'bee-cli', Accept: 'application/vnd.github+json' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!r.ok) return null;
    const j = (await r.json()) as { tag_name?: string };
    return j.tag_name ?? null;
  } catch {
    return null;
  }
}

/**
 * At most once a day, look up the latest release and print a one-line notice if bee is outdated.
 * Silent in CI, in --quiet mode, when output isn't a terminal, or with BEE_NO_UPDATE_CHECK=1.
 */
export async function notifyIfOutdated(): Promise<void> {
  if (process.env.BEE_NO_UPDATE_CHECK || process.env.CI || !process.stderr.isTTY || isQuiet()) return;
  let state = readState();
  if (Date.now() - state.checkedAt > DAY) {
    state = { checkedAt: Date.now(), latest: (await fetchLatestVersion()) ?? state.latest };
    writeState(state);
  }
  if (state.latest && compareVersions(state.latest, PKG.version) > 0) {
    console.error(yellow(`\n🐝 bee ${state.latest.replace(/^v/, '')} is available (you have ${PKG.version}). Update: `) + cyan('bee upgrade'));
  }
}
