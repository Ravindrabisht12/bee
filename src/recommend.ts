import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { REGISTRY, regEntry } from './config.js';
import { readJSON } from './fsutil.js';
import { dim, log, warn } from './ui.js';
import type { ProjectInfo } from './types.js';

export interface Detected {
  existing: boolean;
  type: string | null;
  hints: string[];
}

/** Guess project type and whether code already exists, from marker files and dependencies. */
export function detectProject(root: string): Detected {
  const has = (f: string) => fs.existsSync(path.join(root, f));
  const markers = ['package.json', 'pyproject.toml', 'requirements.txt', 'go.mod', 'Cargo.toml', 'composer.json',
    'Gemfile', 'pom.xml', 'build.gradle', 'Package.swift', 'pubspec.yaml', 'src', 'app', 'layout/theme.liquid'];
  const hints: string[] = [];
  let type: string | null = null;
  const setType = (t: string, why: string) => { hints.push(why); type ??= t; };

  if (has('package.json')) {
    try {
      const pj = readJSON<{ dependencies?: Record<string, string>; devDependencies?: Record<string, string>; bin?: unknown }>(path.join(root, 'package.json'));
      const names = Object.keys({ ...pj.dependencies, ...pj.devDependencies });
      const d = (n: string) => names.some(k => k === n || k.startsWith(n + '/'));
      if (d('@shopify')) setType('ecommerce', 'Shopify packages');
      if (d('react-native') || d('expo')) setType('mobile-app', 'React Native / Expo');
      if (d('@modelcontextprotocol') || d('@anthropic-ai') || d('openai') || d('langchain')) setType('ai-agent', 'LLM / MCP SDK');
      if (d('astro')) setType('marketing-site', 'Astro');
      if (d('next') || d('react') || d('vue') || d('svelte') || d('@angular/core') || d('nuxt')) setType('web-app', 'frontend framework');
      if (d('express') || d('fastify') || d('@nestjs/core') || d('hono') || d('koa')) setType('api', 'Node HTTP server');
      if (pj.bin) setType('cli-lib', 'package with bin');
    } catch { /* unreadable package.json: ignore */ }
  }
  const py = ['pyproject.toml', 'requirements.txt'].filter(has)
    .map(f => fs.readFileSync(path.join(root, f), 'utf8')).join('\n').toLowerCase();
  if (/\b(anthropic|mcp|langchain|openai)\b/.test(py)) setType('ai-agent', 'Python LLM SDK');
  if (/\b(fastapi|django|flask)\b/.test(py)) setType('api', 'Python web framework');
  if (has('layout/theme.liquid')) setType('ecommerce', 'Shopify theme');
  if (has('pubspec.yaml') || has('Package.swift')) setType('mobile-app', 'native mobile project');
  return { existing: markers.some(has), type, hints };
}

/** Rule-based choice: skill name → reason. */
export function recommend(ans: ProjectInfo): Map<string, string> {
  const pick = new Map<string, string>();
  const add = (n: string, why: string) => { if (regEntry(n) && !pick.has(n)) pick.set(n, why); };
  const existing = ans.stage === 'existing';
  if (ans.workflow === 'full') {
    if (existing) {
      add('feature-change', 'Existing codebase: change pipeline that starts with codebase recon');
      add('product-research', 'Full workflow includes user/market research');
      add('competitor-analysis', 'Full workflow includes competitor analysis');
    } else add('product-builder', 'New product: full pipeline from idea to explainer');
  } else if (ans.workflow === 'build') {
    if (existing) add('feature-change', 'Existing codebase: change pipeline that starts with codebase recon');
    else for (const n of ['product-design', 'spec', 'adr', 'feature-dev', 'feature-docs', 'feature-explainer']) add(n, 'Build pipeline stage');
  } else {
    for (const n of ['spec', 'adr', 'feature-dev', 'feature-docs']) add(n, 'Lean workflow: contracts, decisions, build, docs');
  }
  for (const s of REGISTRY.skills) if ((s.for ?? []).includes(ans.type)) add(s.name, `Fits ${ans.type} projects`);
  add('skill-advisor', 'Lets the agent suggest more skills as the project grows');
  add('skill-forge', 'Turns corrections into skill improvements');
  return pick;
}

/** Ask Claude (headless `claude -p`) to choose; returns null to fall back to rules. */
export function aiRecommend(ans: ProjectInfo & { name: string }, detected: Detected): Map<string, string> | null {
  if (spawnSync('claude', ['--version'], { encoding: 'utf8' }).status !== 0) {
    warn('`claude` CLI not found; using built-in rules.');
    return null;
  }
  const catalog = REGISTRY.skills
    .map(s => `- ${s.name} [${(s.tags ?? []).join(', ')}]: ${s.summary}${s.requires ? ` (bundles: ${s.requires.join(', ')})` : ''}`)
    .join('\n');
  const prompt = `You are a decision agent choosing which agent skills a software project should use.
Project: ${JSON.stringify({ ...ans, detectedFromRepo: detected.hints })}
Available skills (choose ONLY from these names):
${catalog}
Rules: choose the smallest set that covers how this project will actually be built and reviewed. Orchestrators bundle the skills listed after them, so don't repeat those. Prefer product-builder for new products and feature-change for existing codebases when a pipeline is wanted. Always include skill-advisor and skill-forge.
Reply with ONLY a JSON object: {"skills":[{"name":"<skill>","reason":"<one short sentence>"}]}`;
  log(dim('  Asking Claude to choose skills…'));
  const r = spawnSync('claude', ['-p', prompt], { encoding: 'utf8', timeout: 180_000 });
  try {
    const json = (r.stdout || '').match(/\{[\s\S]*\}/)?.[0];
    if (!json) throw new Error('no JSON');
    const parsed = JSON.parse(json) as { skills?: { name: string; reason?: string }[] };
    const pick = new Map<string, string>();
    for (const s of parsed.skills ?? []) if (regEntry(s.name)) pick.set(s.name, s.reason || 'Chosen by Claude');
    return pick.size ? pick : null;
  } catch {
    warn("Could not parse Claude's answer; using built-in rules.");
    return null;
  }
}
