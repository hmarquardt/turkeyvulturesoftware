import assert from 'node:assert/strict';
import sharp from 'sharp';
import { origin } from '../src/pages.mjs';

export const crawlerAgents = {
  ordinary: 'Mozilla/5.0',
  X: 'Twitterbot/1.0',
  Facebook: 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
  LinkedIn: 'LinkedInBot/1.0',
};
const blocked = /\b(?:noindex|noimageindex|none)\b/i;
const mimeTypes = { jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };
const attributes = tag => Object.fromEntries([...tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gs)].map(m => [m[1].toLowerCase(), m[3]]));

// Inspect only initial HTML head markup; scripts and comments cannot satisfy the contract.
export function validateSocialHtml(html, canonical) {
  const head = html.replace(/<!--[\s\S]*?-->|<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, '').match(/<head\b[^>]*>([\s\S]*?)<\/head\s*>/i)?.[1];
  assert.ok(head, 'Initial HTML must contain a head');
  const tags = [...head.matchAll(/<(?:meta|link)\b[^>]*>/gi)].map(m => attributes(m[0]));
  const one = (key, value, attr = 'content') => {
    const matches = tags.filter(t => t[key] === value);
    assert.equal(matches.length, 1, `Expected exactly one ${value}`);
    assert.ok(matches[0][attr]?.trim(), `${value} must be nonempty`);
    return matches[0][attr];
  };
  const titles = [...head.matchAll(/<title\b[^>]*>(.*?)<\/title>/gis)];
  assert.equal(titles.length, 1, 'Expected one HTML title');
  assert.ok(titles[0][1].trim(), 'Title must be nonempty');
  assert.equal(one('rel', 'canonical', 'href'), canonical, 'Canonical URL must match the public page');
  assert.equal(one('property', 'og:url'), canonical, 'Open Graph and canonical URLs must agree');
  assert.equal(one('property', 'og:type'), 'website');
  assert.equal(one('property', 'og:site_name'), 'Turkey Vulture Software');
  assert.equal(one('property', 'og:title'), titles[0][1]);
  assert.equal(one('name', 'twitter:title'), titles[0][1]);
  assert.equal(one('property', 'og:description'), one('name', 'description'));
  assert.equal(one('name', 'twitter:description'), one('name', 'description'));
  assert.equal(one('name', 'twitter:card'), 'summary_large_image');
  const image = one('property', 'og:image');
  const url = new URL(image);
  assert.equal(url.origin, origin, 'Image must use the absolute production HTTPS origin');
  assert.ok(!url.username && !url.password && !url.hash, 'Image must be public and have no fragment');
  assert.match(url.pathname, /\.(?:jpe?g|png|webp)$/i, 'Image must be a supported raster asset');
  assert.equal(one('name', 'twitter:image'), image);
  assert.equal(one('property', 'og:image:width'), '1200');
  assert.equal(one('property', 'og:image:height'), '630');
  assert.equal(one('name', 'twitter:image:alt'), one('property', 'og:image:alt'));
  const type = one('property', 'og:image:type');
  assert.ok(Object.values(mimeTypes).includes(type), 'Supported image MIME type required');
  for (const tag of tags.filter(t => /^(robots|twitterbot|facebookexternalhit|linkedinbot)$/i.test(t.name || ''))) {
    assert.doesNotMatch(tag.content || '', blocked, 'Page must allow social indexing');
  }
  return { image, type };
}

export async function validateSocialImage(bytes, type) {
  assert.ok(bytes.length > 0 && bytes.length < 5 * 1024 * 1024, 'Social image must be nonempty and under 5 MB');
  const image = sharp(bytes, { failOn: 'warning' });
  const info = await image.metadata();
  assert.ok(mimeTypes[info.format], 'Supported raster image required');
  assert.equal(type.split(';')[0].trim(), mimeTypes[info.format], 'Content-Type must match actual raster bytes');
  assert.equal(info.width, 1200, 'Social image width');
  assert.equal(info.height, 630, 'Social image height');
  // Decode all pixels, not just a potentially valid header on a truncated file.
  await image.raw().toBuffer();
}

