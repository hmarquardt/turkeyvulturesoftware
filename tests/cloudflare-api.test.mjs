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
