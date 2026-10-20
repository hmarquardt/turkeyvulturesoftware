const APEX = 'turkeyvulturesoftware.com';
const CONTACT_PATH = '/api/contact';
const TO_EMAIL = 'hmarquardt@gmail.com';
const FROM_EMAIL = 'contact@turkeyvulturesoftware.com';
const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';
const MAX_BODY_BYTES = 16 * 1024;
const NAME_MAX = 100;
const EMAIL_MAX = 254;
const BUSINESS_MAX = 120;
const WEBSITE_MAX = 500;
const DESCRIPTION_MAX = 2000;
const DESCRIPTION_MIN = 20;
const CSP = "default-src 'none'; script-src 'self' https://challenges.cloudflare.com; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self' https://challenges.cloudflare.com; frame-src https://challenges.cloudflare.com; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests";

const SERVICES = new Map([
  ['unsure', 'Let’s figure it out'],
  ['website', 'Website rescue or development'],
  ['software', 'Custom software'],
  ['automation', 'AI & business automation'],
  ['data', 'Data & cloud systems'],
]);

const REQUEST_TYPES = new Map([
  ['autopsy', 'Site Autopsy'],
  ['project', 'Project Inquiry'],
]);

const ALLOWED_ORIGINS = new Set([
  `https://${APEX}`,
  `https://www.${APEX}`,
  'https://turkey-vulture-software.hmarquardt.workers.dev',
  'http://127.0.0.1:8787',
  'http://localhost:8787',
]);

const ALLOWED_TURNSTILE_HOSTNAMES = new Set([
  APEX,
  `www.${APEX}`,
  'turkey-vulture-software.hmarquardt.workers.dev',
  '127.0.0.1',
  'localhost',
]);

function jsonResponse(body, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...extraHeaders,
    },
  });
}

function cleanLine(value) {
  return value
    .replace(/[\r\n]+/g, ' ')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function cleanDescription(value) {
  return value
    .replace(/\r\n?/g, '\n')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g, '')
    .trim();
}

export function validEmail(value) {
  if (value.length > EMAIL_MAX || /[\s<>(),;:"\\]/.test(value)) return false;
  return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/.test(
    value,
  );
}

export function validWebsite(value) {
  if (value.length > WEBSITE_MAX || /[\s\u0000-\u001f\u007f]/.test(value)) return false;
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return false;
    if (url.username || url.password) return false;
    return url.hostname.includes('.') && url.hostname.length <= 253;
  } catch {
    return false;
  }
}

export function validateInquiry(input) {
  const errors = {};
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { errors: { form: 'Send a single inquiry object.' } };
  }

  const requestType = typeof input.requestType === 'string' ? input.requestType.trim() : '';
  const name = typeof input.name === 'string' ? cleanLine(input.name) : '';
  const email = typeof input.email === 'string' ? input.email.trim().toLowerCase() : '';
  const business = typeof input.business === 'string' ? cleanLine(input.business) : '';
  const website = typeof input.website === 'string' ? cleanLine(input.website) : '';
  const service = typeof input.service === 'string' ? input.service.trim() : '';
  const description = typeof input.description === 'string' ? cleanDescription(input.description) : '';

  if (!REQUEST_TYPES.has(requestType)) errors.requestType = 'Choose a Site Autopsy or a project inquiry.';

  if (!name) errors.name = 'Please tell us your name.';
  else if (name.length > NAME_MAX) errors.name = `Please keep your name under ${NAME_MAX} characters.`;

  if (!email) errors.email = 'Please enter an email address.';
  else if (!validEmail(email)) errors.email = 'Please enter a valid email address.';

  if (business.length > BUSINESS_MAX) errors.business = `Please keep the business name under ${BUSINESS_MAX} characters.`;

  if (requestType === 'autopsy' && !website) errors.website = 'Please enter the public website you would like reviewed.';
  else if (website && !validWebsite(website)) errors.website = 'Enter a public http:// or https:// address without login details.';

  if (requestType === 'project' && !SERVICES.has(service)) errors.service = 'Please choose an area we can help with.';

  if (requestType === 'project' && description.length < DESCRIPTION_MIN)
    errors.description = `Please add at least ${DESCRIPTION_MIN} characters so we have enough context.`;
  else if (description.length > DESCRIPTION_MAX)
    errors.description = `Please keep the description under ${DESCRIPTION_MAX.toLocaleString('en-US')} characters.`;

  return {
    errors,
    value: {
      requestType,
      name,
      email,
      business,
      website,
      service: requestType === 'project' ? service : '',
      description,
    },
  };
}

export function buildNotification(inquiry, id, timestamp) {
  const label = REQUEST_TYPES.get(inquiry.requestType);
  const subject = `[Turkey Vulture] ${label} — ${inquiry.name.slice(0, 80)}`;
  return {
    from: { email: FROM_EMAIL, name: 'Turkey Vulture Software' },
    to: TO_EMAIL,
    replyTo: { email: inquiry.email, name: inquiry.name },
    subject,
    text: [
      `New ${label.toLowerCase()}`,
      '',
      `Submitted: ${timestamp}`,
      `Reference: ${id}`,
      `Request type: ${label}`,
      '',
      `Name: ${inquiry.name}`,
      `Email: ${inquiry.email}`,
      `Business: ${inquiry.business || 'Not provided'}`,
      `Website: ${inquiry.website || 'Not provided'}`,
      ...(inquiry.requestType === 'project'
        ? [`Service: ${SERVICES.get(inquiry.service)}`]
        : []),
      '',
      inquiry.requestType === 'autopsy' ? 'Website review request:' : 'Project description:',
      inquiry.description || 'Not provided',
      '',
      `Reply to this message to respond directly to ${inquiry.email}.`,
      '',
    ].join('\n'),
  };
}

