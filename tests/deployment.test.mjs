import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TARGET, validateDomains, validateTarget, verifyRemoteDomains, compareDomains } from '../scripts/check-cloudflare-target.mjs';
import { readUploadVersion } from '../scripts/read-upload-version.mjs';
const config = JSON.parse(readFileSync('wrangler.json', 'utf8'));
const record = (hostname, id) => ({ id, hostname, service: TARGET.worker, zone_id: TARGET.zone, zone_name: TARGET.zoneName, environment: 'production', enabled: true, previews_enabled: false });
const inventory = () => ({ success: true, result: [record(TARGET.hostnames[0], 'a'.repeat(40)), record(TARGET.hostnames[1], 'b'.repeat(40))], result_info: { page: 1, total_pages: 1, count: 2, total_count: 2 } });

test('read-only verification confirms both production domains with one authenticated GET', async () => {
  const calls = [];
  const actual = await verifyRemoteDomains(config, { token: 'test-credential', fetcher: async (url, options) => {
    calls.push({ url, options }); return Response.json(inventory());
  } });
  assert.equal(actual.length, 2);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, `https://api.cloudflare.com/client/v4/accounts/${TARGET.account}/workers/domains?service=turkey-vulture-software`);
  assert.equal(calls[0].options.method, 'GET');
  assert.equal(calls[0].options.body, undefined);
  assert.equal(calls[0].options.redirect, 'error');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer test-credential');
});

test('only the pinned Worker, account, zone and exact two source domains are permitted', () => {
  assert.doesNotThrow(() => validateTarget(config));
  for (const mutation of [
    value => { value.name = 'unrelated-worker'; },
    value => { value.account_id = 'wrong-account'; },
    value => { value.routes = []; },
    value => { value.routes[0].zone_id = 'wrong-zone'; },
    value => { value.routes[0].pattern = 'unrelated.example'; },
    value => { value.routes[0].enabled = false; },
  ]) {
    const changed = structuredClone(config); mutation(changed);
    assert.throws(() => validateTarget(changed));
  }
});

test('malformed responses and incomplete inventories fail closed', () => {
  for (const payload of [null, {}, { success: false }, { success: true, result: {} }, { success: true, result: [] }, { ...inventory(), result_info: [] }, { ...inventory(), result_info: { total_count: 3 } }, { ...inventory(), result_info: { total_pages: 2 } }, { ...inventory(), result_info: { count: '2' } }]) {
    assert.throws(() => validateDomains(payload));
  }
  const noPagination = inventory(); delete noPagination.result_info;
  assert.equal(validateDomains(noPagination).length, 2);
});

test('actual ownership conflicts and ambiguous states prevent publication', () => {
  for (const [field, value] of [
    ['service', 'another-worker'], ['zone_id', 'another-zone'], ['zone_name', 'another.example'],
    ['environment', 'staging'], ['environment', undefined], ['enabled', false], ['enabled', undefined],
    ['previews_enabled', true], ['previews_enabled', undefined], ['id', undefined], ['id', 'not-a-binding-id'],
    ['hostname', 'other.example'],
  ]) {
    const payload = inventory(); payload.result[0][field] = value;
    assert.throws(() => validateDomains(payload), `Must reject ${field}: ${value}`);
  }
  const duplicate = inventory(); duplicate.result[1] = duplicate.result[0];
  assert.throws(() => validateDomains(duplicate), /duplicate|unexpected/i);
  const sharedId = inventory(); sharedId.result[1].id = sharedId.result[0].id;
  assert.throws(() => validateDomains(sharedId), /Duplicate/);
  const extra = inventory(); extra.result.push(record('extra.example', 'c'.repeat(40))); delete extra.result_info;
  assert.throws(() => validateDomains(extra), /unexpected/i);
});

test('permission and authentication failures never authorize a fallback or write', async () => {
  for (const [status, code, message] of [[400, 9106, 'Authentication failed (status: 400)'], [401, 10000, 'Authentication error'], [403, 9109, 'Unauthorized to access requested resource']]) {
    const calls = [];
    await assert.rejects(verifyRemoteDomains(config, { token: 'test-credential', fetcher: async (url, options) => {
      calls.push(options.method); return Response.json({ success: false, errors: [{ code, message }] }, { status });
    } }), error => { assert.ok(error.message.includes(`code ${code}: ${message}`)); return true; });
    assert.deepEqual(calls, ['GET']);
  }
});

test('domain snapshots detect binding replacement between upload and activation', () => {
  const before = validateDomains(inventory());
  assert.doesNotThrow(() => compareDomains(before, validateDomains(inventory())));
  const replaced = inventory(); replaced.result[0].id = 'c'.repeat(40);
  assert.throws(() => compareDomains(before, validateDomains(replaced)), /changed during/);
  assert.throws(() => compareDomains({}, before), /Malformed/);
});

test('activation requires one exact version ID from a successful upload', () => {
  const id = 'dc580544-84b8-457f-92bb-674a9936ce9a';
  assert.equal(readUploadVersion(`Uploaded worker\nWorker Version ID: ${id}\n`), id);
  for (const output of ['', 'Version ID: invalid', `Version ID: ${id}\nVersion ID: ${id}`, `Version ID: ${id}-unexpected`]) assert.throws(() => readUploadVersion(output));
});
