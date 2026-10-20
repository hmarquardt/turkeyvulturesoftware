import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGET, validateTarget, validateWorkerSettings, validateDeployment, verifyRemoteWorker, verifyUploadedVersion, readPublicRevision, verifyPublicBaseline, compareWorkerSnapshot } from '../scripts/check-cloudflare-target.mjs';
import { readUploadVersion } from '../scripts/read-upload-version.mjs';
const config = JSON.parse(readFileSync('wrangler.json', 'utf8'));
const deploymentId = '12345678-1234-1234-1234-123456789abc';
const versionId = 'dc580544-84b8-457f-92bb-674a9936ce9a';
const commit = 'a'.repeat(40);
const settings = () => ({ success: true, result: { bindings: [{ type: 'assets', name: 'ASSETS' }] } });
const deployment = () => ({ success: true, result: { deployments: [{ id: deploymentId, strategy: 'percentage', versions: [{ version_id: versionId, percentage: 100 }] }] } });

test('granular authentication and deployment checks use only Worker-specific GET endpoints', async () => {
  const calls = [];
  const actual = await verifyRemoteWorker(config, { token: 'test-credential', fetcher: async (url, options) => {
    calls.push({ url, options }); return Response.json(url.endsWith('/settings') ? settings() : deployment());
  } });
  assert.deepEqual(actual, { deploymentId, versionId });
  assert.deepEqual(calls.map(call => call.url), ['settings', 'deployments'].map(path => `https://api.cloudflare.com/client/v4/accounts/${TARGET.account}/workers/scripts/${TARGET.worker}/${path}`));
  for (const { options } of calls) {
    assert.equal(options.method, 'GET'); assert.equal(options.body, undefined);
    assert.equal(options.redirect, 'error'); assert.equal(options.headers.Authorization, 'Bearer test-credential');
  }
});

test('only the pinned account, Worker and exact trigger declaration are permitted', () => {
  assert.doesNotThrow(() => validateTarget(config));
  for (const mutation of [value => { value.name = 'unrelated-worker'; }, value => { value.account_id = 'wrong'; }, value => { value.routes = []; }, value => { value.routes[0].zone_id = 'wrong'; }, value => { value.routes[0].pattern = 'wrong.example'; }, value => { value.routes[0].enabled = false; }]) {
    const changed = structuredClone(config); mutation(changed); assert.throws(() => validateTarget(changed));
  }
});

test('malformed Worker metadata and unexpected bindings fail closed', () => {
  for (const payload of [null, {}, { success: false }, { success: true, result: {} }, { success: true, result: { bindings: [] } }, { success: true, result: { bindings: [{ type: 'assets', name: 'WRONG' }] } }, { success: true, result: { bindings: [{ type: 'secret_text', name: 'SECRET' }] } }]) assert.throws(() => validateWorkerSettings(payload));
});

test('missing, malformed, split or partial active deployments prevent publication', () => {
  for (const payload of [null, {}, { success: true, result: [] }, { success: true, result: { deployments: [] } }]) assert.throws(() => validateDeployment(payload));
  for (const mutate of [value => { value.id = 'invalid'; }, value => { value.strategy = 'unknown'; }, value => { value.versions = []; }, value => { value.versions.push(value.versions[0]); }, value => { value.versions[0].percentage = 50; }, value => { value.versions[0].version_id = 'invalid'; }]) {
    const payload = deployment(); mutate(payload.result.deployments[0]); assert.throws(() => validateDeployment(payload));
  }
});

test('permission or authentication errors stop without account-wide fallback', async () => {
  for (const [status, code] of [[400, 9106], [401, 10000], [403, 10000]]) {
    const calls = [];
    await assert.rejects(verifyRemoteWorker(config, { token: 'test-credential', fetcher: async (url, options) => {
      calls.push({ url, method: options.method }); return Response.json({ success: false, errors: [{ code, message: 'Authentication error' }] }, { status });
    } }), new RegExp(`HTTP ${status}: code ${code}`));
    assert.equal(calls.length, 1); assert.ok(calls[0].url.endsWith('/settings')); assert.equal(calls[0].method, 'GET');
  }
});

test('concurrent deployment or public revision changes block activation', () => {
  const before = { deploymentId, versionId, publicCommit: commit };
  assert.doesNotThrow(() => compareWorkerSnapshot(before, { ...before }));
  for (const change of [{ deploymentId: versionId }, { versionId: deploymentId }, { publicCommit: 'b'.repeat(40) }]) assert.throws(() => compareWorkerSnapshot(before, { ...before, ...change }), /changed during/);
  assert.throws(() => compareWorkerSnapshot({}, before), /Malformed/);
});

test('uploaded version must have the exact UUID and validated Git SHA tag', async () => {
  for (const result of [{ id: versionId, annotations: { 'workers/tag': commit } }, { id: deploymentId, annotations: { 'workers/tag': commit } }, { id: versionId }, { id: versionId, annotations: { 'workers/tag': 'b'.repeat(40) } }]) {
    const operation = verifyUploadedVersion(versionId, commit, { token: 'test', fetcher: async url => { assert.ok(url.endsWith(`/versions/${versionId}`)); return Response.json({ success: true, result }); } });
    if (result.id === versionId && result.annotations?.['workers/tag'] === commit) await operation;
    else await assert.rejects(operation);
  }
  await assert.rejects(verifyUploadedVersion('invalid', commit, {}));
});

test('public routing baseline requires matching Worker/apex revisions and exact www redirect; no bearer is forwarded', async () => {
  const fetcher = async (url, options) => {
    assert.ok(!options.headers?.Authorization);
    if (url.startsWith('https://www.')) return new Response(null, { status: 308, headers: { location: `${TARGET.site}/contact?service=data` } });
    return Response.json({ commit });
  };
  assert.equal(await verifyPublicBaseline({ fetcher }), commit);
  await assert.rejects(verifyPublicBaseline({ fetcher: async url => Response.json({ commit: url.startsWith(TARGET.workerSite) ? commit : 'b'.repeat(40) }) }), /different revisions/);
  await assert.rejects(verifyPublicBaseline({ fetcher: async url => url.startsWith('https://www.') ? new Response(null, { status: 200 }) : Response.json({ commit }) }), /www routing/);
  await assert.rejects(readPublicRevision(TARGET.site, { fetcher: async () => Response.json({ commit: 'invalid' }) }), /Malformed/);
  await assert.rejects(readPublicRevision(TARGET.site, { fetcher: async () => new Response(null, { status: 302 }) }), /unavailable or redirected/);
});

test('activation requires one exact version ID from a successful upload', () => {
  assert.equal(readUploadVersion(`Worker Version ID: ${versionId}\n`), versionId);
  for (const output of ['', 'Version ID: invalid', `Version ID: ${versionId}\nVersion ID: ${versionId}`, `Version ID: ${versionId}-unexpected`]) assert.throws(() => readUploadVersion(output));
});