export async function verifyTurnstile(token, secret, remoteIp) {
  const form = new FormData();
  form.set('secret', secret);
  form.set('response', token);
  if (remoteIp) form.set('remoteip', remoteIp);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body: form,
      signal: controller.signal,
    });
    if (!response.ok) return false;
    const result = await response.json();
    return (
      result.success === true &&
      result.action === 'contact' &&
      ALLOWED_TURNSTILE_HOSTNAMES.has(result.hostname)
    );
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function readBoundedText(request) {
  if (!request.body) return { ok: true, text: '' };
  const reader = request.body.getReader();
  const decoder = new TextDecoder();
  let total = 0;
  let text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > MAX_BODY_BYTES) {
        await reader.cancel();
        return { ok: false };
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    return { ok: true, text };
  } catch {
    return { ok: false, unreadable: true };
  }
}

export async function handleContact(request, env) {
  if (request.method !== 'POST') {
    return jsonResponse({ ok: false, error: 'Method not allowed.' }, 405, { Allow: 'POST' });
  }

  const origin = request.headers.get('Origin');
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return jsonResponse({ ok: false, error: 'Request not allowed.' }, 403);
  }

  const contentType = request.headers.get('Content-Type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    return jsonResponse({ ok: false, error: 'Send the inquiry as JSON.' }, 415);
  }

  const declaredLength = Number(request.headers.get('Content-Length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: 'That message is too large. Please shorten it.' }, 413);
  }

  const body = await readBoundedText(request);
  if (!body.ok) {
    return body.unreadable
      ? jsonResponse({ ok: false, error: 'Could not read the inquiry.' }, 400)
      : jsonResponse({ ok: false, error: 'That message is too large. Please shorten it.' }, 413);
  }

  let input;
  try {
    input = JSON.parse(body.text);
  } catch {
    return jsonResponse({ ok: false, error: 'Malformed inquiry.' }, 400);
  }

  // Honeypot: a real visitor never fills this hidden field.
  if (typeof input?.fax === 'string' && input.fax.trim()) {
    return jsonResponse({ ok: false, error: 'Submission rejected.' }, 400);
  }

  const { errors, value } = validateInquiry(input);
  if (Object.keys(errors).length) {
    return jsonResponse({ ok: false, error: 'Please check the highlighted fields.', fields: errors }, 400);
  }

  if (!env.CONTACT_RATE_LIMIT) {
    return jsonResponse({ ok: false, error: 'The request form is temporarily unavailable.' }, 503);
  }
  const clientIp = request.headers.get('CF-Connecting-IP') || 'unknown';
  try {
    const { success: withinLimit } = await env.CONTACT_RATE_LIMIT.limit({ key: `contact:${clientIp}` });
    if (!withinLimit) {
      return jsonResponse(
        {
          ok: false,
          error: `Too many attempts. Please wait a minute or email us directly at ${FROM_EMAIL}.`,
        },
        429,
      );
    }
  } catch {
    return jsonResponse({ ok: false, error: 'The request form is temporarily unavailable.' }, 503);
  }

  const token = typeof input.turnstileToken === 'string' ? input.turnstileToken.trim() : '';
  if (!token || token.length > 2048) {
    return jsonResponse(
      { ok: false, error: `Please complete the verification, or email us directly at ${FROM_EMAIL}.` },
      403,
    );
  }
  if (!env.TURNSTILE_SECRET) {
    return jsonResponse({ ok: false, error: 'The request form is temporarily unavailable.' }, 503);
  }
  if (!(await verifyTurnstile(token, env.TURNSTILE_SECRET, clientIp))) {
    return jsonResponse(
      { ok: false, error: `Verification failed. Please try again, or email us directly at ${FROM_EMAIL}.` },
      403,
    );
  }

  const id = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  const message = buildNotification(value, id, timestamp);

  try {
    if (!env.SEND_EMAIL) throw new Error('SEND_EMAIL binding is missing');
    await env.SEND_EMAIL.send(message);
  } catch (error) {
    // Log only the request ID and provider code, never inquiry content.
    console.error('contact_send_failed', {
      id,
      code: error && error.code ? String(error.code) : 'unknown',
    });
    return jsonResponse(
      {
        ok: false,
        error: `We couldn’t send your request right now. Please try again, or email us directly at ${FROM_EMAIL}.`,
      },
      502,
    );
  }

  console.log('contact_accepted', { id });
  return jsonResponse({ ok: true, id });
}

export function secure(response, url) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  // Keep the delivered HTML intact: Cloudflare's auto-injected analytics is out of scope.
  if ((headers.get('Content-Type') || '').includes('text/html')) {
    headers.set('Cache-Control', `${headers.get('Cache-Control') || 'public, max-age=0, must-revalidate'}, no-transform`);
  }
  if (url.pathname === '/version.json') headers.set('Cache-Control', 'no-store');
  if (url.hostname.endsWith('.workers.dev')) headers.set('X-Robots-Tag', 'noindex');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${APEX}` || (url.hostname === APEX && url.protocol === 'http:')) {
      url.hostname = APEX;
      url.protocol = 'https:';
      url.port = '';
      return secure(Response.redirect(url.toString(), 308), url);
    }
    if (url.pathname === CONTACT_PATH) {
      return secure(await handleContact(request, env), url);
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return secure(new Response('This site accepts inquiries only through the contact form. Please use the email options on /contact.', {
        status: 405, headers: { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      }), url);
    }
    return secure(await env.ASSETS.fetch(request), url);
  },
};
