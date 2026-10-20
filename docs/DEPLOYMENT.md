# Deployment

## Verified target

- GitHub: `hmarquardt/turkeyvulturesoftware`; existing public repository, initially empty.
- Branch: `main`; no existing remote history to overwrite.
- Worker: `turkey-vulture-software`.
- Cloudflare account: `b1aa310aa0a1638d72b8b086a21e557c`.
- Domain: `turkeyvulturesoftware.com`.
- Zone: `5b51c5134d58c24ed465a80afa21cfde`, active full zone.
- Nameservers: `fattouche.ns.cloudflare.com`, `magnolia.ns.cloudflare.com`.

Discovery date: October 20, 2026. A zone alone does not establish live hosting.
See the release verification record below for actual deployment results.

## Local deployment

```sh
npm ci
npm run check
npm run build
npm test
npx wrangler deploy --dry-run
# From a clean, committed checkout with the existing authenticated account:
npm run deploy
EXPECTED_COMMIT=$(git rev-parse HEAD) npm run verify:production
```

Use Wrangler login for local operator deployment. Never print the login token or
copy its rotating OAuth token into GitHub. `dist/version.json` records `HEAD`
(or `GITHUB_SHA` in CI); the initial uncommitted preview says `uncommitted`.
Production verification checks HTTPS pages, headers, revision, metadata, assets,
404 behavior, and the www redirect with a path/query.

## GitHub Actions

`.github/workflows/production.yml` runs HTML/link/target checks, Node tests, build,
Wrangler dry-run, and Playwright/axe on PRs and main pushes. Actions are pinned to
commit SHAs; Node 24 and npm lockfile installs are used. Concurrent production
releases serialize. Pull requests cannot deploy.

Unattended deployment requires **repository secret `CLOUDFLARE_API_TOKEN`**, an
existing account-owned token with Workers Scripts Edit and Workers Routes Edit
for the verified account/domain. No secret values belong in docs or source.
A rotating local OAuth session is not a suitable substitute.

After installing the credential, set **repository variable
`CLOUDFLARE_DEPLOY_ENABLED=true`**. The deploy job checks for the secret, rebuilds
the validated commit, deploys only this Worker, then checks the production revision
over HTTPS. With the variable unset, the workflow explicitly reports that only
validation is enabled. Do not enable a second Cloudflare Git build integration.
No GitHub Pages deployment is used.

## Domain, DNS, HTTPS

Use exact Worker Custom Domain bindings for the apex and `www`; Cloudflare
provisions DNS and TLS for those hostnames. The Worker redirects `www` permanently
(308) to HTTPS apex and preserves the path/query. No wildcard route is allowed.
Inspect current records before replacing conflicts; never force domain attachment
or replace unrelated DNS. Custom-domain provisioning must fail safely if an
existing conflicting record is present.

Initial access: Wrangler OAuth permits Worker/domain management but direct DNS
record listing returns HTTP 403. Public NS queries match the active zone; initial
A, www CNAME, and MX lookups returned no answers. Email Routing is unconfigured.
No existing DNS records or email configuration have been changed by this project.

## Email and outstanding setup

Email-first intake is functional and explicitly prepares a draft for the visitor
to send. The recipient is the owner’s existing public email. There is no SMTP/API
send path, storage, or production submission endpoint.

Before introducing online submission: configure a project mailbox and verified
sender/recipient, establish delivery and reply handling, verify receipt end to end,
add a project-specific Turnstile widget/`TURNSTILE_SECRET` and a rate-limit binding,
validate server-side, and update the privacy page. Never reuse another project’s
sender, widget, endpoint, database, or resource namespace. No email test message
was sent as part of v1 setup.

## Troubleshooting and rollback

- Wrangler account mismatch: stop; inspect `wrangler whoami` and the target config.
- DNS API 403: the local OAuth lacks direct DNS scope; don’t infer DNS access from
  zone status. Custom Domains can provision their exact hostnames separately.
- Domain conflict: inspect it with an authorized owner; do not overwrite blindly.
- TLS not yet active: inspect Custom Domain/certificate state and wait for issuance;
  do not claim HTTPS until a public request succeeds.
- CI deploy skipped: install the stable secret and enable the variable above.
- CI revision mismatch: inspect the deploy log, domain binding, and `/version.json`;
  do not accept HTTP 200 alone as release verification.
- Email app doesn’t open: copy the prepared message into webmail; nothing was sent.

Rollback with `npx wrangler deployments list`, then `npx wrangler rollback <VERSION_ID>`
for this Worker only. Verify the selected version and production afterward; record
the resulting revision. Prefer reverting the bad commit and letting CI redeploy so
Git remains the source of truth. Do not reset or force-push `main`.

## Release verification record

Implementation and release verification are in progress. The final release record
will replace this paragraph after the committed build is deployed and checked.
