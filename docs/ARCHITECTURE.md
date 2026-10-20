# Architecture

## Choices

Vanilla HTML/CSS/JS, rendered from a small JavaScript template at build time. A
single Cloudflare Worker serves Static Assets and handles cross-domain redirects
and security headers. No framework, runtime package dependency, server database,
external form provider, or analytics backend. Privacy-conscious analytics reports
to the existing first-party-operated CFLab Analytics service through one
self-hosted browser client. Node 24 is the CI baseline; package versions and the
lockfile are committed.

`src/pages.mjs` defines page content, layout, canonical metadata, and the known
page list. `scripts/build.mjs` publishes only `public/` and those rendered pages
into `dist/`. It also emits a sitemap and `version.json` with the Git revision.
The raw checkout, docs, tests, and configuration are never uploaded as assets.

Public pages are the homepage, `/how-we-build` (ownership and stack), `/site-autopsy`,
`/contact`, `/privacy`, and the noindex 404. New content paths must be added to the
known page list so the build and sitemap include them.

## Runtime request flow

1. Worker-first routing executes for every request, including assets.
2. `www` and HTTP apex requests get a 308 HTTPS apex redirect, preserving path/query.
3. GET/HEAD pass to `ASSETS`; missing paths use `404.html` with real 404 status.
4. `POST /api/contact` runs the intake handler; other non-GET/HEAD requests receive
   405. The handler alone may send mail, and only to the fixed inbox.
5. Responses receive CSP, no-sniff, referrer/permissions policy, and HTTPS HSTS.
   Workers.dev responses are marked noindex. Version responses use no-store.
   HTML responses add `Cache-Control: no-transform` to prevent automatic analytics
   injection by Cloudflare. The site's own analytics client is explicit and
   self-hosted. The browser suite permits only local assets, Turnstile when a form
   is used, and the exact analytics collector.

Worker-first keeps redirect/security behavior consistent. This trades a small
Worker invocation cost for predictable routing. There is no SPA fallback.

## Analytics flow

Every page loads `/assets/analytics.js` with `defer`. The file is served from the
site's own origin; no executable analytics script is loaded from the collector.
The public Site ID is `as_5wh58kbCgGxaRewfGznoaC`, registered for
`turkeyvulturesoftware.com` (primary) and `www.turkeyvulturesoftware.com` (alias)
in the existing CFLab Analytics service at
`https://analytics.aismallbizguru.com/collect`.

The client sends one `pageview` per page load, including `/how-we-build` and the
404 page. It reports pathname only, plus the five supported UTM parameters when
present. It creates no cookies and no `localStorage` identifier. An anonymous
session ID is kept in `sessionStorage` and rotates after 30 minutes without
activity. DNT and GPC suppress all requests. The client is inert on localhost,
the `workers.dev` hostname, and tests unless a controlled test explicitly opts in.

One delegated, capturing click listener emits `contact_cta_click` for links to
`/site-autopsy`, `/contact`, or `mailto:` links. Its properties are restricted to
`destination` (`autopsy`, `project`, `email`) and a fixed `placement` set. It
never calls `preventDefault`; normal navigation and mail handling remain intact.
No page markup depends on analytics attributes.

`intake.js` calls the client only inside the confirmed-success branch, after
`response.ok && result.ok`. A guard prevents a second accepted-inquiry event.
`intake_submit` carries `kind` (`autopsy` or `project`) and, for project
inquiries, the controlled service category. It never reads or serializes name,
email, business, website, description, reference ID, Turnstile token, or any other
form value. Validation failures, Turnstile rejection, rate limiting, and delivery
errors never reach that branch.

CSP allows the exact collector only through `connect-src`. `script-src`,
`frame-src`, and `form-action` are unchanged, so the analytics service cannot
provide executable code and native form submission remains forbidden. Analytics
fetches use `keepalive`, fail silently, and cannot delay or alter navigation,
rendering, or form success. The Worker has no analytics binding, database, or
server-side forwarding path.

## Intake flow and data

Both intake pages accept name, email, optional business name, optional website,
optional service area, and a description. Site Autopsy requires a public website
URL and treats the description as optional; project intake requires a service and a
description of at least 20 characters. The browser validates before sending and
posts JSON to `POST /api/contact` on the same Worker.

