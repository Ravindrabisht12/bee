// End-to-end tests for the built CLI (dist/bee.mjs). Offline: git sources use a local repo.
import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const BEE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'bee.mjs');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bee-test-'));
const CACHE = path.join(tmp, 'cache');

function bee(cwd, ...args) {
  const r = spawnSync(process.execPath, [BEE, ...args], { cwd, encoding: 'utf8', env: { ...process.env, BEE_CACHE: CACHE, NO_COLOR: '1' } });
  return { code: r.status, out: r.stdout + r.stderr };
}
const sh = (cwd, cmd, ...args) => {
  const r = spawnSync(cmd, args, { cwd, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout.trim();
};
const gitc = (cwd, ...a) => sh(cwd, 'git', '-c', 'user.email=t@t', '-c', 'user.name=t', ...a);
const read = p => JSON.parse(fs.readFileSync(p, 'utf8'));
const project = name => { const d = path.join(tmp, name); fs.mkdirSync(d, { recursive: true }); return d; };
const skill = (dir, name, body = '') => {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: test skill ${name}\n---\n# ${name}\n${body}`);
};

// A local "remote" repo with a skill, two commits apart.
const remote = path.join(tmp, 'remote');
let firstCommit;
before(() => {
  skill(path.join(remote, 'skills', 'lint'), 'lint', 'v1');
  sh(remote, 'git', 'init', '-q', '-b', 'main');
  gitc(remote, 'add', '-A'); gitc(remote, 'commit', '-qm', 'v1');
  firstCommit = sh(remote, 'git', 'rev-parse', 'HEAD');
});

test('init (new project) installs the orchestrator and its bundled skills', () => {
  const p = project('new-app');
  const r = bee(p, 'init', '--yes', '--type', 'cli-lib', '--stage', 'new');
  assert.equal(r.code, 0, r.out);
  const m = read(path.join(p, '.bees'));
  assert.ok(m.skills['product-builder']);
  const lock = read(path.join(p, '.bees.lock'));
  for (const s of ['spec', 'adr', 'feature-dev', 'product-research']) {
    assert.deepEqual(lock.skills[s].requiredBy, ['product-builder'], s);
    assert.ok(fs.existsSync(path.join(p, '.claude/skills', s, 'SKILL.md')), s);
  }
  assert.ok(fs.existsSync(path.join(p, '.claude/agents/researcher.md')));
  assert.match(fs.readFileSync(path.join(p, '.claude/skills/.gitignore'), 'utf8'), /^\/spec\/$/m);
  assert.match(fs.readFileSync(path.join(p, 'CLAUDE.md'), 'utf8'), /bee:start[\s\S]*docs\/adr/);
  assert.match(fs.readFileSync(path.join(p, '.claude/settings.json'), 'utf8'), /bee install/);
});

test('init detects an existing codebase and picks feature-change', () => {
  const p = project('existing');
  fs.writeFileSync(path.join(p, 'package.json'), JSON.stringify({ dependencies: { express: '4' } }));
  const r = bee(p, 'init', '--yes', '--no-hook');
  assert.equal(r.code, 0, r.out);
  const m = read(path.join(p, '.bees'));
  assert.equal(m.project.type, 'api');
  assert.equal(m.project.stage, 'existing');
  assert.ok(m.skills['feature-change']);
  assert.ok(!fs.existsSync(path.join(p, '.claude/settings.json')));
});

test('git sources are pinned; a teammate gets the same commit even after upstream moves', () => {
  const p = project('pinned');
  assert.equal(bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook').code, 0);
  const r = bee(p, 'add', `git+file://${remote}::skills/lint#main`);
  assert.equal(r.code, 0, r.out);
  assert.equal(read(path.join(p, '.bees.lock')).skills.lint.commit, firstCommit);

  // Upstream publishes v2.
  fs.appendFileSync(path.join(remote, 'skills/lint/SKILL.md'), 'v2');
  gitc(remote, 'commit', '-qam', 'v2');

  // Teammate: fresh copy with only committed files, then bee install.
  const mate = project('pinned-mate');
  for (const f of ['.bees', '.bees.lock']) fs.copyFileSync(path.join(p, f), path.join(mate, f));
  assert.equal(bee(mate, 'install').code, 0);
  assert.doesNotMatch(fs.readFileSync(path.join(mate, '.claude/skills/lint/SKILL.md'), 'utf8'), /v2/);
  assert.deepEqual(read(path.join(mate, '.bees.lock')), read(path.join(p, '.bees.lock')));

  // bee update moves to v2 and re-pins.
  assert.equal(bee(mate, 'update', 'lint').code, 0);
  assert.match(fs.readFileSync(path.join(mate, '.claude/skills/lint/SKILL.md'), 'utf8'), /v2/);
  assert.notEqual(read(path.join(mate, '.bees.lock')).skills.lint.commit, firstCommit);
});

test('install refuses content that does not match the lock', () => {
  const p = project('tamper');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  const lockPath = path.join(p, '.bees.lock');
  const lock = read(lockPath);
  lock.skills.spec.integrity = 'sha256-tampered';
  fs.writeFileSync(lockPath, JSON.stringify(lock));
  const r = bee(p, 'install');
  assert.equal(r.code, 1);
  assert.match(r.out, /spec: content differs from .bees.lock/);
});

test('local edits to an installed skill are protected unless --force', () => {
  const p = project('edits');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  const f = path.join(p, '.claude/skills/adr/SKILL.md');
  fs.appendFileSync(f, '\nmy edit');
  const r = bee(p, 'install');
  assert.equal(r.code, 1);
  assert.match(r.out, /edited locally/);
  assert.match(fs.readFileSync(f, 'utf8'), /my edit/);
  assert.match(bee(p, 'list').out, /adr .*modified locally/);
  assert.equal(bee(p, 'install', '--force').code, 0);
  assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /my edit/);
});

test('unmanaged skill folders are never clobbered; hand-made skills stay out of .gitignore', () => {
  const p = project('unmanaged');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  skill(path.join(p, '.claude/skills/mine'), 'mine');
  skill(path.join(p, '.claude/skills/pdf'), 'pdf');
  const r = bee(p, 'add', 'pdf');
  assert.equal(r.code, 1);
  assert.match(r.out, /not managed by bee/);
  assert.doesNotMatch(fs.readFileSync(path.join(p, '.claude/skills/.gitignore'), 'utf8'), /mine/);
});

test('--frozen fails when .bees and .bees.lock disagree', () => {
  const p = project('frozen');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  skill(path.join(p, 'tools/deploy'), 'deploy');
  const m = read(path.join(p, '.bees'));
  m.skills.deploy = 'file:./tools/deploy';
  fs.writeFileSync(path.join(p, '.bees'), JSON.stringify(m));
  const before = fs.readFileSync(path.join(p, '.bees.lock'), 'utf8');
  const r = bee(p, 'install', '--frozen');
  assert.equal(r.code, 1);
  assert.match(r.out, /deploy: missing in .bees.lock/);
  assert.equal(fs.readFileSync(path.join(p, '.bees.lock'), 'utf8'), before);
});

test('remove prunes the skill, its bundled skills, and their agents', () => {
  const p = project('remove');
  bee(p, 'init', '--yes', '--stage', 'new', '--type', 'cli-lib', '--no-hook');
  assert.match(bee(p, 'remove', 'spec').out, /bundled by product-builder/);
  assert.equal(bee(p, 'remove', 'product-builder').code, 0);
  assert.ok(!fs.existsSync(path.join(p, '.claude/skills/product-research')));
  assert.ok(!fs.existsSync(path.join(p, '.claude/agents/researcher.md')));
  assert.ok(fs.existsSync(path.join(p, '.claude/skills/skill-forge')));
  assert.equal(read(path.join(p, '.bees.lock')).skills.spec, undefined);
});

test('search --json lists registry skills with install state', () => {
  const p = project('search');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  const hits = JSON.parse(bee(p, 'search', 'adr', '--json').out);
  const adr = hits.find(h => h.name === 'adr');
  assert.ok(adr && adr.installed);
});

test('legacy harness.json / harness.lock are migrated to .bees / .bees.lock', () => {
  const p = project('legacy');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  fs.renameSync(path.join(p, '.bees'), path.join(p, 'harness.json'));
  fs.renameSync(path.join(p, '.bees.lock'), path.join(p, 'harness.lock'));
  assert.match(bee(p, 'init', '--yes').out, /already exists/);
  const r = bee(p, 'install');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Renamed harness.json → .bees/);
  assert.ok(fs.existsSync(path.join(p, '.bees')) && fs.existsSync(path.join(p, '.bees.lock')));
  assert.ok(!fs.existsSync(path.join(p, 'harness.json')));
});

test('init detects a Java (Maven) project', () => {
  const p = project('java');
  fs.writeFileSync(path.join(p, 'pom.xml'), '<project/>');
  const r = bee(p, 'init', '--yes', '--no-hook');
  assert.match(r.out, /Detected: Java\/Kotlin \(Maven\)/);
  assert.equal(read(path.join(p, '.bees')).project.type, 'api');
});

test('search ranks by relevance, requires every word, and supports --tag / --for', () => {
  const p = project('search2');
  const top = JSON.parse(bee(p, 'search', 'test', '--json').out)[0];
  assert.equal(top.name, 'webapp-testing');
  const both = JSON.parse(bee(p, 'search', 'decision', 'record', '--json').out);
  assert.deepEqual(both.map(s => s.name), ['adr']);
  const tagged = JSON.parse(bee(p, 'search', '--tag', 'ai', '--json').out).map(s => s.name).sort();
  assert.deepEqual(tagged, ['claude-api', 'mcp-builder']);
  const forApi = JSON.parse(bee(p, 'search', '--for', 'ai-agent', '--json').out).map(s => s.name).sort();
  assert.deepEqual(forApi, ['claude-api', 'mcp-builder']);
  assert.match(bee(p, 'search', 'zzzz').out, /No skills match "zzzz"[\s\S]*Tags:/);
});

test('info shows what a skill bundles and suggests near matches', () => {
  const p = project('info');
  const r = bee(p, 'info', 'spec');
  assert.equal(r.code, 0, r.out);
  assert.match(r.out, /Bundled by\s+product-builder, feature-change/);
  assert.match(r.out, /When agents use it:/);
  const miss = bee(p, 'info', 'specs');
  assert.equal(miss.code, 1);
  assert.match(miss.out, /Did you mean: spec/);
});

test('lock made by a different bee version explains whether to upgrade or update', () => {
  const p = project('versions');
  bee(p, 'init', '--yes', '--workflow', 'lean', '--no-hook');
  const lockPath = path.join(p, '.bees.lock');
  const setVersion = v => {
    const l = read(lockPath);
    l.skills.adr.resolved = `bee@${v}`;
    l.skills.adr.integrity = 'sha256-other';
    fs.writeFileSync(lockPath, JSON.stringify(l));
  };
  setVersion('99.0.0');
  assert.match(bee(p, 'install').out, /made with bee 99\.0\.0, but you have .*Run `bee upgrade`/);
  setVersion('0.0.1');
  assert.match(bee(p, 'install').out, /made with bee 0\.0\.1; you have the newer .*Run `bee update`/);
  assert.equal(bee(p, 'update').code, 0);
  assert.equal(bee(p, 'install').code, 0);
});
