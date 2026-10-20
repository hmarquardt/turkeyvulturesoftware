import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { parse } from 'yaml';

const workflow = parse(readFileSync('.github/workflows/production.yml', 'utf8'));
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

test('main pushes trigger production; PRs trigger validation without production eligibility', () => {
  assert.deepEqual(workflow.on.push.branches, ['main']);
  assert.ok(Object.hasOwn(workflow.on, 'pull_request'));
  const condition = workflow.jobs.deploy.if;
  assert.match(condition, /github\.ref == 'refs\/heads\/main'/);
  assert.match(condition, /github\.event_name != 'pull_request'/);
  assert.doesNotMatch(condition, /vars\.|always\(|failure\(|cancelled\(/);
});

test('failed validation prevents deployment, and the full validation suite remains required', () => {
  const needs = [workflow.jobs.deploy.needs].flat();
  assert.ok(needs.includes('validate'));
  const commands = workflow.jobs.validate.steps.map(step => step.run).filter(Boolean);
  for (const command of ['npm ci', 'npm run check', 'npm run build', 'npm test']) {
    assert.ok(commands.includes(command), `Missing required validation: ${command}`);
  }
  assert.ok(commands.some(command => /wrangler deploy .*--dry-run/.test(command)));
});

test('CI publishes with an Actions secret and verifies that same committed revision', () => {
  const steps = workflow.jobs.deploy.steps;
  const publish = steps.findIndex(step => /wrangler deploy/.test(step.run || ''));
  const verification = steps.findIndex(step => step.run === 'npm run verify:production');
  assert.ok(publish >= 0 && verification > publish);
  assert.equal(steps[publish].env.CLOUDFLARE_API_TOKEN, '${{ secrets.CLOUDFLARE_API_TOKEN }}');
  assert.match(steps[publish].run, /--no-x-provision/);
  assert.ok(steps.slice(0, publish).some(step => step.run === 'node scripts/check-cloudflare-target.mjs'));
  assert.ok(!steps.some(step => step.run === 'npm run deploy'));
  assert.ok(!workflow.jobs.validate.steps.some(step => step.env?.CLOUDFLARE_API_TOKEN));
});

test('local npm deploy refuses without contacting Cloudflare', () => {
  assert.equal(pkg.scripts.deploy, 'node scripts/refuse-direct-deploy.mjs');
  const result = spawnSync(process.execPath, ['scripts/refuse-direct-deploy.mjs'], { encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /git push origin main/);
  assert.match(result.stderr, /deliberately refuses/);
});

test('the publication preflight rejects a missing stable secret rather than falling back to OAuth', () => {
  const env = { ...process.env };
  delete env.CLOUDFLARE_API_TOKEN;
  const result = spawnSync(process.execPath, ['scripts/check-cloudflare-target.mjs'], { env, encoding: 'utf8', timeout: 3000 });
  assert.equal(result.status, 1);
  assert.match(result.stderr, /Missing stable CLOUDFLARE_API_TOKEN Actions secret/);
});