The server independently enforces the same limits and rejects non-object JSON,
unknown request types, bad emails or URLs, control characters, oversized bodies
(16 KB), non-JSON content types, unapproved origins, filled honeypots, missing or
rejected Turnstile tokens, and rate-limit exhaustion. Single-line fields are
stripped of line breaks before they reach mail headers. Emails are plain text, with
a fixed `From`, fixed `To`, and the visitor's validated address only in `Reply-To`.
Visitor input cannot choose a recipient, sender, subject, or header.

Turnstile is loaded only when the visitor starts the form. The widget action is
`contact`; the server verifies the token at Cloudflare's Siteverify endpoint with a
five-second timeout and checks action and hostname. `CONTACT_RATE_LIMIT` allows five
submissions per 60 seconds per client IP in each Cloudflare location. Both checks
fail closed when unconfigured or unavailable.

The Worker sends a structured message through the `SEND_EMAIL` binding to
`hmarquardt@gmail.com` from `contact@turkeyvulturesoftware.com`. Each request
carries a generated UUID reference and a UTC timestamp. The browser shows success
and the reference only after `send()` resolves; provider rejection returns 502 and
keeps the form contents. No inquiry contents are written to D1, KV, cookies,
local/session storage, analytics, or Worker logs. Logs contain only the event name,
reference, and provider error code. Analytics receives only the accepted-inquiry
kind and controlled category, never a form field.

Incoming mail uses Cloudflare Email Routing, separately from Email Sending. Literal
rules forward `hank@` and `contact@turkeyvulturesoftware.com` to the verified Gmail
destination. Catch-all is disabled. Cloudflare supplies routing MX, SPF, and DKIM
records; Email Sending supplies `cf-bounce` MX, SPF, and DKIM records. DMARC is
`p=reject`.

The UI keeps a direct `contact@turkeyvulturesoftware.com` fallback and a no-JavaScript
note. CSP still forbids native HTML form submission, so a script failure cannot leak
contact fields into a URL. Turnstile and the exact analytics collector are the only
added CSP sources; the collector is allowed for connections only.

## Dependencies and boundaries

Production: Cloudflare (Workers Static Assets, Turnstile, rate limiting, Email
Routing, Email Sending), Google Gmail for the destination inbox, and the existing
first-party-operated CFLab Analytics service. Site code is self-hosted. Turnstile
is the only third-party script/frame and loads only after form interaction. The
analytics client is self-hosted and sends to the exact collector origin; no
remote analytics script or advertising tracker is allowed.
Development: Wrangler, Playwright, axe, html-validate, sharp (asset preparation),
and yaml (release-policy regression checks).
Cloudflare authentication stays in local Wrangler state or an Actions secret; the
Turnstile secret is a Worker secret, never a repository file. The browser never
fetches user-provided URLs; adding scanning requires a separate
SSRF/permission/resource-limit design.

Only the fixed contact binding may send mail. No D1/KV storage, alternate
recipient, open relay, or submission history exists. No speculative scanner
infrastructure is included.

## Release safety

GitHub Actions uses only Worker-specific settings/deployment/version GET APIs,
which explicitly support Individual Workers Editor. The account-wide domain
inventory API requires legacy permissions and is not used. No extra account
permissions or application resources are needed.

The gate pins the account, Worker and source trigger declarations. It authenticates
Worker settings, validates only the known `ASSETS`, `TURNSTILE_SECRET`, `SEND_EMAIL`,
and `CONTACT_RATE_LIMIT` bindings and a single active version at 100%, and snapshots
deployment identity plus matching apex/workers.dev public revisions and the www
redirect. Any metadata/permission/routing failure blocks
publication. Before activation, the baseline must remain unchanged and the exact
uploaded UUID must carry the validated Git SHA tag. After activation the Worker
API must identify that UUID at 100%; public HTTPS checks require the same Git SHA
at both known Worker and apex URLs, plus assets, headers, 404 and www behavior.

Only `wrangler versions upload` and `wrangler versions deploy` can publish. Neither
updates routes, domains, DNS or triggers. Their immutability replaces incompatible
account-wide inventory comparisons; it does not claim administrative enumeration
of DNS or bindings. Such infrastructure changes require a separate explicit task.
