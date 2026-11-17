import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sharp from 'sharp';
import { pages, layout, origin, socialImage } from '../src/pages.mjs';
import { validateSocialHtml, validateSocialImage, validateCrawlerResponse, validateRobots, verifySocialPreview, crawlerAgents } from '../scripts/social-preview.mjs';

const canonical = `${origin}/`;
const html = layout(pages.find(p => p.path === '/'));
const jpg = await readFile(`public${socialImage}`);

test('incomplete, duplicated, contradictory or client-rendered metadata fails the release contract', () => {
  assert.doesNotThrow(() => validateSocialHtml(html, canonical));
  for (const broken of [
    html.replace(/<meta name="twitter:image"[^>]*>/, ''),
    html.replace(/(<meta property="og:image"[^>]*>)/, '$1$1'),
    html.replace(/(<meta name="twitter:description" content=")[^"]+/, '$1'),
    html.replace(/(<meta property="og:url" content=")[^"]+/, '$1https://wrong.example/'),
    html.replace(/(<meta name="twitter:title" content=")[^"]+/, '$1Different title'),
    html.replaceAll(`${origin}${socialImage}`, '/relative-image.jpg'),
    html.replaceAll(socialImage, '/assets/favicon.svg'),
    html.replace('</head>', '<meta name="robots" content="noimageindex"></head>'),
    html.replace(/(<meta name="twitter:image"[^>]*>)/, '<!-- $1 -->'),
    html.replace(/(<meta name="twitter:image"[^>]*>)/, '<script>document.write(`$1`)</script>'),
    html.replace(/(<meta name="twitter:image"[^>]*>)/, '').replace('</body>', `<meta name="twitter:image" content="${origin}${socialImage}"></body>`),
  ]) assert.throws(() => validateSocialHtml(broken, canonical));
});

test('raster verification decodes bytes and rejects wrong dimensions, MIME, SVG, empty and corrupt images', async () => {
  await validateSocialImage(jpg, 'image/jpeg');
  const small = await sharp(jpg).resize(600, 315).jpeg().toBuffer();
  for (const [bytes, type] of [[small, 'image/jpeg'], [jpg, 'image/png'], [Buffer.alloc(0), 'image/jpeg'], [jpg.subarray(0, 500), 'image/jpeg'], [Buffer.from('<svg width="1200" height="630"></svg>'), 'image/jpeg']]) {
    await assert.rejects(validateSocialImage(bytes, type));
  }
});

test('successful-looking redirects, challenge responses and blocking headers are rejected', () => {
  for (const [status, extra] of [[302, {}], [404, {}], [200, { 'cf-mitigated': 'challenge' }], [200, { 'x-robots-tag': 'noindex' }], [200, { 'x-robots-tag': 'noimageindex' }], [200, { 'content-type': 'text/html' }]]) {
    assert.throws(() => validateCrawlerResponse(new Response(null, { status, headers: { 'content-type': 'image/jpeg', ...extra } }), 'image/jpeg'));
  }
});

test('robots rules protect the homepage and social image for specific agents and wildcard groups', () => {
  for (const agent of Object.values(crawlerAgents)) {
    assert.doesNotThrow(() => validateRobots('User-agent: *\nAllow: /\nDisallow: /api/', agent, ['/', socialImage]));
    assert.throws(() => validateRobots('User-agent: *\nDisallow: /assets/', agent, ['/', socialImage]));
  }
  assert.throws(() => validateRobots('User-agent: *\nAllow: /\nUser-agent: Twitterbot\nDisallow: /', crawlerAgents.X, ['/']));
  assert.throws(() => validateRobots('User-agent: *\nDisallow: /$\nDisallow: /*.jpg$', crawlerAgents.X, ['/']));
  assert.throws(() => validateRobots('User-agent: *\nDisallow:\nUser-agent: Twitterbot\nDisallow: /', crawlerAgents.X, ['/']));
  assert.doesNotThrow(() => validateRobots('User-agent: *\nDisallow: /$\nDisallow: /*.png$', crawlerAgents.X, [socialImage]));
  assert.doesNotThrow(() => validateRobots('User-agent: UnrelatedBot\nDisallow: /', crawlerAgents.X, ['/', socialImage]));
  assert.doesNotThrow(() => validateRobots(`User-agent: *\nDisallow: /assets/\nAllow: ${socialImage}`, crawlerAgents.X, [socialImage]));
});

test('production smoke fetches initial deployed HTML, its declared image and robots with every crawler agent', async () => {
  const calls = [];
  const fetcher = async (url, options) => {
    calls.push({ url, options });
    assert.equal(options.redirect, 'manual');
    if (url.startsWith('http:') || url.startsWith('https://www.')) return new Response(null, { status: 308, headers: { location: canonical } });
    if (url.endsWith(socialImage)) return new Response(jpg, { headers: { 'content-type': 'image/jpeg' } });
    if (url.endsWith('/robots.txt')) return new Response('User-agent: *\nAllow: /', { headers: { 'content-type': 'text/plain' } });
    return new Response(html, { headers: { 'content-type': 'text/html' } });
  };
  await verifySocialPreview(origin, { fetcher });
  for (const agent of Object.values(crawlerAgents)) {
    for (const url of [canonical, `${origin}${socialImage}`, `${origin}/robots.txt`]) {
      assert.ok(calls.some(c => c.url === url && c.options.headers?.['User-Agent'] === agent));
    }
  }
  await assert.rejects(verifySocialPreview('https://localhost', { fetcher }), /production origin/);
  await assert.rejects(verifySocialPreview(origin, { fetcher: async (url, options) => url.endsWith(socialImage) ? new Response('not an image', { headers: { 'content-type': 'image/jpeg' } }) : fetcher(url, options) }));
});
