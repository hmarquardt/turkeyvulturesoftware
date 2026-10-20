import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { HtmlValidate } from 'html-validate';
import { pages, layout, origin, contactEmail, hankEmail, turnstileSiteKey } from '../src/pages.mjs';
const validator = new HtmlValidate({ extends: ['html-validate:recommended'], rules: { 'no-trailing-whitespace': 'off', 'long-title': 'off', 'svg-focusable': 'off' } });
const analytics = await readFile('public/assets/analytics.js', 'utf8');
for (const page of pages) {
  const html = layout(page);
  const report = await validator.validateString(html);
  assert.ok(report.valid, `${page.path}: ${JSON.stringify(report.results.flatMap(r => r.messages))}`);
  for (const match of html.matchAll(/(?:href|src)="(\/[^"]*)"/g)) {
    const url = new URL(match[1], origin);
    if (url.pathname.startsWith('/assets/')) await readFile(`public${url.pathname}`);
    else assert.ok(pages.some(p => p.path === url.pathname), `Broken link: ${match[1]}`);
  }
}
assert.equal(contactEmail, 'contact@turkeyvulturesoftware.com');
assert.equal(hankEmail, 'hank@turkeyvulturesoftware.com');
assert.match(turnstileSiteKey, /^0x[0-9A-Za-z_-]{20,}$/);
const config = JSON.parse(await readFile('wrangler.json', 'utf8'));
assert.equal(config.name, 'turkey-vulture-software');
assert.equal(config.account_id, 'b1aa310aa0a1638d72b8b086a21e557c');
assert.equal(config.assets.directory, './dist');
assert.equal(config.assets.run_worker_first, true);
for (const route of config.routes || []) {
  assert.ok(['turkeyvulturesoftware.com', 'www.turkeyvulturesoftware.com'].includes(route.pattern));
  assert.equal(route.custom_domain, true);
}
assert.ok(!config.d1_databases && !config.kv_namespaces);
assert.deepEqual(config.send_email, [{
  name: 'SEND_EMAIL',
  destination_address: 'hmarquardt@gmail.com',
  allowed_sender_addresses: ['contact@turkeyvulturesoftware.com'],
}]);
assert.deepEqual(config.ratelimits, [{
  name: 'CONTACT_RATE_LIMIT',
  namespace_id: '4302',
  simple: { limit: 5, period: 60 },
}]);
const required = ['README.md', 'AGENTS.md', 'docs/BRAND.md', 'docs/ARCHITECTURE.md', 'docs/DEPLOYMENT.md', 'docs/ROADMAP.md', 'docs/ASSETS.md', '.gitignore'];
for (const file of required) assert.ok((await readFile(file, 'utf8')).trim().length > 100, `Missing documentation: ${file}`);
for (const name of await readdir('public')) assert.ok(!name.startsWith('.') && !/secret|credential|\.env/.test(name));
for (const page of pages) assert.match(layout(page), /<script src="\/assets\/analytics\.js" defer><\/script>/, `${page.path} must load the analytics client`);
assert.match(analytics, /var SITE_ID = 'as_5wh58kbCgGxaRewfGznoaC';/);
assert.match(analytics, /var ENDPOINT = 'https:\/\/analytics\.aismallbizguru\.com\/collect';/);
assert.match(analytics, /ALLOWED_HOSTS = \['turkeyvulturesoftware\.com', 'www\.turkeyvulturesoftware\.com'\]/);
assert.match(analytics, /'contact_cta_click'/);
assert.match(analytics, /'intake_submit'/);
assert.match(analytics, /'pageview'/);
assert.doesNotMatch(analytics, /localStorage|document\.cookie|sendBeacon/, 'Analytics must keep its session in sessionStorage only');
assert.doesNotMatch(analytics, /getElementById|querySelector|FormData/, 'Analytics must never read page or form values');
assert.doesNotMatch(analytics, /google-analytics|googletagmanager|facebook\.net|doubleclick/i);
console.log('HTML, links, assets, documentation and deployment target checks passed.');
