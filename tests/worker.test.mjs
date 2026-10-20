import test, { beforeEach, after } from 'node:test';
import assert from 'node:assert/strict';
import worker, { validateInquiry, validEmail, validWebsite } from '../src/worker.mjs';

const UUID = /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/;
const sent = [];
let turnstileResult;
let turnstileCalls;
let rateLimitAllowed;
const originalFetch = globalThis.fetch;

const env = {
  ASSETS: { fetch: async () => new Response('<h1>Assets</h1>', { headers: { 'content-type': 'text/html' } }) },
  SEND_EMAIL: { send: async (message) => { sent.push(message); return { messageId: 'test-message' }; } },
  CONTACT_RATE_LIMIT: { limit: async () => ({ success: rateLimitAllowed }) },
  TURNSTILE_SECRET: 'test-turnstile-secret',
};

const project = {
  requestType: 'project',
  name: 'Alex Rivera',
  email: 'alex@example.com',
  business: 'Example Co',
  website: 'https://example.com',
  service: 'data',
  description: 'We need help connecting an invoicing workflow to our accounting system.',
  turnstileToken: 'test-token',
};

function contactRequest(payload = project, headers = {}) {
  return new Request('https://turkeyvulturesoftware.com/api/contact', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      origin: 'https://turkeyvulturesoftware.com',
      'cf-connecting-ip': '203.0.113.10',
      ...headers,
    },
    body: typeof payload === 'string' ? payload : JSON.stringify(payload),
  });
}

beforeEach(() => {
  sent.length = 0;
  turnstileCalls = [];
  rateLimitAllowed = true;
  turnstileResult = { success: true, action: 'contact', hostname: 'turkeyvulturesoftware.com' };
  globalThis.fetch = async (url, options) => {
    turnstileCalls.push({ url, options });
    return Response.json(turnstileResult);
  };
});

after(() => { globalThis.fetch = originalFetch; });

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

