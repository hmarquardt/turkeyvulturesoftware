import test from 'node:test';
import assert from 'node:assert/strict';
import { cloudflareRequest } from '../scripts/cloudflare-api.mjs';
const token = 'test-token-never-log';
test('Cloudflare diagnostics include provider codes and messages while redacting the credential', async () => {
  await assert.rejects(cloudflareRequest('/test', { token, fetcher: async () => Response.json({ success: false, errors: [{ code: 10000, message: `Denied Bearer ${token}` }] }, { status: 400 }) }), error => {
    assert.match(error.message, /HTTP 400.*code 10000: Denied Bearer \[REDACTED\]/);
    assert.ok(!error.message.includes(token));
    return true;
  });
});
test('Cloudflare diagnostics fail closed on malformed JSON', async () => {
  await assert.rejects(cloudflareRequest('/test', { token, fetcher: async () => new Response('<html>invalid</html>') }), /invalid JSON/);
});
test('Cloudflare diagnostics never forward network exception details or response headers', async () => {
  await assert.rejects(cloudflareRequest('/test', { token, fetcher: async () => { throw new Error(`Authorization: Bearer ${token}`); } }), error => {
    assert.equal(error.message, 'Cloudflare request failed or timed out; refusing deployment.'); return true;
  });
  await assert.rejects(cloudflareRequest('/test', { token, fetcher: async () => Response.json({ success: false, errors: [{ code: 9109, message: 'Unauthorized' }] }, { status: 403, headers: { 'sensitive-header': token } }) }), error => {
    assert.match(error.message, /code 9109: Unauthorized/);
    assert.ok(!error.message.includes(token) && !error.message.includes('sensitive-header')); return true;
  });
});
