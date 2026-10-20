# Working on Turkey Vulture Software

## Boundaries

Keep this a small, build-time HTML site with a single Cloudflare Worker. Browser
code is vanilla JavaScript. Shared markup and page content belong in `src/pages.mjs`;
styles and browser interactions in `public/assets/`. The build copies only `public/`
and renders the known pages. Never copy the checkout into `dist/`.

Do not add a client framework, database, CRM, analytics service, or scanner without
an actual product requirement. Site Autopsy currently requests a human review.
Email preparation happens only in browser memory. Never imply that a draft has
been submitted. Preserve direct email and no-JavaScript fallbacks.

## Engineering

Use semantic HTML, visible focus, explicit labels, and progressively enhanced
navigation. Respect reduced motion. Keep all runtime assets self-hosted. New page
paths must be included in the build and sitemap. Use the existing design tokens.
Maintain useful mobile layouts down to 320px. Follow `docs/BRAND.md` for copy and
claims: no fabricated experience details, testimonials, clients, or performance.

Run `npm run check`, `npm run build`, `npm test`, and a Wrangler dry-run before
shipping functional changes. Browser tests cover 320, 390, 768, and 1440px with axe.
Inspect screenshots for visual changes; accessibility checks do not judge design.
Do not add tests that merely repeat markup. Never send test inquiries to a real
recipient without explicit authorization.

## Security and resources

Never commit or print tokens, OAuth sessions, `.env`, `.dev.vars`, private keys,
contact contents, or local credentials. Examples must be placeholders. Do not
copy rotating OAuth credentials into CI. No visitor content in operational logs.
Future forms require server-side validation, bounded request reads, anti-abuse,
verified delivery, clear failure states, and an appropriate privacy update.
Future URL scanning requires a separate SSRF and authorization design; the current
email helper does not fetch submitted URLs.

Only deploy `turkey-vulture-software` in the account declared in `wrangler.json`.
Only attach `turkeyvulturesoftware.com` and `www.turkeyvulturesoftware.com`.
Preserve all unrelated DNS, Workers, zones, email routes, and infrastructure.
`~/aismallbizguru`, `~/worthlookingup`, and `~/aismallbizguru-cflab` are read-only
references. Never edit, deploy, or change their repository secrets/resources.

## Git and deployment

Use `main`, inspect status/history/remote before pushing, and never force-push over
unexpected remote history. Keep `.gitignore` and these docs in place before the
initial commit. Inspect staged content for secrets and generated artifacts.
Production uses GitHub Actions and Cloudflare Workers Static Assets, never GitHub
Pages. PRs validate but never deploy. The deploy variable is enabled only after a
stable account-owned Actions credential is installed. Local bootstrap releases
must use a committed, tested revision and be recorded honestly.

Update README and affected docs when behavior, commands, architecture, brand,
resource IDs, deployment status, dependencies, or data handling change. Distinguish
implemented, deployed, verified, and pending. A configured zone is not a live site;
verify HTTPS, revision, redirect path/query, and DNS after release.

## Ownership

Commercial, all rights reserved. Do not add an open-source LICENSE without an
explicit owner decision. Third-party licenses and asset provenance must be retained.
