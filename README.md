# Turkey Vulture Software

Independent software engineering: website rescue and development, custom software,
AI and business automation, and data/cloud systems. Principal brand: **Turkey Vulture**.
“Old-school engineering. AI-powered execution.”

## Develop and validate

Requires Node.js 24+ and npm. No client framework or bundler.

```sh
npm ci
npm run dev                 # Cloudflare local runtime, http://127.0.0.1:8787
npm run check               # HTML, links, deployment boundaries, Node tests
npm run build               # explicit public assets + rendered HTML → dist/
npx playwright install chromium
npm test                    # responsive, accessibility and interaction browser tests
npx wrangler deploy --dry-run
```

`npm run test:all` checks, builds, and runs browser tests. The browser suite launches
Wrangler automatically. `dist/`, dependencies, credentials, and test artifacts are ignored.

## Release

Target repository: `hmarquardt/turkeyvulturesoftware`, branch `main`.
Cloudflare Worker: `turkey-vulture-software` in the verified account in `wrangler.json`.
Production domain: `turkeyvulturesoftware.com` (Cloudflare zone verified October 20, 2026).

GitHub Actions validates every PR/push; production deployment is gated by the
repository variable `CLOUDFLARE_DEPLOY_ENABLED=true` and Actions secret
`CLOUDFLARE_API_TOKEN`. Use the existing account-owned deployment credential,
not a rotating Wrangler OAuth session. Until supplied, Actions validation runs
and the deploy job is explicitly skipped. An authenticated local bootstrap can
publish the same tested commit. See [deployment](docs/DEPLOYMENT.md) for actual
verification status, domain activation, required permissions, and rollback.

## What ships

- Homepage with all four service areas, approach, process, and conversion paths.
- `/site-autopsy`: request a human website review by preparing an email.
- `/contact`: project intake with service selection and a reviewable email draft.
- `/privacy`, useful 404, metadata, social card, robots, sitemap, version endpoint.
- Responsive navigation, keyboard focus, reduced motion, self-hosted original imagery.

**Contact is email-first.** Forms prepare messages in the browser, then the visitor
sends from their email app or copies into webmail. The recipient is the owner's
verified public GitHub email, also matching the authenticated Cloudflare identity.
No message is submitted to the website. No database, tracking, cookies, automated
scanner, delivery promise, or fake success screen. Automated submission is deferred
until the project mailbox and delivery path are verified end to end.

## Files

- `src/pages.mjs`: shared HTML layout, content, metadata; rendered during build.
- `src/worker.mjs`: domain redirects, security headers, static delivery, method limits.
- `public/`: the only copied production asset directory; no third-party runtime assets.
- `scripts/`: deterministic build, checks, production verification.
- `tests/`: Node contract tests and Playwright/axe browser checks.
- `.github/workflows/production.yml`: validated, gated Cloudflare release pipeline.
- `docs/`: brand, architecture, deployment, roadmap, and image provenance.

## Ownership

This is commercial work. No open-source license is granted. Dependencies retain
their own licenses. AI-created image provenance and the exact prompt are documented
in [ASSETS.md](docs/ASSETS.md); no third-party photo license is claimed.
