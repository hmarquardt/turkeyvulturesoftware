import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const paths = ['/', '/how-we-build', '/site-autopsy', '/contact', '/privacy', '/not-a-real-page'];
const screenshotNames = { '/': 'home', '/site-autopsy': 'autopsy', '/how-we-build': 'how-we-build' };
const screenshotWidths = path => path === '/how-we-build' ? [320, 390, 768, 1440] : [390, 1440];
for (const width of [320, 390, 768, 1440]) {
  for (const path of paths) {
    test(`${path} renders accessibly at ${width}px without overflow or external assets`, async ({ page, baseURL }) => {
      await page.setViewportSize({ width, height: 900 });
      const failures = [], external = [], errors = [];
      page.on('pageerror', e => errors.push(e.message));
      page.on('response', r => { if (r.status() >= 400 && r.url() !== `${baseURL}${path}`) failures.push(r.url()); });
      page.on('request', r => { if (new URL(r.url()).origin !== new URL(baseURL).origin) external.push(r.url()); });
      const response = await page.goto(path);
      expect(response.status()).toBe(path === '/not-a-real-page' ? 404 : 200);
      await expect(page.locator('h1')).toHaveCount(1);
      const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
      expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
      for (const img of await page.locator('img').all()) expect(await img.evaluate(i => i.complete && i.naturalWidth > 0)).toBeTruthy();
      const a11y = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      expect(a11y.violations).toEqual([]);
      expect(failures).toEqual([]); expect(external).toEqual([]); expect(errors).toEqual([]);
      if (screenshotNames[path] && screenshotWidths(path).includes(width)) await page.screenshot({ path: `test-results/${screenshotNames[path]}-${width}.png`, fullPage: true });
    });
  }
}

test('how we build is discoverable, canonical, and routes to contact', async ({ page }) => {
  await page.goto('/how-we-build');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://turkeyvulturesoftware.com/how-we-build');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Your software.');
  await expect(page.getByRole('heading', { name: /A short stack/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'How we build', exact: true })).toHaveAttribute('aria-current', 'page');
  await expect(page.getByRole('link', { name: 'Let’s Build Something' }).first()).toHaveAttribute('href', '/contact');
  const sitemap = await (await page.request.get('/sitemap.xml')).text();
  expect(sitemap).toContain('<loc>https://turkeyvulturesoftware.com/how-we-build</loc>');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'How we build', exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: /How we build — and why you keep the keys/ })).toHaveAttribute('href', '/how-we-build');
});

test('mobile menu works with keyboard and Escape; anchor CTA reaches services', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByRole('link', { name: 'How we build', exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await menu.click(); await page.getByRole('link', { name: 'What we do' }).click();
  await expect(page).toHaveURL(/#services$/);
});

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

async function fillAutopsy(page) {
  await page.getByLabel('Your name').fill('Alex & Company');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('alex@example.com');
  await page.getByLabel('Website URL').fill('https://example.com');
}

test('mobile navigation remains usable at 320px', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 700 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Menu' }).click();
  await expect(page.getByRole('link', { name: 'How we build', exact: true })).toBeVisible();
  const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, viewport: innerWidth }));
  expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.viewport);
});

test('site autopsy submits to the protected endpoint and shows success only after acceptance', async ({ page }) => {
  await stubTurnstile(page);
  let body;
  await page.route('**/api/contact', async route => {
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: '11111111-2222-4333-8444-555555555555' }) });
  });
  await page.goto('/site-autopsy');
  await fillAutopsy(page);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is on its way.' })).toBeFocused();
  await expect(page.locator('#reference-id')).toHaveText('11111111-2222-4333-8444-555555555555');
  await expect(page.locator('#intake-form')).toBeHidden();
  await expect(page.locator('#email-preview')).toHaveCount(0);
  expect(body.requestType).toBe('autopsy');
  expect(body.name).toBe('Alex & Company');
  expect(body.email).toBe('alex@example.com');
  expect(body.website).toBe('https://example.com');
  expect(body.service).toBe('');
  expect(body.turnstileToken).toBe('test-turnstile-token');
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test('project service is selected from a safe query value; URL validation blocks and valid input submits', async ({ page }) => {
  await stubTurnstile(page);
  let calls = 0, body;
  await page.route('**/api/contact', async route => {
    calls += 1;
    body = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, id: 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee' }) });
  });
  await page.goto('/contact?service=automation');
  await expect(page.getByLabel('What do you have in mind?')).toHaveValue('automation');
  await page.getByLabel('Your name').fill('Alex');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('alex@example.com');
  await page.getByLabel('Tell us a little').fill('An invoicing workflow needs connecting.');
  await page.getByLabel('Website URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.locator('#url-error')).toContainText('http:// or https://');
  expect(calls).toBe(0);
  await page.getByLabel('Website URL').fill('');
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.getByRole('heading', { name: 'Your request is on its way.' })).toBeFocused();
  expect(calls).toBe(1);
  expect(body.requestType).toBe('project');
  expect(body.service).toBe('automation');
  expect(body.website).toBe('');
});

test('a rejected submission keeps the visitor input and offers a direct email fallback', async ({ page }) => {
  await stubTurnstile(page);
  await page.route('**/api/contact', route => route.fulfill({
    status: 502,
    contentType: 'application/json',
    body: JSON.stringify({ ok: false, error: 'We couldn’t send your request right now. Please try again, or email us directly at contact@turkeyvulturesoftware.com.' }),
  }));
  await page.goto('/site-autopsy');
  await fillAutopsy(page);
  await page.getByRole('button', { name: 'Send request' }).click();
  await expect(page.locator('#form-status')).toContainText('couldn’t send');
  await expect(page.locator('#form-status')).toContainText('contact@turkeyvulturesoftware.com');
  await expect(page.locator('#intake-form')).toBeVisible();
  await expect(page.getByLabel('Your name')).toHaveValue('Alex & Company');
  await expect(page.getByRole('button', { name: 'Send request' })).toBeEnabled();
  await expect(page.locator('#intake-success')).toBeHidden();
});

test('no-JavaScript visitors retain navigation and direct contact', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/site-autopsy`);
  await expect(page.getByRole('link', { name: 'What we do' })).toBeVisible();
  await expect(page.locator('.noscript-note')).toContainText('contact@turkeyvulturesoftware.com');
  await expect(page.getByRole('button', { name: 'Send request' })).toBeEnabled();
  await expect(page.locator('.noscript-note a')).toHaveAttribute('href', 'mailto:contact@turkeyvulturesoftware.com');
  await context.close();
});

test('metadata, sitemap, security headers, 404 and reduced motion', async ({ page }) => {
  const response = await page.goto('/');
  const headers = await response.allHeaders();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['content-security-policy']).toContain('https://challenges.cloudflare.com');
  expect(headers['cache-control']).toContain('no-transform');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://turkeyvulturesoftware.com/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  const endpoints = await page.evaluate(async () => ({
    sitemap: (await fetch('/sitemap.xml')).status,
    robots: await (await fetch('/robots.txt')).text(),
    submission: (await fetch('/api/inquiries', { method: 'POST', body: '{}' })).status,
    contactGet: (await fetch('/api/contact')).status,
  }));
  expect(endpoints.sitemap).toBe(200);
  expect(endpoints.robots).toContain('Sitemap: https://turkeyvulturesoftware.com');
  expect(endpoints.submission).toBe(405);
  expect(endpoints.contactGet).toBe(405);
});