export function validateCrawlerResponse(response, type) {
  assert.equal(response.status, 200, 'Crawler resource must return 200 without a redirect');
  assert.equal(response.headers.get('content-type')?.split(';')[0], type, 'Crawler Content-Type');
  assert.doesNotMatch(response.headers.get('x-robots-tag') || '', blocked, 'Headers must allow social indexing');
  assert.notEqual(response.headers.get('cf-mitigated'), 'challenge', 'Crawler must not receive a security challenge');
}

// Longest matching robots rule wins; specific agent groups override the wildcard group.
export function validateRobots(text, userAgent, paths) {
  const groups = [];
  let group;
  for (const line of text.split(/\r?\n/)) {
    const match = line.replace(/#.*$/, '').trim().match(/^([\w-]+)\s*:\s*(.*)$/);
    if (!match) continue;
    const [, rawKey, value] = match, key = rawKey.toLowerCase();
    if (key === 'user-agent') {
      if (!group || group.hasRules) groups.push(group = { agents: [], rules: [] });
      group.agents.push(value.toLowerCase());
    } else if (group && ['allow', 'disallow'].includes(key)) {
      group.hasRules = true;
      if (value) group.rules.push({ allow: key === 'allow', path: value });
    }
  }
  const score = g => Math.max(-1, ...g.agents.map(a => a === '*' ? 0 : userAgent.toLowerCase().includes(a) ? a.length : -1));
  const best = Math.max(-1, ...groups.map(score));
  const rules = best < 0 ? [] : groups.filter(g => score(g) === best).flatMap(g => g.rules);
  for (const path of paths) {
    const matches = rules.filter(r => {
      const end = r.path.endsWith('$');
      const pattern = (end ? r.path.slice(0, -1) : r.path).replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
      return new RegExp(`^${pattern}${end ? '$' : ''}`).test(path);
    }).sort((a, b) => b.path.length - a.path.length || Number(b.allow) - Number(a.allow));
    assert.ok(!matches.length || matches[0].allow, `robots.txt blocks ${userAgent} at ${path}`);
  }
}

export async function verifySocialPreview(site = origin, { fetcher = fetch } = {}) {
  assert.equal(site, origin, 'Social smoke test must check the actual production origin');
  for (const [name, agent] of Object.entries(crawlerAgents)) {
    const get = url => fetcher(url, { redirect: 'manual', headers: { 'User-Agent': agent }, signal: AbortSignal.timeout(20000) });
    const page = await get(`${site}/`);
    validateCrawlerResponse(page, 'text/html');
    const { image, type } = validateSocialHtml(await page.text(), `${origin}/`);
    const raster = await get(image);
    validateCrawlerResponse(raster, type);
    await validateSocialImage(Buffer.from(await raster.arrayBuffer()), type);
    const robots = await get(`${site}/robots.txt`);
    validateCrawlerResponse(robots, 'text/plain');
    validateRobots(await robots.text(), agent, ['/', new URL(image).pathname]);
    console.log(`Social preview HTTP checks passed: ${name}, ${image} (1200 × 630).`);
  }
  const query = await fetcher(`${site}/?preview=social-check`, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
  validateCrawlerResponse(query, 'text/html');
  validateSocialHtml(await query.text(), `${origin}/`);
  for (const from of ['http://turkeyvulturesoftware.com/', 'https://www.turkeyvulturesoftware.com/']) {
    const response = await fetcher(from, { redirect: 'manual', signal: AbortSignal.timeout(20000) });
    assert.equal(response.status, 308, `${from} canonical redirect`);
    assert.equal(response.headers.get('location'), `${origin}/`);
    await response.body?.cancel();
  }
}
