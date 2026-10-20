import { mkdir, cp, writeFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { pages, layout, origin } from '../src/pages.mjs';
// Only public assets and rendered pages are publishable. Never copy the checkout.
await rm('dist', { recursive: true, force: true });
await mkdir('dist', { recursive: true });
await cp('public', 'dist', { recursive: true });
for (const page of pages) {
  const file = page.path === '/' ? 'index' : page.path.slice(1);
  await writeFile(`dist/${file}.html`, layout(page));
}
await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${pages.filter(p => !p.noindex).map(p => `<url><loc>${origin}${p.path}</loc></url>`).join('')}</urlset>\n`);
let commit = process.env.GITHUB_SHA;
if (!commit) { try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { commit = 'uncommitted'; } }
await writeFile('dist/version.json', JSON.stringify({ version: '1.0.0', commit }) + '\n');
console.log(`Built ${pages.length} pages; revision ${commit}.`);
