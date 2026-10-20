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

export function validateDomains(payload) {
  assert.ok(payload?.success === true && Array.isArray(payload.result), 'Malformed Cloudflare domain response; refusing deployment.');
  const domains = payload.result;
  const info = payload.result_info;
  // This documented API is single-page. Reject evidence of incomplete results.
  if (info !== undefined) {
    assert.ok(info && typeof info === 'object' && !Array.isArray(info), 'Malformed domain pagination metadata.');
    for (const key of ['count', 'total_count']) {
      if (info[key] !== undefined) assert.equal(info[key], domains.length, 'Incomplete domain inventory; refusing deployment.');
    }
    for (const key of ['page', 'total_pages']) {
      if (info[key] !== undefined) assert.equal(info[key], 1, 'Incomplete domain inventory; refusing deployment.');
    }
  }
  assert.equal(domains.length, TARGET.hostnames.length, 'Missing or unexpected Custom Domain bindings.');
  assert.deepEqual(domains.map(domain => domain?.hostname).sort(), [...TARGET.hostnames].sort(), 'Missing, duplicate or unexpected Custom Domain bindings.');
  const ids = new Set();
  return domains.map(domain => {
    assert.ok(typeof domain.id === 'string' && /^[a-f0-9]{32,40}$/.test(domain.id), 'Missing or malformed domain binding identity.');
    assert.ok(!ids.has(domain.id), 'Duplicate domain binding identities.');
    ids.add(domain.id);
    assert.equal(domain.service, TARGET.worker, 'Domain is bound to another Worker; refusing deployment.');
    assert.equal(domain.zone_id, TARGET.zone, 'Domain belongs to another zone; refusing deployment.');
    assert.equal(domain.zone_name, TARGET.zoneName, 'Unexpected domain zone name.');
    assert.equal(domain.environment, 'production', 'Domain is not bound to the production environment.');
    assert.equal(domain.enabled, true, 'Production domain is disabled or its state is unknown.');
    assert.equal(domain.previews_enabled, false, 'Unexpected or unknown preview routing configuration.');
    const { id, hostname, service, zone_id, zone_name, environment, enabled, previews_enabled } = domain;
    return { id, hostname, service, zone_id, zone_name, environment, enabled, previews_enabled };
  }).sort((a, b) => a.hostname.localeCompare(b.hostname));
}

export async function verifyRemoteDomains(config, { token, fetcher } = {}) {
  validateTarget(config);
  assert.ok(token, 'Missing stable CLOUDFLARE_API_TOKEN Actions secret; refusing deployment. Local Wrangler OAuth is not a release credential.');
  const query = new URLSearchParams({ service: TARGET.worker });
  const payload = await cloudflareRequest(`/accounts/${TARGET.account}/workers/domains?${query}`, { token, fetcher });
  return validateDomains(payload);
}

export function compareDomains(expected, actual) {
  // Revalidate the persisted metadata as well as the live API response.
  validateDomains({ success: true, result: expected });
  assert.deepEqual(actual, expected, 'Custom Domain bindings changed during the release; refusing activation.');
}

async function main() {
  const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
  const domains = await verifyRemoteDomains(config, { token: process.env.CLOUDFLARE_API_TOKEN });
  const [option, file] = process.argv.slice(2);
  assert.ok((!option && !file) || (['--write-snapshot', '--compare-snapshot'].includes(option) && file), 'Unsupported domain verification arguments.');
  if (option === '--write-snapshot') await writeFile(file, JSON.stringify(domains), { flag: 'wx', mode: 0o600 });
  if (option === '--compare-snapshot') compareDomains(JSON.parse(await readFile(file, 'utf8')), domains);
  console.log('Read-only Cloudflare verification passed: both production domains belong to the expected Worker and zone; bindings unchanged.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try { await main(); }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
