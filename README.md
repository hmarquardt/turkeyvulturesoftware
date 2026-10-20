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
npx wrangler versions upload --dry-run --no-x-provision
```

`npm run test:all` checks, builds, and runs browser tests. The browser suite launches
Wrangler automatically. `dist/`, dependencies, credentials, and test artifacts are ignored.

## Release

Target repository: `hmarquardt/turkeyvulturesoftware`, branch `main`.
Cloudflare Worker: `turkey-vulture-software` in the verified account in `wrangler.json`.
Production domain: `turkeyvulturesoftware.com` (Cloudflare zone verified October 20, 2026).

**Git push is the production deployment trigger.** Push to `origin/main` (or merge
a pull request) and GitHub Actions installs dependencies, checks HTML/links and
routing, builds, runs browser/accessibility tests, deploys the validated commit
to the existing Cloudflare Worker, and verifies the HTTPS revision. Releases
authenticate the pinned Worker through granular-compatible APIs, detect concurrent
deployment changes, verify the uploaded UUID/Git SHA, and confirm live routing.
They never publish DNS or trigger changes. Failed
validation prevents deployment. Pull requests validate without deploying.

```sh
git push origin main
```

The workflow uses the repository Actions secret `CLOUDFLARE_API_TOKEN`, never a
local developer login. No opt-in deployment variable is required. A missing or
invalid secret fails the deployment visibly; it does not silently skip it.
`npm run deploy` deliberately refuses local publication, following CFLab's pattern.
Local Wrangler is for development and dry-run validation, not routine releases.
See [the deployment runbook](docs/DEPLOYMENT.md) for credentials, CI verification,
the historical bootstrap, and rollback.

## What ships

- Homepage with all four service areas, approach, process, and conversion paths.
- `/how-we-build`: the ownership-first stack, AI-assisted engineering approach, pragmatic technology rules, and five-step onboarding guide.
- `/site-autopsy`: request a human website review through the protected form.
- `/contact`: project intake with service selection and the same protected form.
- `/privacy`, useful 404, metadata, social card, robots, sitemap, version endpoint.
- Responsive navigation, keyboard focus, reduced motion, self-hosted original imagery.
- Self-hosted, cookie-free analytics through the existing CFLab Analytics Site; pageviews, contact CTA clicks, and confirmed intake events only.

**Contact is server-side and email-delivered.** Both forms submit JSON to
`POST /api/contact` on the existing Worker. The browser shows success only after
Cloudflare Email Service accepts the message. The Worker sends to the fixed
verified inbox `hmarquardt@gmail.com` from `contact@turkeyvulturesoftware.com`,
with the visitor's validated address as `Reply-To`. Nothing is stored in a
database, CRM, or browser storage, and inquiry contents are never sent to
analytics. No automated scanner, fabricated success screen, or WhatsApp-style
relay is involved.

## Analytics

The site reports to the existing CFLab Analytics Worker at
`https://analytics.aismallbizguru.com`. Turkey Vulture is a first-class Site in
the existing `cflab-analytics` database; this repository adds no analytics Worker,
D1 database, dashboard, or tracking backend.

| Field | Value |
| --- | --- |
| Name / slug | Turkey Vulture Software / `turkeyvulturesoftware` |
| Public tracking ID | `as_5wh58kbCgGxaRewfGznoaC` (public configuration, not a secret) |
| Domains | `turkeyvulturesoftware.com` (primary), `www.turkeyvulturesoftware.com` (alias) |
| Privacy | DNT and GPC respected, 90-day raw retention, UTC days, active |
| Collector | `POST https://analytics.aismallbizguru.com/collect` |

`public/assets/analytics.js` is the self-hosted client. The page loads no
executable analytics script from another origin. It uses no cookies or
`localStorage`; the anonymous session ID lives in `sessionStorage` only and
rotates after 30 minutes of inactivity. Only the pathname (never the query
string) and supported UTM parameters are read from the URL. The collector
reduces the referrer to a hostname and derives coarse browser/OS/device and
Cloudflare country/region values. DNT or GPC suppresses every request. The
client is inactive on local development, tests without an explicit test flag,
and the `workers.dev` hostname.

| Event | Kind | Properties | Source |
| --- | --- | --- | --- |
| `pageview` | pageview | — | automatic, exactly once per page load |
| `contact_cta_click` | event | `destination` (`autopsy`, `project`, `email`), `placement` (`navigation`, `footer`, `hero`, `services`, `approach`, `autopsy-band`, `how-we-build`, `page`) | one delegated link listener |
| `intake_submit` | event | `kind` (`autopsy`, `project`), and the controlled project `category` when applicable | `intake.js`, only after `response.ok && result.ok` from `/api/contact` |

Names, email addresses, business names, website URLs, descriptions, reference
IDs, Turnstile tokens, and other form contents are never sent to analytics. A
failed validation, rejected Turnstile check, rate limit, or delivery failure
does not produce `intake_submit`. Pageviews cover ordinary page interest; there
is no duplicate custom "page visit" event.

The Worker CSP allows the collector only through `connect-src`; `script-src`,
`frame-src`, and `form-action` retain their existing restrictions. Analytics
requests are fire-and-forget and silent: a blocked or failed collector cannot
change navigation or form behavior. Production verification checks the
self-hosted client, Site ID, endpoint, and CSP.

## Email

Inbound and outbound email are separate Cloudflare features:

| Direction | Feature | Configuration |
| --- | --- | --- |
| Incoming | Email Routing | `hank@` and `contact@turkeyvulturesoftware.com` forward to the verified `hmarquardt@gmail.com`; catch-all disabled. |
| Outgoing | Email Sending (`send_email` binding) | Fixed sender `contact@turkeyvulturesoftware.com`, fixed destination `hmarquardt@gmail.com`, sender allowlist. |

The `turkeyvulturesoftware.com` zone is enabled for both routing and sending.
Cloudflare manages the routing MX/SPF/DKIM records and the sending `cf-bounce`
MX/SPF/DKIM records. DMARC is published as `p=reject`. The Worker never accepts a
client-supplied recipient or sender.

Both public addresses were tested on October 20, 2026 by sending from
`contact@turkeyvulturesoftware.com` through Cloudflare Email Sending. Cloudflare's
routing activity log recorded `status: delivered`, `action: forward`, with SPF,
DKIM, and DMARC passing for messages addressed to `hank@` and `contact@`
separately. That confirms Cloudflare delivery to the verified destination; it does
not independently read the Gmail mailbox UI.

The form endpoint is protected by server-side Turnstile verification, a Cloudflare
rate-limit binding (5 requests per 60 seconds per client IP and location), strict
schema/length limits, URL and email validation, a hidden honeypot, origin and
content-type checks, bounded body reads, and safe plain-text email construction.
Logs contain only the request ID and provider error code, never inquiry content.

## Files

- `src/pages.mjs`: shared HTML layout, content, metadata; rendered during build.
- `src/worker.mjs`: domain redirects, security headers, static delivery, method limits, and the validated `/api/contact` endpoint.
- `public/`: the only copied production asset directory; all site code is self-hosted.
- `scripts/`: deterministic build, checks, production verification.
- `tests/`: Node contract tests and Playwright/axe browser checks.
- `.github/workflows/production.yml`: automatic validate → deploy → verify pipeline for main pushes.
- `docs/`: brand, architecture, deployment, roadmap, and image provenance.

## Ownership

This is commercial work. No open-source license is granted. Dependencies retain
their own licenses. AI-created image provenance and the exact prompt are documented
in [ASSETS.md](docs/ASSETS.md); no third-party photo license is claimed.
