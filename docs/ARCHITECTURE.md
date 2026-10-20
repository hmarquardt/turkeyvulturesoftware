# Architecture

## Choices

Vanilla HTML/CSS/JS, rendered from a small JavaScript template at build time. A
single Cloudflare Worker serves Static Assets and handles cross-domain redirects
and security headers. No framework, runtime package dependency, server database,
or external form provider. Node 24 is the CI baseline; package versions and the
lockfile are committed.

`src/pages.mjs` defines page content, layout, canonical metadata, and the known
page list. `scripts/build.mjs` publishes only `public/` and those rendered pages
into `dist/`. It also emits a sitemap and `version.json` with the Git revision.
The raw checkout, docs, tests, and configuration are never uploaded as assets.

## Runtime request flow

1. Worker-first routing executes for every request, including assets.
2. `www` and HTTP apex requests get a 308 HTTPS apex redirect, preserving path/query.
3. GET/HEAD pass to `ASSETS`; missing paths use `404.html` with real 404 status.
4. Other methods receive 405; there is no online submission endpoint.
5. Responses receive CSP, no-sniff, referrer/permissions policy, and HTTPS HSTS.
   Workers.dev responses are marked noindex. Version responses use no-store.

Worker-first keeps redirect/security behavior consistent. This trades a small
Worker invocation cost for predictable routing. There is no SPA fallback.

## Intake flow and data

Both intake pages accept name, email, business, website, and a description. Site
Autopsy requires a public website URL; project intake requires a description and
allows service selection. HTML/browser validation plus HTTP(S) URL checks run
before drafting. The browser builds plain text, encodes a `mailto:` link, and shows
a copyable preview. The visitor opens and sends from their own email provider.
Editing inputs invalidates the previous preview. No draft reaches the Worker,
local/session storage, cookies, telemetry, or an AI service.

The owner’s public GitHub email `hmarquardt@gmail.com` was verified through the
authenticated GitHub user API and matches the authenticated Cloudflare identity.
This establishes an existing contact address; it is not a claim of inbox delivery
verification. No brand-domain mailbox is invented. Gmail processes correspondence
only after a visitor sends it. A prepared draft is never represented as submitted.

The UI explicitly offers manual copy for devices without a mail handler, and a
direct email fallback with JavaScript disabled. CSP forbids HTML form submission
so a script failure cannot leak contact fields into a GET query.

## Dependencies and boundaries

Production: Cloudflare and the visitor’s chosen email service. All site assets
are self-hosted. No analytics or third-party browser requests.
Development: Wrangler, Playwright, axe, html-validate, and sharp (asset preparation).
Cloudflare authentication stays in local Wrangler state or an Actions secret.
Current browser helpers never fetch user-provided URLs; adding scanning requires
a separate SSRF/permission/resource-limit design.

An eventual `/api/inquiries` handler can replace email preparation behind the
same page fields. Before activation: project-specific email configuration, receipt
verification, server-side validation, Turnstile verification, rate limiting,
timeouts, sanitized logs, duplicate handling, and updated privacy information.
No speculative persistence or scanner infrastructure is included in v1.
