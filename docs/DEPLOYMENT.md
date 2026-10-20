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

## Canonical release process: Git push

Push a reviewed commit to `origin/main`, or merge a pull request into main:

```sh
git push origin main
```

`.github/workflows/production.yml` automatically performs:

1. **Validate:** `npm ci`, `npm run check` (HTML, links, targets, Node tests),
   `npm run build`, Wrangler dry-run, and Playwright/axe browser tests.
2. **Deploy:** only on main and only after the validation job succeeds
   (`needs: validate`). Check out that same commit, install dependencies, require
   the Actions secret, rebuild, refuse conflicting domain/DNS changes, and deploy
   only the existing `turkey-vulture-software` Worker with implicit provisioning
   disabled. The Cloudflare version is tagged with the Git SHA and workflow run.
3. **Verify:** check production HTTPS, pages/assets, security headers, 404 handling,
   the www redirect with path/query, and `/version.json` against `GITHUB_SHA`.
   A successful upload alone is not a successful release.

Pull requests run validation only. A failed validation job blocks the deployment
job. Actions are pinned to commit SHAs, Node 24 and the lockfile are used, and main
releases serialize without interrupting an in-progress deployment. This follows
the existing AI Small Business Guru validate/deploy split and CFLab's explicit
CI publishing and local-deploy refusal patterns. No second Cloudflare Git build
integration or GitHub Pages deployment is used.

No `CLOUDFLARE_DEPLOY_ENABLED` variable is required or consulted. Every main push
attempts deployment after validation; missing credentials fail visibly.

## GitHub Actions credential

Set the repository Actions secret **`CLOUDFLARE_API_TOKEN`** to the existing stable
Cloudflare deployment token for account `b1aa310aa0a1638d72b8b086a21e557c`.
It needs Workers Scripts Edit and Workers Routes Edit for this account and zone.
The account and zone IDs in `wrangler.json` are non-secret configuration.

[Repository Actions secrets](https://github.com/hmarquardt/turkeyvulturesoftware/settings/secrets/actions)
are the credential source. A stable credential can be installed with `gh secret set
CLOUDFLARE_API_TOKEN --repo hmarquardt/turkeyvulturesoftware` using secure stdin.
Never put secret values in commands, logs, source, or docs. Do not copy a rotating
Wrangler OAuth login into CI. GitHub does not reveal secret values from other
repositories, so an existing secret cannot be retrieved through its API.

A missing/invalid token fails before production publication. Fix the repository
secret and re-run the failed workflow or push the next reviewed commit. Do not
fall back to a local production deploy. No developer login is needed by CI.

## Local development and verification

```sh
npm ci
npm run dev
# Or run all quality gates without publishing:
npm run test:all
npx wrangler deploy --dry-run
# Read-only verification of a committed production revision:
EXPECTED_COMMIT=$(git rev-parse HEAD) npm run verify:production
```

`npm run deploy` deliberately exits with an explanation and publishes nothing,
matching CFLab. Local `wrangler deploy` is not a release mechanism. Wrangler's
local runtime and dry-run are development tools only. `version.json` contains
`GITHUB_SHA` in Actions and HEAD during local builds; uncommitted initial previews
use `uncommitted`.

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
The exact apex and www Custom Domains were subsequently attached with both DNS-record and Worker-origin override flags false, after a Cloudflare changeset confirmed no conflicts or removals. Cloudflare manages their generated DNS records. No email configuration or unrelated DNS was changed.

HTML responses include `Cache-Control: no-transform` to prevent Cloudflare's
automatic Web Analytics beacon injection. This is response-scoped, not an account
or unrelated-zone setting change. See the [Cloudflare Web Analytics FAQ](https://developers.cloudflare.com/web-analytics/faq/).
Direct Web Analytics management is not available to the current OAuth credential
(HTTP 403); the response-header policy requires no broader credential.

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

Local preview explicitly uses `--host localhost`. Without it, Wrangler can derive
the production host from Custom Domains and rewrite an apex HTTPS redirect into
a local self-redirect. Keep this flag in both `npm run dev` and Playwright.

- Wrangler account mismatch: stop; inspect `wrangler whoami` and the target config.
- DNS API 403: the local OAuth lacks direct DNS scope; don’t infer DNS access from
  zone status. Custom Domains can provision their exact hostnames separately.
- Domain preflight failure: logs include sanitized Cloudflare error codes and
  messages, never credentials, authorization headers, or raw response bodies.
  Invalid JSON and malformed schemas fail closed. A diagnostic read-only domain
  lookup does not bypass the verification gate.
- Domain conflict: inspect it with an authorized owner; do not overwrite blindly.
- TLS not yet active: inspect Custom Domain/certificate state and wait for issuance;
  do not claim HTTPS until a public request succeeds.
- CI deployment fails at the secret check: install the stable repository secret;
  the workflow never silently skips main deployment because a variable is unset.
- CI revision mismatch: inspect the deploy log, domain binding, and `/version.json`;
  do not accept HTTP 200 alone as release verification.
- Email app doesn’t open: copy the prepared message into webmail; nothing was sent.

For rollback, revert the bad change in Git and push to main so the same pipeline
validates, deploys, and verifies the revert. Never reset or force-push main.
A direct Cloudflare rollback is an exceptional operator recovery action requiring
explicit authorization; record it and reconcile Git afterward. Do not use it for
normal releases.

## Release verification record

### Historical manual bootstrap — October 20, 2026

Both previous production deployments were **manual**, using the local Wrangler
OAuth login. Actions validated the commits but skipped the deploy job because
its opt-in variable was unset and no Actions deployment secret was available.
The first created the Worker; the second retained the verified domain bindings
and added production hardening. These were initial setup actions, not a successful
CI/CD release, and must not be repeated as the normal release process.

Historical evidence:

- Initial commit: `ffc3558e8c62305cd626be7b16ab9ba7731dd7eb`, pushed to origin/main.
- First Worker version: `e532d2c1-b0be-4cb8-89fa-1e60dd4ed308`.
- Worker URL: https://turkey-vulture-software.hmarquardt.workers.dev
- Apex: https://turkeyvulturesoftware.com
- Apex and www Custom Domains attached without overriding records or bindings.
- Authoritative DNS, Cloudflare 1.1.1.1, and Google 8.8.8.8 resolve both hostnames.
- HTTPS certificate validation, all public pages/assets, headers, 404, version,
  and www 308 with path/query passed the production verification script.
- The local machine cached pre-provisioning NXDOMAIN. Verification used a
  process-local public DNS resolver; no OS DNS settings were changed.
- [Initial Actions validation](https://github.com/hmarquardt/turkeyvulturesoftware/actions/runs/39459406398)
  passed: HTML/links/target checks, 12 Node tests, dry-run, 25 browser tests.
- Automatic deploy was intentionally skipped: stable token absent, gate disabled.
- No brand-domain mailbox or delivery engine was enabled; email draft/copy intake
  uses the owner's existing public contact address, not a fabricated mailbox.

### GitHub Actions release correction

Removed the silent opt-in gate, retained validation as a required dependency,
made local `npm run deploy` refuse publication, removed local OAuth fallback from
the credential preflight, and documented Git push as the canonical release path.
Existing Cloudflare resources are retained unchanged.

Credential discovery found no target-repository secret or available stable local
deployment token. The local OAuth login returns HTTP 403 for token management.
CI deployment verification remains blocked until the stable repository secret is
installed. This is a credential blocker, not permission to deploy locally.

`/version.json` is the authoritative current deployed SHA; compare it to the
actual main-push workflow's `headSha` and require both validate and deploy to pass.
