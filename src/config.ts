import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON } from './fsutil.js';
import type { Registry, RegistrySkill, Target, TargetName } from './types.js';

/**
 * Library root (holds registry.json, skills/, agents/). Works for every way bee is run:
 *   BEE_HOME override → repo checkout / source install (dist/bee.mjs, one level down)
 *   → standalone binary (~/.bee/bin/bee, library in ~/.bee).
 */
function findLib(): string {
  const candidates = [process.env.BEE_HOME];
  try { candidates.push(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')); } catch { /* not a file: URL in compiled binaries */ }
  candidates.push(path.resolve(path.dirname(process.execPath), '..'));
  for (const c of candidates) if (c && fs.existsSync(path.join(c, 'registry.json'))) return c;
  console.error('bee: cannot find its skill library (registry.json). Reinstall bee, or set BEE_HOME.');
  process.exit(1);
}
export const LIB = findLib();
export const PKG = readJSON<{ version: string }>(path.join(LIB, 'package.json'));
export const REGISTRY = readJSON<Registry>(path.join(LIB, 'registry.json'));

/** GitHub repo that hosts bee releases and the installer. */
export const REPO = process.env.BEE_REPO || 'Ravindrabisht12/bee';
export const INSTALL_URL = `https://raw.githubusercontent.com/${REPO}/main/install.sh`;

export const MANIFEST = '.bees';
export const LOCKFILE = '.bees.lock';
/** Earlier file names, migrated automatically. */
export const LEGACY_MANIFEST = 'harness.json';
export const LEGACY_LOCKFILE = 'harness.lock';
export const CACHE = process.env.BEE_CACHE || path.join(os.homedir(), '.bee', 'cache');

export const TARGETS: Record<TargetName, Target> = {
  claude: { skills: '.claude/skills', agents: '.claude/agents', label: 'Claude Code (.claude/skills)' },
  agents: { skills: '.agents/skills', agents: null, label: 'Other agents (.agents/skills)' },
};

export const GITIGNORE_HEADER = '# Managed by bee: restored by `bee install` from .bees. Do not edit.';
export const HOOK_CMD =
  'if command -v bee >/dev/null 2>&1; then bee install --quiet; else echo "This project declares agent skills in .bees, but the bee CLI is not installed, so they are missing."; fi';

export const PROJECT_TYPES: [string, string][] = [
  ['web-app', 'Web app (SaaS, dashboard, internal tool)'],
  ['mobile-app', 'Mobile app'],
  ['api', 'API / backend service'],
  ['ecommerce', 'E-commerce / Shopify'],
  ['marketing-site', 'Marketing site / landing pages'],
  ['ai-agent', 'AI agent / LLM / MCP app'],
  ['cli-lib', 'CLI tool or library'],
  ['other', 'Something else'],
];

export const WORKFLOWS: [string, string][] = [
  ['full', 'Full pipeline: research → competitors → design → spec/ADR → build → docs → explainer'],
  ['build', 'Build pipeline: design → spec/ADR → build → docs → explainer'],
  ['lean', 'Lean: spec/ADR → build → docs'],
];

export const regEntry = (name: string): RegistrySkill | undefined => REGISTRY.skills.find(s => s.name === name);