test('HTML is protected with security headers, a working Turnstile policy and no form submissions', async () => {
  const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/'), env);
  assert.equal(response.status, 200);
  const csp = response.headers.get('content-security-policy');
  assert.match(csp, /form-action 'none'/);
  assert.match(csp, /frame-ancestors 'none'/);
  assert.match(csp, /script-src 'self' https:\/\/challenges\.cloudflare\.com/);
  assert.match(csp, /frame-src https:\/\/challenges\.cloudflare\.com/);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
  assert.match(response.headers.get('strict-transport-security'), /31536000/);
  assert.ok(!response.headers.has('x-robots-tag'));
  assert.match(response.headers.get('cache-control'), /no-transform/);
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

test('online submissions outside the contact endpoint are rejected honestly', async () => {
  for (const method of ['POST', 'PUT', 'DELETE', 'OPTIONS']) {
    const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/api/inquiries', { method }), {});
    assert.equal(response.status, 405);
    assert.equal(response.headers.get('allow'), 'GET, HEAD');
    assert.match(await response.text(), /only through the contact form/);
  }
});

test('a valid project inquiry is delivered to the fixed inbox', async () => {
  const response = await worker.fetch(contactRequest(), env);
  assert.equal(response.status, 200);
  const body = await response.json();
  assert.equal(body.ok, true);
  assert.match(body.id, UUID);
  assert.equal(sent.length, 1);
  const message = sent[0];
  assert.equal(message.from.email, 'contact@turkeyvulturesoftware.com');
  assert.equal(message.to, 'hmarquardt@gmail.com');
  assert.deepEqual(message.replyTo, { email: 'alex@example.com', name: 'Alex Rivera' });
  assert.equal(message.subject, '[Turkey Vulture] Project Inquiry — Alex Rivera');
  assert.match(message.text, /Request type: Project Inquiry/);
  assert.match(message.text, new RegExp(`Reference: ${body.id}`));
  assert.match(message.text, /Service: Data & cloud systems/);
  assert.match(message.text, /Website: https:\/\/example\.com/);
  assert.match(message.text, /Submitted: \d{4}-\d{2}-\d{2}T/);
  assert.equal(turnstileCalls.length, 1);
  assert.match(turnstileCalls[0].url, /siteverify/);
  assert.equal(turnstileCalls[0].options.body.get('secret'), 'test-turnstile-secret');
});

test('a Site Autopsy request is labelled and is not an automated scan', async () => {
  const autopsy = {
    requestType: 'autopsy', name: 'Sam & Co', email: 'sam@example.org',
    business: '', website: 'https://example.org', description: '', turnstileToken: 'token',
  };
  const response = await worker.fetch(contactRequest(autopsy), env);
  assert.equal(response.status, 200);
  assert.equal(sent.length, 1);
  assert.equal(sent[0].subject, '[Turkey Vulture] Site Autopsy — Sam & Co');
  assert.match(sent[0].text, /Website review request:/);
  assert.match(sent[0].text, /Not provided/);
  assert.doesNotMatch(sent[0].text, /Service:/);
  assert.doesNotMatch(sent[0].text, /score|scan complete/i);
});

test('visitor input cannot change the recipient or sender', async () => {
  const response = await worker.fetch(contactRequest({
    ...project,
    to: 'attacker@example.net',
    from: 'ceo@example.net',
    replyTo: 'attacker@example.net',
    allowed_sender_addresses: ['attacker@example.net'],
  }), env);
  assert.equal(response.status, 200);
  assert.equal(sent[0].to, 'hmarquardt@gmail.com');
  assert.equal(sent[0].from.email, 'contact@turkeyvulturesoftware.com');
  assert.equal(sent[0].replyTo.email, 'alex@example.com');
});

test('missing and invalid fields fail closed without sending', async () => {
  const response = await worker.fetch(contactRequest({ requestType: 'project', name: '', email: 'not-an-email', website: 'javascript:alert(1)', service: 'other', description: 'short', turnstileToken: 'token' }), env);
  assert.equal(response.status, 400);
  const body = await response.json();
  assert.equal(body.ok, false);
  for (const field of ['name', 'email', 'website', 'service', 'description']) assert.ok(body.fields[field], field);
  assert.equal(sent.length, 0);
  assert.equal(turnstileCalls.length, 0);
});

test('autopsy requires a public website; project accepts an omitted website', async () => {
  const missing = await worker.fetch(contactRequest({ ...project, requestType: 'autopsy', website: '', turnstileToken: 'token' }), env);
  assert.equal(missing.status, 400);
  assert.match((await missing.json()).fields.website, /public website/);
  const optional = await worker.fetch(contactRequest({ ...project, website: '' }), env);
  assert.equal(optional.status, 200);
  assert.match(sent[0].text, /Website: Not provided/);
});

test('email, URL and description validation reject unsafe or overlong input', async () => {
  assert.equal(validEmail('a@example.com'), true);
  for (const value of ['a@', 'a b@example.com', 'a@example', 'a@example.com\r\nBcc: x@example.net', `${'a'.repeat(250)}@example.com`]) assert.equal(validEmail(value), false, value);
  assert.equal(validWebsite('https://example.com/path?q=1'), true);
  for (const value of ['javascript:alert(1)', 'ftp://example.com', 'https://user:pass@example.com', 'https://localhost', 'https://example.com/\nBcc: x@example.net', `https://${'a'.repeat(500)}.com`]) assert.equal(validWebsite(value), false, value);
  const { errors } = validateInquiry({ ...project, description: 'x'.repeat(2001) });
  assert.match(errors.description, /2,000/);
});


test('missing or rejected Turnstile verification blocks delivery', async () => {
  const missing = await worker.fetch(contactRequest({ ...project, turnstileToken: '' }), env);
  assert.equal(missing.status, 403);
  assert.equal(sent.length, 0);

  turnstileResult = { success: false, 'error-codes': ['invalid-input-response'] };
  const rejected = await worker.fetch(contactRequest(), env);
  assert.equal(rejected.status, 403);
  assert.match((await rejected.json()).error, /Verification failed/);
  assert.equal(sent.length, 0);

  turnstileResult = { success: true, action: 'login', hostname: 'turkeyvulturesoftware.com' };
  const wrongAction = await worker.fetch(contactRequest(), env);
  assert.equal(wrongAction.status, 403);
  assert.equal(sent.length, 0);
});

test('Turnstile provider errors and missing configuration fail closed', async () => {
  globalThis.fetch = async () => new Response('Unavailable', { status: 503 });
  const unavailable = await worker.fetch(contactRequest(), env);
  assert.equal(unavailable.status, 403);
  assert.equal(sent.length, 0);

  const noSecret = await worker.fetch(contactRequest(), { ...env, TURNSTILE_SECRET: '' });
  assert.equal(noSecret.status, 503);
  assert.equal(sent.length, 0);
});

test('the rate limit is enforced before verification', async () => {
  rateLimitAllowed = false;
  const response = await worker.fetch(contactRequest(), env);
  assert.equal(response.status, 429);
  assert.match((await response.json()).error, /Too many attempts/);
  assert.equal(sent.length, 0);
  assert.equal(turnstileCalls.length, 0);
});

test('a missing or failing rate-limit binding is unavailable, not open', async () => {
  const missing = await worker.fetch(contactRequest(), { ...env, CONTACT_RATE_LIMIT: undefined });
  assert.equal(missing.status, 503);
  const failing = await worker.fetch(contactRequest(), { ...env, CONTACT_RATE_LIMIT: { limit: async () => { throw new Error('binding failed'); } } });
  assert.equal(failing.status, 503);
  assert.equal(sent.length, 0);
});

test('delivery failures return 502 and never report success', async () => {
  const response = await worker.fetch(contactRequest(), {
    ...env,
    SEND_EMAIL: { send: async () => { const error = new Error('provider rejected'); error.code = 'E_DELIVERY_FAILED'; throw error; } },
  });
  assert.equal(response.status, 502);
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.match(body.error, /couldn’t send/);
});

test('origin, content type, JSON and honeypot protections apply', async () => {
  const origin = await worker.fetch(contactRequest(project, { origin: 'https://evil.example' }), env);
  assert.equal(origin.status, 403);

  const type = await worker.fetch(contactRequest(project, { 'content-type': 'text/plain' }), env);
  assert.equal(type.status, 415);

  const malformed = await worker.fetch(contactRequest('{not json'), env);
  assert.equal(malformed.status, 400);

  const honeypot = await worker.fetch(contactRequest({ ...project, fax: '555-0100' }), env);
  assert.equal(honeypot.status, 400);
  assert.equal(sent.length, 0);
});

test('oversized request bodies are rejected before delivery', async () => {
  const response = await worker.fetch(contactRequest({ ...project, description: 'x'.repeat(17 * 1024) }), env);
  assert.equal(response.status, 413);
  assert.equal(sent.length, 0);
});

test('the contact endpoint is POST-only and uncached', async () => {
  const response = await worker.fetch(new Request('https://turkeyvulturesoftware.com/api/contact'), env);
  assert.equal(response.status, 405);
  assert.equal(response.headers.get('allow'), 'POST');
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.match(response.headers.get('content-security-policy'), /challenges\.cloudflare\.com/);
});
