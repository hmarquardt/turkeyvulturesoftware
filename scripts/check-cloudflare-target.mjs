import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { cloudflareRequest } from './cloudflare-api.mjs';

export function validateChangeset(changeset) {
  assert.ok(Array.isArray(changeset.added) && Array.isArray(changeset.updated) && Array.isArray(changeset.removed) && Array.isArray(changeset.conflicting), 'Unexpected Cloudflare changeset shape; refusing deployment.');
  assert.equal(changeset.conflicting.length, 0, 'Conflicting DNS records; refusing to overwrite.');
  assert.equal(changeset.removed.length, 0, 'Unexpected domain removals; refusing deployment.');
  assert.ok(changeset.updated.every(domain => !domain.modified), 'Existing domain bindings would change; inspect them interactively.');
}

async function main() {
  const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
  assert.equal(config.name, 'turkey-vulture-software');
  assert.equal(config.account_id, 'b1aa310aa0a1638d72b8b086a21e557c');
  const routes = config.routes || [];
  for (const route of routes) {
    assert.equal(route.custom_domain, true);
    assert.ok(['turkeyvulturesoftware.com', 'www.turkeyvulturesoftware.com'].includes(route.pattern));
  }
  if (!routes.length) return;
  const token = process.env.CLOUDFLARE_API_TOKEN;
  assert.ok(token, 'Missing stable CLOUDFLARE_API_TOKEN Actions secret; refusing deployment. Local Wrangler OAuth is not a release credential.');
  const origins = routes.map(route => ({ hostname: route.pattern, zone_id: route.zone_id }));
  let payload;
  try {
    payload = await cloudflareRequest(`/accounts/${config.account_id}/workers/scripts/${config.name}/domains/changeset?replace_state=true`, { token, method: 'POST', body: origins });
  } catch (error) {
    console.error(`Changeset preflight: ${error.message}`);
    console.log('Credential presentation checks (no values):', JSON.stringify({
      outerWhitespace: token !== token.trim(),
      includesBearerPrefix: /^Bearer\s/i.test(token.trim()),
      surroundedByQuotes: /^(["']).*\1$/.test(token.trim()),
      looksLikeTokenId: /^[a-f0-9]{32}$/i.test(token.trim()),
      scannableAccountToken: token.startsWith('cfat_'),
    }));
    try {
      await cloudflareRequest(`/accounts/${config.account_id}/workers/scripts/${config.name}/settings`, { token });
      console.log('Worker-specific metadata read: authenticated successfully.');
    } catch (workerError) { console.error(`Worker-specific metadata read: ${workerError.message}`); }
    // Diagnostic only: a successful lookup does not bypass the current safety gate.
    const query = new URLSearchParams({ service: config.name, zone_id: routes[0].zone_id });
    try {
      const domains = await cloudflareRequest(`/accounts/${config.account_id}/workers/domains?${query}`, { token });
      assert.ok(Array.isArray(domains.result), 'Unexpected domain-list response.');
      console.log('Read-only domain lookup:', JSON.stringify({
        domains: domains.result.map(({ id, hostname, service, zone_id, environment, enabled, previews_enabled }) => ({ id, hostname, service, zone_id, environment, enabled, previews_enabled })),
        result_info: domains.result_info,
      }));
    } catch (lookupError) { console.error(`Read-only domain lookup: ${lookupError.message}`); }
    throw new Error('Cloudflare changeset verification failed; production publication remains blocked.');
  }
  validateChangeset(payload.result);
  console.log('Cloudflare domain preflight passed: no DNS conflicts, domain transfers, or removals.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
