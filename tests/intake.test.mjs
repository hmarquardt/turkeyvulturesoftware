import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareMessage, validateUrl } from '../public/assets/intake.js';
test('review URL must be HTTP(S), without embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'example.com', 'https://localhost']) assert.notEqual(validateUrl(url), '', url);
  for (const url of ['https://example.com', 'http://example.org/a?b=c']) assert.equal(validateUrl(url), '');
  assert.equal(validateUrl(''), '');
  assert.notEqual(validateUrl('', true), '');
});
test('inquiry preserves visitor text as plain text and safely encodes an email link', () => {
  const data = { name: ' A & B ', email: 'a@example.com', business: '', url: 'https://example.com', description: '<script>test</script>\nMore & details', service: 'data' };
  const { body, subject } = prepareMessage(data, 'project');
  assert.match(body, /Name: A & B/);
  assert.match(body, /Data & cloud systems/);
  assert.match(body, /<script>test<\/script>/);
  const mail = new URL(`mailto:hmarquardt@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`);
  assert.equal(mail.searchParams.get('body'), body);
  assert.equal([...mail.searchParams.keys()].length, 2);
});
test('autopsy is explicitly a human review with optional problem description', () => {
  const result = prepareMessage({ name: 'Alex', email: 'a@example.com', business: '', url: 'https://example.com', description: '' }, 'autopsy');
  assert.equal(result.subject, 'Site Autopsy request');
  assert.match(result.body, /human review/);
  assert.match(result.body, /initial look/);
  assert.doesNotMatch(result.body, /score|scan complete/);
});
