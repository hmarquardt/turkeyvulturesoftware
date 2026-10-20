import test from 'node:test';
import assert from 'node:assert/strict';
import { validateChangeset } from '../scripts/check-cloudflare-target.mjs';
const safe = { added: [{ hostname: 'turkeyvulturesoftware.com' }], updated: [], removed: [], conflicting: [] };
test('domain preflight permits a conflict-free attachment or unchanged binding', () => {
  assert.doesNotThrow(() => validateChangeset(safe));
  assert.doesNotThrow(() => validateChangeset({ ...safe, updated: [{ modified: false }] }));
});
test('domain preflight rejects record overwrite, binding transfer, and removal', () => {
  assert.throws(() => validateChangeset({ ...safe, conflicting: [{ hostname: 'turkeyvulturesoftware.com' }] }), /Conflicting DNS/);
  assert.throws(() => validateChangeset({ ...safe, updated: [{ modified: true }] }), /bindings would change/);
  assert.throws(() => validateChangeset({ ...safe, removed: [{ hostname: 'unexpected.example' }] }), /domain removals/);
});
test('domain preflight fails closed on an unexpected provider response', () => {
  assert.throws(() => validateChangeset({}), /Unexpected Cloudflare/);
});
