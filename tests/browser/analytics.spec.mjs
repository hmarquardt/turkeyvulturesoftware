import { test, expect } from '@playwright/test';

const SITE_ID = 'as_5wh58kbCgGxaRewfGznoaC';
const ENDPOINT = 'https://analytics.aismallbizguru.com/collect';
const SESSION_KEY = 'turkeyvulture.analytics.session';
const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'Content-Type',
};
const paths = ['/', '/how-we-build', '/site-autopsy', '/contact', '/privacy', '/not-a-real-page'];
const pageviews = (posts, path) => posts.filter(post => post.kind === 'pageview' && post.path === path);
const named = (posts, name) => posts.filter(post => post.kind === 'event' && post.name === name);

async function installAnalytics(page, { dnt = false, gpc = false, fail = false } = {}) {
  const posts = [];
  await page.route(ENDPOINT, async route => {
    const request = route.request();
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS });
    try {
      posts.push(request.postDataJSON());
    } catch {
      posts.push({ unparsed: request.postData() });
    }
    if (fail) return route.abort('failed');
    await route.fulfill({ status: 204, headers: CORS });
  });
  await page.addInitScript(() => { window.__TV_ANALYTICS_TEST__ = true; });
  if (dnt) await page.addInitScript(() => {
    Object.defineProperty(navigator, 'doNotTrack', { configurable: true, get: () => '1' });
  });
  if (gpc) await page.addInitScript(() => {
    Object.defineProperty(navigator, 'globalPrivacyControl', { configurable: true, get: () => true });
  });
  return posts;
}

async function stubTurnstile(page) {
  await page.addInitScript(() => {
    window.turnstile = {
      render: (_element, options) => {
        setTimeout(() => options.callback('test-turnstile-token'), 0);
        return 'test-widget';
      },
      getResponse: () => 'test-turnstile-token',
      reset: () => {},
    };
  });
}

async function fillProject(page) {
  await page.getByLabel('Your name').fill('Analytics Leak Canary');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('canary@example.net');
  await page.getByLabel('Business name').fill('Canary Business');
  await page.getByLabel('What do you have in mind?').selectOption('automation');
  await page.getByLabel('Tell us a little').fill('Do not send this description to analytics.');
  await page.getByLabel('Website URL').fill('https://canary.example/path?secret=form');
}

test('every public page sends exactly one pageview for the registered Site', async ({ page }) => {
  const posts = await installAnalytics(page);
  for (const path of paths) {
    const response = await page.goto(path);
    expect(response.status()).toBe(path === '/not-a-real-page' ? 404 : 200);
    await expect.poll(() => pageviews(posts, path).length).toBe(1);
    await page.waitForTimeout(120);
    expect(pageviews(posts, path)).toHaveLength(1);
  }
  expect(posts.filter(post => post.kind === 'pageview')).toHaveLength(paths.length);
  for (const post of posts) {
    expect(post.site).toBe(SITE_ID);
    expect(post.path.startsWith('/')).toBe(true);
    expect(post.path).not.toContain('?');
    expect(post.session).toMatch(/^s_[a-f0-9]{32}$/);
    expect(post.event_uid).toMatch(/^e_[a-f0-9]{32}$/);
  }
});

