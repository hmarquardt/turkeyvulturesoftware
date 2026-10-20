import test from 'node:test';
import assert from 'node:assert/strict';
import { services, validEmail, validateInquiry, validateUrl } from '../public/assets/intake.js';

const project = {
  name: ' A & B ', email: 'a@example.com', business: '', url: 'https://example.com',
  description: '<script>test</script> More & details', service: 'data',
};

test('review URL must be HTTP(S), without embedded credentials', () => {
  for (const url of ['javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'example.com', 'https://localhost']) assert.notEqual(validateUrl(url), '', url);
  for (const url of ['https://example.com', 'http://example.org/a?b=c']) assert.equal(validateUrl(url), '');
  assert.equal(validateUrl(''), '');
  assert.notEqual(validateUrl('', true), '');
  assert.notEqual(validateUrl(`https://${'a'.repeat(500)}.com`), '');
});

test('valid email addresses are accepted and header-breaking values are rejected', () => {
  assert.equal(validEmail('a@example.com'), true);
  for (const value of ['a@', 'a b@example.com', 'a@example.com\r\nBcc: x@example.net', `${'a'.repeat(250)}@example.com`]) assert.equal(validEmail(value), false, value);
});

test('project inquiries preserve visitor text and select a known service', () => {
  const { errors, value } = validateInquiry(project, 'project');
  assert.deepEqual(errors, {});
  assert.equal(value.name, 'A & B');
  assert.equal(value.url, 'https://example.com');
  assert.equal(value.description, '<script>test</script> More & details');
  assert.equal(services[value.service], 'Data & cloud systems');
});

test('autopsy is explicitly a human review with an optional problem description', () => {
  const { errors, value } = validateInquiry({
    name: 'Alex', email: 'a@example.com', business: '', url: 'https://example.com', description: '', service: '',
  }, 'autopsy');
  assert.deepEqual(errors, {});
  assert.equal(value.service, '');
  assert.equal(value.description, '');
  assert.equal(validateInquiry({ name: 'Alex', email: 'a@example.com', business: '', url: '', description: '' }, 'autopsy').errors.url, 'Please enter your public website address.');
});

test('client validation matches server limits without silently accepting bad fields', () => {
  const { errors } = validateInquiry({
    name: '', email: 'bad', business: 'x'.repeat(121), url: 'javascript:alert(1)',
    service: 'other', description: 'short',
  }, 'project');
  for (const field of ['name', 'email', 'business', 'service', 'url', 'description']) assert.ok(errors[field], field);
});
