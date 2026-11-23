import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJSON } from './fsutil.js';
import type { Registry, RegistrySkill, Target, TargetName } from './types.js';

/** Library root: the bundle lives in dist/, so the library is one level up. */
export const LIB = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const PKG = readJSON<{ version: string }>(path.join(LIB, 'package.json'));
export const REGISTRY = readJSON<Registry>(path.join(LIB, 'registry.json'));

export const MANIFEST = 'harness.json';
export const LOCKFILE = 'harness.lock';
export const CACHE = process.env.BEE_CACHE || path.join(os.homedir(), '.bee', 'cache');

export const TARGETS: Record<TargetName, Target> = {
  claude: { skills: '.claude/skills', agents: '.claude/agents', label: 'Claude Code (.claude/skills)' },
  agents: { skills: '.agents/skills', agents: null, label: 'Other agents (.agents/skills)' },
};

export const GITIGNORE_HEADER = '# Managed by bee: restored by `bee install` from harness.json. Do not edit.';
export const HOOK_CMD =
  'if command -v bee >/dev/null 2>&1; then bee install --quiet; else echo "This project declares agent skills in harness.json, but the bee CLI is not installed, so they are missing."; fi';

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