test('analytics stays disabled on local development without an explicit test flag', async ({ page }) => {
  const posts = [];
  await page.route(ENDPOINT, async route => {
    posts.push(route.request().postDataJSON());
    await route.fulfill({ status: 204, headers: CORS });
  });
  await page.goto('/');
  await page.waitForTimeout(300);
  expect(posts).toHaveLength(0);
  expect(await page.evaluate(key => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
});

test('acquisition keeps supported UTMs but never the arbitrary query string', async ({ page }) => {
  const posts = await installAnalytics(page);
  await page.goto('/?utm_source=newsletter&utm_medium=email&utm_campaign=fall&utm_content=card&utm_term=rescue&secret=ignore');
  await expect.poll(() => pageviews(posts, '/').length).toBe(1);
  const [post] = pageviews(posts, '/');
  expect(post.utm).toEqual({
    source: 'newsletter',
    medium: 'email',
    campaign: 'fall',
    content: 'card',
    term: 'rescue',
  });
  expect(JSON.stringify(post)).not.toContain('ignore');
  expect(post).not.toHaveProperty('props');
});

for (const [label, option] of [['Do Not Track', 'dnt'], ['Global Privacy Control', 'gpc']]) {
  test(`${label} suppresses every analytics request`, async ({ page }) => {
    const posts = await installAnalytics(page, { [option]: true });
    await page.goto('/');
    await page.getByRole('link', { name: /Let’s talk/ }).click();
    await expect(page).toHaveURL(/\/contact$/);
    await page.waitForTimeout(300);
    expect(posts).toHaveLength(0);
    expect(await page.evaluate(key => sessionStorage.getItem(key), SESSION_KEY)).toBeNull();
  });
}

test('the anonymous session is temporary and rotates after 30 minutes of inactivity', async ({ page }) => {
  const posts = await installAnalytics(page);
  await page.goto('/');
  await expect.poll(() => pageviews(posts, '/').length).toBe(1);
  const first = pageviews(posts, '/')[0];

  await page.reload();
  await expect.poll(() => pageviews(posts, '/').length).toBe(2);
  expect(pageviews(posts, '/')[1].session).toBe(first.session);
  const storage = await page.evaluate(key => ({
    cookie: document.cookie,
    local: Object.keys(localStorage),
    session: Object.keys(sessionStorage),
    value: sessionStorage.getItem(key),
  }), SESSION_KEY);
  expect(storage.cookie).toBe('');
  expect(storage.local).toEqual([]);
  expect(storage.session).toEqual([SESSION_KEY]);
  expect(JSON.parse(storage.value).id).toBe(first.session);

  await page.evaluate(key => {
    const value = JSON.parse(sessionStorage.getItem(key));
    value.at = Date.now() - 31 * 60 * 1000;
    sessionStorage.setItem(key, JSON.stringify(value));
  }, SESSION_KEY);
  await page.reload();
  await expect.poll(() => pageviews(posts, '/').length).toBe(3);
  expect(pageviews(posts, '/')[2].session).not.toBe(first.session);
  expect(pageviews(posts, '/')[2].session).toMatch(/^s_[a-f0-9]{32}$/);
});

test('delegated CTA tracking uses only approved destinations and placements without blocking navigation', async ({ page }) => {
  const posts = await installAnalytics(page);
  const cta = () => named(posts, 'contact_cta_click');

  await page.goto('/');
  await page.getByRole('link', { name: 'Request a Site Autopsy' }).first().click();
  await expect(page).toHaveURL(/\/site-autopsy$/);
  await expect.poll(() => cta().length).toBe(1);
  expect(cta()[0].props).toEqual({ destination: 'autopsy', placement: 'hero' });

  await page.goto('/');
  await page.getByRole('link', { name: /Discuss a Project/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(2);
  expect(cta()[1].props).toEqual({ destination: 'project', placement: 'hero' });

  await page.goto('/');
  await page.getByRole('navigation').getByRole('link', { name: /Let’s talk/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(3);
  expect(cta()[2].props).toEqual({ destination: 'project', placement: 'navigation' });

  await page.goto('/');
  await page.getByRole('link', { name: /Build something that fits/ }).click();
  await expect(page).toHaveURL(/\/contact\?service=software$/);
  await expect.poll(() => cta().length).toBe(4);
  expect(cta()[3].props).toEqual({ destination: 'project', placement: 'services' });

  await page.goto('/');
  await page.getByRole('link', { name: /Let’s discuss your project/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(5);
  expect(cta()[4].props).toEqual({ destination: 'project', placement: 'autopsy-band' });

  await page.goto('/how-we-build');
  await page.getByRole('link', { name: /Let’s Build Something/ }).first().click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(6);
  expect(cta()[5].props).toEqual({ destination: 'project', placement: 'how-we-build' });

  await page.goto('/');
  await page.getByRole('contentinfo').getByRole('link', { name: 'Contact', exact: true }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(7);
  expect(cta()[6].props).toEqual({ destination: 'project', placement: 'footer' });

  await page.goto('/');
  await page.getByRole('contentinfo').locator('a[href^="mailto:"]').evaluate(anchor => anchor.click());
  await expect.poll(() => cta().length).toBe(8);
  expect(cta()[7].props).toEqual({ destination: 'email', placement: 'footer' });

  await page.goto('/privacy');
  await page.getByRole('link', { name: /Start a conversation/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await expect.poll(() => cta().length).toBe(9);
  expect(cta()[8].props).toEqual({ destination: 'project', placement: 'page' });
  for (const post of cta()) expect(Object.keys(post.props).sort()).toEqual(['destination', 'placement']);
});

async function acceptInquiry(page, id = '11111111-2222-4333-8444-555555555555') {
  await page.route('**/api/contact', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ ok: true, id }),
  }));
}

test('an accepted project inquiry is counted once with only kind and category', async ({ page }) => {
  const posts = await installAnalytics(page);
  await stubTurnstile(page);
  await acceptInquiry(page);
  await page.goto('/contact?service=automation&secret=ignore');
  await fillProject(page);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is on its way.' })).toBeFocused();
  await expect.poll(() => named(posts, 'intake_submit').length).toBe(1);
  await page.waitForTimeout(250);
  const [event] = named(posts, 'intake_submit');
  expect(named(posts, 'intake_submit')).toHaveLength(1);
  expect(event.props).toEqual({ kind: 'project', category: 'automation' });
  expect(Object.keys(event.props).sort()).toEqual(['category', 'kind']);

  const serialized = JSON.stringify(posts);
  for (const value of [
    'Analytics Leak Canary',
    'canary@example.net',
    'Canary Business',
    'Do not send this description to analytics.',
    'https://canary.example/path?secret=form',
    'test-turnstile-token',
    '11111111-2222-4333-8444-555555555555',
  ]) expect(serialized).not.toContain(value);
  expect(pageviews(posts, '/contact')).toHaveLength(1);
  expect(JSON.stringify(pageviews(posts, '/contact')[0])).not.toContain('ignore');
});

test('an accepted autopsy request records only its kind', async ({ page }) => {
  const posts = await installAnalytics(page);
  await stubTurnstile(page);
  await acceptInquiry(page, 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
  await page.goto('/site-autopsy');
  await page.getByLabel('Your name').fill('Autopsy Canary');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('autopsy@example.net');
  await page.getByLabel('Website URL').fill('https://canary.example/review?private=ignore');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is on its way.' })).toBeFocused();
  await expect.poll(() => named(posts, 'intake_submit').length).toBe(1);
  await page.waitForTimeout(200);
  const [event] = named(posts, 'intake_submit');
  expect(named(posts, 'intake_submit')).toHaveLength(1);
  expect(event.props).toEqual({ kind: 'autopsy' });
  expect(JSON.stringify(posts)).not.toContain('Autopsy Canary');
  expect(JSON.stringify(posts)).not.toContain('canary.example');
  expect(JSON.stringify(posts)).not.toContain('aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee');
});

for (const status of [400, 403, 429, 502]) {
  test(`a ${status} response is never counted as an accepted submission`, async ({ page }) => {
    const posts = await installAnalytics(page);
    await stubTurnstile(page);
    await page.route('**/api/contact', route => route.fulfill({
      status,
      contentType: 'application/json',
      body: JSON.stringify({ ok: false, error: 'Not accepted.' }),
    }));
    await page.goto('/contact');
    await fillProject(page);
    await page.getByRole('button', { name: 'Send request' }).click();
    await expect(page.locator('#form-status')).toContainText('Not accepted');
    await page.waitForTimeout(250);
    expect(named(posts, 'intake_submit')).toHaveLength(0);
  });
}

test('client-side validation failures never reach the endpoint or analytics', async ({ page }) => {
  const posts = await installAnalytics(page);
  await stubTurnstile(page);
  let calls = 0;
  await page.route('**/api/contact', route => {
    calls += 1;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'unexpected' }) });
  });
  await page.goto('/contact');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.locator('#name-error')).toBeVisible();
  await page.waitForTimeout(200);
  expect(calls).toBe(0);
  expect(named(posts, 'intake_submit')).toHaveLength(0);
});

test('collector failures are silent and never interrupt navigation or an accepted submission', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const posts = await installAnalytics(page, { fail: true });
  await stubTurnstile(page);
  await acceptInquiry(page);
  await page.goto('/');
  await page.getByRole('link', { name: /Discuss a Project/ }).click();
  await expect(page).toHaveURL(/\/contact$/);
  await fillProject(page);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is on its way.' })).toBeFocused();
  await expect.poll(() => named(posts, 'intake_submit').length).toBe(1);
  await page.waitForTimeout(250);
  expect(named(posts, 'intake_submit')).toHaveLength(1);
  expect(errors).toEqual([]);
});
