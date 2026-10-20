import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
const paths = ['/', '/site-autopsy', '/contact', '/privacy', '/not-a-real-page'];
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
      if (['/', '/site-autopsy'].includes(path) && [390, 1440].includes(width)) await page.screenshot({ path: `test-results/${path === '/' ? 'home' : 'autopsy'}-${width}.png`, fullPage: true });
    });
  }
}
test('mobile menu works with keyboard and Escape; anchor CTA reaches services', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  const menu = page.getByRole('button', { name: 'Menu' });
  await menu.focus(); await page.keyboard.press('Enter');
  await expect(menu).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('Escape');
  await expect(menu).toHaveAttribute('aria-expanded', 'false');
  await expect(menu).toBeFocused();
  await menu.click(); await page.getByRole('link', { name: 'What we do' }).click();
  await expect(page).toHaveURL(/#services$/);
});
test('site autopsy prepares a draft and does not submit any request', async ({ page }) => {
  const writes = [];
  page.on('request', r => { if (r.method() !== 'GET') writes.push(r.url()); });
  await page.goto('/site-autopsy');
  await page.getByLabel('Your name').fill('Alex & Company');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('alex@example.com');
  await page.getByLabel('Website URL').fill('https://example.com');
  await page.getByRole('button', { name: 'Prepare email' }).click();
  await expect(page.getByRole('heading', { name: 'Your email is ready to review.' })).toBeFocused();
  await expect(page.locator('#message-preview')).toHaveValue(/human review/);
  const link = new URL(await page.getByRole('link', { name: 'Open email app' }).getAttribute('href'));
  expect(link.pathname).toBe('hmarquardt@gmail.com');
  expect(link.searchParams.get('body')).toContain('Alex & Company');
  await page.getByRole('button', { name: 'Copy message' }).click();
  await expect(page.locator('#form-status')).toContainText(/copied|Select and copy/);
  await page.getByLabel('Your name').fill('Revised name');
  await expect(page.locator('#email-preview')).toBeHidden();
  expect(writes).toEqual([]);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
test('project service is selected from a safe query value; URL validation prevents unsafe drafts', async ({ page }) => {
  await page.goto('/contact?service=automation');
  await expect(page.getByLabel('What do you have in mind?')).toHaveValue('automation');
  await page.getByLabel('Your name').fill('Alex');
  await page.getByRole('textbox', { name: 'Your email (required)', exact: true }).fill('alex@example.com');
  await page.getByLabel('Tell us a little').fill('An invoicing workflow needs connecting.');
  await page.getByLabel('Website URL').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Prepare email' }).click();
  await expect(page.locator('#email-preview')).toBeHidden();
  await page.getByLabel('Website URL').fill('');
  await page.getByRole('button', { name: 'Prepare email' }).click();
  await expect(page.locator('#message-preview')).toHaveValue(/AI & business automation/);
});
test('no-JavaScript visitors retain navigation and direct contact', async ({ browser, baseURL }) => {
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(`${baseURL}/site-autopsy`);
  await expect(page.getByRole('link', { name: 'What we do' })).toBeVisible();
  await expect(page.locator('.noscript-note')).toContainText('hmarquardt@gmail.com');
  await expect(page.getByRole('button', { name: 'Prepare email' })).toBeDisabled();
  await context.close();
});
test('metadata, sitemap, security headers, 404 and reduced motion', async ({ page }) => {
  const response = await page.goto('/');
  const headers = await response.allHeaders();
  expect(headers['content-security-policy']).toContain("frame-ancestors 'none'");
  expect(headers['cache-control']).toContain('no-transform');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://turkeyvulturesoftware.com/');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  const endpoints = await page.evaluate(async () => ({
    sitemap: (await fetch('/sitemap.xml')).status,
    robots: await (await fetch('/robots.txt')).text(),
    submission: (await fetch('/api/inquiries', { method: 'POST', body: '{}' })).status,
  }));
  expect(endpoints.sitemap).toBe(200);
  expect(endpoints.robots).toContain('Sitemap: https://turkeyvulturesoftware.com');
  expect(endpoints.submission).toBe(405);
});
