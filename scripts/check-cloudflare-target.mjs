import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { cloudflareRequest } from './cloudflare-api.mjs';

export const TARGET = Object.freeze({
  account: 'b1aa310aa0a1638d72b8b086a21e557c',
  worker: 'turkey-vulture-software',
  zone: '5b51c5134d58c24ed465a80afa21cfde',
  zoneName: 'turkeyvulturesoftware.com',
  hostnames: ['turkeyvulturesoftware.com', 'www.turkeyvulturesoftware.com'],
  site: 'https://turkeyvulturesoftware.com',
  workerSite: 'https://turkey-vulture-software.hmarquardt.workers.dev',
});

export function validateTarget(config) {
  assert.equal(config?.name, TARGET.worker, 'Unexpected Worker target; refusing deployment.');
  assert.equal(config?.account_id, TARGET.account, 'Unexpected account; refusing deployment.');
  assert.ok(Array.isArray(config.routes), 'Missing expected Custom Domains; refusing deployment.');
  assert.deepEqual(config.routes.map(route => route.pattern).sort(), [...TARGET.hostnames].sort(), 'Expected exactly the existing apex and www domains.');
  for (const route of config.routes) {
    assert.equal(route.custom_domain, true, 'Only existing Custom Domains are permitted.');
    assert.equal(route.zone_id, TARGET.zone, 'Unexpected domain zone.');
    assert.deepEqual(Object.keys(route).sort(), ['pattern', 'zone_id', 'custom_domain'].sort(), 'Unexpected trigger configuration; normal releases cannot reconfigure domains.');
  }
}

export const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i;
export const SHA = /^[a-f0-9]{40}$/;

export function validateWorkerSettings(payload) {
  assert.ok(payload?.success === true && Array.isArray(payload.result?.bindings), 'Malformed Worker settings; refusing deployment.');
  const bindings = payload.result.bindings;
  assert.ok(bindings.length === 1 && bindings[0]?.type === 'assets' && bindings[0]?.name === 'ASSETS', 'Unexpected Worker bindings; refusing deployment.');
}

export function validateDeployment(payload) {
  assert.ok(payload?.success === true && Array.isArray(payload.result?.deployments), 'Malformed Worker deployment response.');
  // Cloudflare documents the first entry as the deployment actively serving traffic.
  const deployment = payload.result.deployments[0];
  assert.ok(deployment && UUID.test(deployment.id), 'Missing or malformed active deployment.');
  assert.ok(deployment.strategy === 'percentage' && Array.isArray(deployment.versions) && deployment.versions.length === 1, 'Unexpected or split Worker deployment; refusing activation.');
  const version = deployment.versions[0];
  assert.ok(UUID.test(version?.version_id) && version.percentage === 100, 'Expected one active Worker version at 100%.');
  return { deploymentId: deployment.id, versionId: version.version_id };
}

export async function verifyRemoteWorker(config, { token, fetcher, log = () => {} } = {}) {
  validateTarget(config);
  assert.ok(token, 'Missing stable CLOUDFLARE_API_TOKEN Actions secret; refusing deployment. Local Wrangler OAuth is not a release credential.');
  const base = `/accounts/${TARGET.account}/workers/scripts/${TARGET.worker}`;
  validateWorkerSettings(await cloudflareRequest(`${base}/settings`, { token, fetcher }));
  log('Authenticated the pinned Worker via GET /settings (supports Individual Workers Editor).');
  return validateDeployment(await cloudflareRequest(`${base}/deployments`, { token, fetcher }));
}

export async function verifyUploadedVersion(versionId, expectedCommit, { token, fetcher } = {}) {
  assert.ok(UUID.test(versionId) && SHA.test(expectedCommit), 'Expected an exact uploaded version UUID and full Git SHA.');
  const payload = await cloudflareRequest(`/accounts/${TARGET.account}/workers/scripts/${TARGET.worker}/versions/${versionId}`, { token, fetcher });
  assert.ok(payload?.success === true && payload.result?.id === versionId, 'Uploaded version identity mismatch.');
  assert.equal(payload.result.annotations?.['workers/tag'], expectedCommit, 'Uploaded version does not belong to the validated Git commit.');
}

export async function readPublicRevision(origin, { fetcher = fetch } = {}) {
  assert.ok([TARGET.site, TARGET.workerSite].includes(origin), 'Unexpected production verification host.');
  const response = await fetcher(`${origin}/version.json?release-check=${Date.now()}`, {
    method: 'GET', redirect: 'manual', signal: AbortSignal.timeout(20000),
    headers: { Accept: 'application/json', 'Cache-Control': 'no-cache' },
  });
  assert.equal(response.status, 200, 'Production revision endpoint is unavailable or redirected.');
  const body = await response.json();
  assert.ok(SHA.test(body?.commit), 'Malformed production revision.');
  return body.commit;
}

export async function verifyPublicBaseline({ fetcher = fetch } = {}) {
  const workerCommit = await readPublicRevision(TARGET.workerSite, { fetcher });
  const apexCommit = await readPublicRevision(TARGET.site, { fetcher });
  assert.equal(apexCommit, workerCommit, 'Apex and known Worker endpoint serve different revisions; refusing release.');
  const www = await fetcher(`https://${TARGET.hostnames[1]}/contact?service=data`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  assert.equal(www.status, 308, 'Unexpected www routing; refusing release.');
  assert.equal(www.headers.get('location'), `${TARGET.site}/contact?service=data`, 'Unexpected www redirect destination.');
  return workerCommit;
}

export function compareWorkerSnapshot(expected, actual) {
  assert.ok(expected && UUID.test(expected.deploymentId) && UUID.test(expected.versionId) && SHA.test(expected.publicCommit), 'Malformed release baseline snapshot.');
  assert.deepEqual(actual, expected, 'Active Worker deployment or public routing changed during upload; refusing activation.');
}

async function main() {
  const args = process.argv.slice(2);
  const options = new Map();
  for (let i = 0; i < args.length; i += 2) {
    assert.ok(['--write-snapshot', '--compare-snapshot', '--uploaded-version', '--expect-version'].includes(args[i]) && args[i + 1] && !options.has(args[i]), 'Unsupported release verification arguments.');
    options.set(args[i], args[i + 1]);
  }
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
  const worker = await verifyRemoteWorker(config, { token, log: console.log });
  if (options.has('--expect-version')) {
    assert.equal(options.size, 1, 'Unexpected postdeployment verification arguments.');
    assert.equal(worker.versionId, options.get('--expect-version'), 'Production API is not serving the uploaded version.');
    await verifyUploadedVersion(worker.versionId, process.env.GITHUB_SHA, { token });
    console.log('Worker API confirms the exact validated version is active at 100%.');
    return;
  }
  const snapshot = { ...worker, publicCommit: await verifyPublicBaseline() };
  if (options.has('--write-snapshot')) {
    assert.equal(options.size, 1, 'Unexpected baseline verification arguments.');
    await writeFile(options.get('--write-snapshot'), JSON.stringify(snapshot), { flag: 'wx', mode: 0o600 });
  } else if (options.has('--compare-snapshot')) {
    assert.equal(options.size, 2, 'Activation requires the baseline and uploaded version.');
    compareWorkerSnapshot(JSON.parse(await readFile(options.get('--compare-snapshot'), 'utf8')), snapshot);
    await verifyUploadedVersion(options.get('--uploaded-version'), process.env.GITHUB_SHA, { token });
  } else assert.equal(options.size, 0, 'Unexpected release verification arguments.');
  console.log('Pinned Worker, active deployment, public revision consistency and www redirect verified; no trigger API was called.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
