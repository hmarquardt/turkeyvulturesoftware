import assert from 'node:assert/strict';
import { setTimeout } from 'node:timers/promises';
import { TARGET, readPublicRevision } from './check-cloudflare-target.mjs';
const site = process.env.SITE_URL || 'https://turkeyvulturesoftware.com';
const expected = process.env.EXPECTED_COMMIT || process.env.GITHUB_SHA;
assert.ok(expected && /^[a-f0-9]{40}$/.test(expected), 'Set EXPECTED_COMMIT or GITHUB_SHA to a full committed revision.');
assert.equal(new URL(site).protocol, 'https:');
async function get(path, options = {}) {
  return fetch(`${site}${path}`, { redirect: 'manual', signal: AbortSignal.timeout(20000), ...options });
}
let actual;
for (let attempt = 0; attempt < 8; attempt++) {
  try {
    const revision = await get(`/version.json?revision=${expected}`, { headers: { 'Cache-Control': 'no-cache' } });
    assert.equal(revision.status, 200);
    actual = (await revision.json()).commit;
    if (actual === expected && await readPublicRevision(TARGET.workerSite) === expected) break;
  } catch (error) { if (attempt === 7) throw error; }
  if (attempt < 7) await setTimeout(5000);
}
assert.equal(actual, expected, 'Production must serve the committed release.');
assert.equal(await readPublicRevision(TARGET.workerSite), expected, 'Known Worker endpoint must serve the same committed release.');
for (const path of ['/', '/contact', '/site-autopsy', '/privacy', '/robots.txt', '/sitemap.xml', '/assets/social.jpg', '/assets/vulture-640.webp']) {
  const response = await get(path);
  assert.equal(response.status, 200, `${path} status`);
  assert.match(response.headers.get('content-security-policy') || '', /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.ok(response.headers.get('strict-transport-security'));
  if (path === '/') {
    const html = await response.text();
    assert.match(html, /stinks like/);
    assert.doesNotMatch(html, /static\.cloudflareinsights\.com|data-cf-beacon/);
    assert.match(response.headers.get('cache-control'), /no-transform/);
    assert.match(html, /https:\/\/turkeyvulturesoftware.com\//);
  } else await response.body?.cancel();
}
const missing = await get('/release-verification-missing-page');
assert.equal(missing.status, 404);
assert.match(await missing.text(), /flown the coop/);
const www = new URL(site); www.hostname = `www.${www.hostname}`;
const redirect = await fetch(`${www.origin}/contact?service=data`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
assert.equal(redirect.status, 308);
assert.equal(redirect.headers.get('location'), `${site}/contact?service=data`);
console.log(`Verified HTTPS, assets, headers, 404, www redirect and revision ${actual} at ${site}.`);
