import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

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
  const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${config.account_id}/workers/scripts/${config.name}/domains/changeset?replace_state=true`, {
    method: 'POST', signal: AbortSignal.timeout(20000),
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(origins),
  });
  const payload = await response.json();
  assert.ok(response.ok && payload.success, `Could not inspect domain changes (HTTP ${response.status}); refusing deployment.`);
  validateChangeset(payload.result);
  console.log('Cloudflare domain preflight passed: no DNS conflicts, domain transfers, or removals.');
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();
