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
Production releases are driven only by GitHub Actions: push to `origin/main` →
validate → deploy → verify. Failed validation must prevent deployment. Pull
requests validate but never deploy. Preserve `needs: validate` and the main-only,
non-PR deploy condition; do not add a silent opt-in deployment gate.

`npm run deploy` intentionally refuses to publish, matching CFLab's policy.
Do not run local `wrangler deploy` or use a local OAuth session for releases.
Wrangler development and `deploy --dry-run` are allowed locally. The initial
manual deployments are historical bootstrap work, not the release process.
Credentials must come from the repository Actions secret `CLOUDFLARE_API_TOKEN`.
Missing credentials are a visible CI failure, never a reason to deploy locally.

After deployment changes, push an actual commit and verify both the Actions
validate/deploy jobs and production `/version.json` against that commit. Keep the
existing Worker, domains, DNS and certificates; do not recreate them to change CI.
Normal CI releases use `wrangler versions upload` and `wrangler versions deploy`
only. Never run `wrangler deploy` or `wrangler triggers deploy` in the deploy job:
noninteractive domain publishing can set overwrite flags. Authenticate only the
pinned Worker through granular-compatible settings/deployment/version GET APIs.
Snapshot its active deployment and public revision baseline; block activation if
these change during upload, or the uploaded UUID/Git SHA tag is wrong. Confirm
100% activation through the Worker API and verify the exact revision over HTTPS.

Do not call the account-wide `/workers/domains` inventory endpoint: its legacy
permissions are incompatible with Individual Workers Editor even with a service
filter. Preserve the existing token and do not widen permissions to make inventory
calls work. DNS/trigger safety comes from never invoking a mutation path; public
revision and redirect checks verify live routing, not administrative ownership.
Do not claim DNS records or a binding inventory were enumerated by this protocol.

Rollback normally means reverting the change and pushing through the same pipeline.

Update README and affected docs when behavior, commands, architecture, brand,
resource IDs, deployment status, dependencies, or data handling change. Distinguish
implemented, deployed, verified, and pending. A configured zone is not a live site;
verify HTTPS, revision, redirect path/query, and DNS after release.

## Ownership

Commercial, all rights reserved. Do not add an open-source LICENSE without an
explicit owner decision. Third-party licenses and asset provenance must be retained.
