import test from 'node:test';
import assert from 'node:assert/strict';
import worker from '../src/worker.mjs';
const env = { ASSETS: { fetch: async () => new Response('<h1>Assets</h1>', { headers: { 'content-type': 'text/html' } }) } };
test('www redirects permanently to HTTPS apex and preserves path and query', async () => {
  const response = await worker.fetch(new Request('https://www.turkeyvulturesoftware.com/contact?service=data'), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://turkeyvulturesoftware.com/contact?service=data');
});
test('HTTP apex redirects to HTTPS', async () => {
  const response = await worker.fetch(new Request('http://turkeyvulturesoftware.com/'), env);
  assert.equal(response.status, 308);
  assert.equal(response.headers.get('location'), 'https://turkeyvulturesoftware.com/');
});
test('HTML is protected with security headers and forbids form submissions', async () => {
  const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/'), env);
  assert.equal(response.status, 200);
  assert.match(response.headers.get('content-security-policy'), /form-action 'none'/);
  assert.match(response.headers.get('content-security-policy'), /frame-ancestors 'none'/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('strict-transport-security'), /31536000/);
  assert.ok(!response.headers.has('x-robots-tag'));
});
test('workers.dev is excluded from indexing', async () => {
  const response = await worker.fetch(new Request('https://turkey-vulture-software.hmarquardt.workers.dev/'), env);
  assert.equal(response.headers.get('x-robots-tag'), 'noindex');
});
test('version is uncached and missing asset status is preserved', async () => {
  const version = await worker.fetch(new Request('https://turkeyvulturesoftware.com/version.json'), env);
  assert.equal(version.headers.get('cache-control'), 'no-store');
  const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/missing'), { ASSETS: { fetch: async () => new Response('Missing', { status: 404 }) } });
  assert.equal(response.status, 404);
});
test('online submissions are rejected honestly; no request bodies are consumed', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/api/inquiries', { method }), {});
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.match(await response.text(), /does not accept online submissions/);
  }
});
