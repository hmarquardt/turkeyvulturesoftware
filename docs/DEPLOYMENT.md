# Deployment

## Target and credential

- Repository: `hmarquardt/turkeyvulturesoftware`, default branch `main`.
- Worker: `turkey-vulture-software`.
- Cloudflare account: `b1aa310aa0a1638d72b8b086a21e557c`.
- Zone: `5b51c5134d58c24ed465a80afa21cfde` (`turkeyvulturesoftware.com`).
- Apex: https://turkeyvulturesoftware.com
- Existing Worker URL: https://turkey-vulture-software.hmarquardt.workers.dev
- Nameservers: `fattouche.ns.cloudflare.com`, `magnolia.ns.cloudflare.com`.

The repository Actions secret `CLOUDFLARE_API_TOKEN` contains the dedicated,
account-owned token: **Individual Worker `turkey-vulture-software`: Editor** and
**zone `turkeyvulturesoftware.com`: Workers Routes Write**. Keep this token and its
scope unchanged. CI never uses a local developer login. IDs above are public
configuration, not secrets. Never print token values or sensitive headers.

## Canonical release: Git push

```sh
git push origin main
```

`.github/workflows/production.yml` automatically performs:

1. **Validate:** install the lockfile with Node 24, check HTML/links/targets and Node
   tests, build, dry-run the version upload, and run Playwright/axe browser tests.
2. **Preflight:** authenticate through the pinned Worker's settings GET API,
   validate only the known `ASSETS`, `TURNSTILE_SECRET`, `SEND_EMAIL`, and
   `CONTACT_RATE_LIMIT` bindings, and read its active deployment. Require
   one valid version at 100%. Compare public apex/workers.dev revision identifiers
   and check the exact www 308 redirect. Persist this baseline on the runner.
3. **Upload:** `wrangler versions upload --no-x-provision`, tagged with the Git SHA.
   Extract exactly one valid version UUID. This does not activate it or deploy
   any route, domain, DNS or trigger configuration.
4. **Before activation:** require the active deployment and public baseline to be
   unchanged. Read the uploaded version through this Worker's API and require its
   UUID and `workers/tag` to match the validated commit.
5. **Activate:** `wrangler versions deploy <UUID>@100% --yes`. No trigger operation.
6. **Verify:** require the Worker API to show that exact UUID serving 100%, with
   the expected Git tag. Then verify public HTTPS at apex and workers.dev serves
   `GITHUB_SHA`; check pages/assets, security headers, 404 and the www redirect
   including path/query. HTTP 200 or a successful upload alone is insufficient.

`needs: validate` blocks deployment after any validation failure. PRs validate only.
There is no opt-in variable that silently skips main deployment. Releases serialize;
in-progress deployments are not cancelled. Actions are pinned to commit SHAs.
No GitHub Pages or parallel Cloudflare Git build integration is used.

## Granular-token compatibility and safety

The following read-only APIs explicitly support **Individual Workers Editor**:

- [Worker settings](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/script_and_version_settings/methods/get/):
  `GET /accounts/{account}/workers/scripts/{worker}/settings`.
- [Worker deployments](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/deployments/methods/list/):
  `GET /accounts/{account}/workers/scripts/{worker}/deployments`.
- [Worker version](https://developers.cloudflare.com/api/resources/workers/subresources/scripts/subresources/versions/methods/get/):
  `GET /accounts/{account}/workers/scripts/{worker}/versions/{UUID}`.

The [account-wide domain list](https://developers.cloudflare.com/api/resources/workers/subresources/domains/methods/list/)
accepts legacy Workers Scripts Read/Write. A `service` filter does not convert
that operation into a Worker-scoped authorization check. Do not request account-wide
permissions merely to use it. The legacy changeset endpoint is also excluded.

Safety is structural: only version upload and version activation are used. There
is no `wrangler deploy`, `wrangler triggers deploy`, domain mutation, DNS request,
or account-wide discovery in the production job. Exact source targets are pinned,
authenticated Worker metadata is validated, concurrent changes block activation,
and live routing is verified against revision identifiers rather than HTTP 200.
Malformed responses, unknown or split deployments, wrong uploaded identity/tag,
permission failures, routing mismatches and missing snapshots all fail closed.

This protocol does not enumerate administrative domain ownership or claim to
compare DNS records. It preserves them by never invoking their mutation paths.
Explicit domain/infrastructure work must be handled separately; normal code
releases must not add, remove, transfer, overwrite or reprovision existing routes.
The known apex/www bindings, TLS and DNS remain in place. No resources are recreated.

## Local development and read-only checks

```sh
npm ci
npm run dev
npm run test:all
npx wrangler versions upload --dry-run --no-x-provision
EXPECTED_COMMIT=$(git rev-parse HEAD) npm run verify:production
```

`npm run deploy` deliberately refuses publication, following CFLab. Local Wrangler
is for preview/dry-run, not releases. Preview uses `--host localhost` so Wrangler
does not derive a production host and rewrite redirects into a local loop.
`dist/version.json` records `GITHUB_SHA` in Actions, HEAD for local builds, and
`uncommitted` for the original pre-commit preview.

## Operations

- **403 / code 10000:** inspect the failed endpoint and its accepted permission
  types. An account-wide endpoint may reject a valid granular credential. Confirm
  authentication at the Worker settings endpoint before diagnosing the secret.
- **400 / code 9106:** token not recognized. Check secure credential presentation;
  a token ID is not its secret value. Never print it or fall back to local OAuth.
- **Concurrent change:** inspect the active deployment and public revisions. Do
  not overwrite a changed baseline to force activation; start a fresh reviewed run.
- **Wrong UUID/tag:** inspect the upload log and Git SHA; never activate a guessed
  or previously uploaded version. Logs report sanitized provider codes/messages.
- **Public revision mismatch:** inspect the active deployment, assets and domain
  routing. Do not declare the release successful until the exact commit is served.
- **Rollback:** revert the bad change and push through the same pipeline. Never
  force-push/reset main. A direct Cloudflare recovery operation needs explicit
  authorization and must be recorded and reconciled with Git afterward.

HTML uses `Cache-Control: no-transform` to prevent automatic analytics injection.
This is response-scoped; unrelated account/zone settings are untouched.

## Email and form resources

These resources are provisioned once, outside the Git release. Normal deployments
only upload code and the declared `send_email` and `ratelimits` bindings; they do
not create mailboxes, DNS records, widgets, or secrets.

### Incoming: Email Routing

- Zone `turkeyvulturesoftware.com` is enabled (`status: ready`).
- Destination `hmarquardt@gmail.com` is verified at account level.
- Literal rule `Hank forwarding`: `hank@turkeyvulturesoftware.com` → forward to
  `hmarquardt@gmail.com` (ID `f6491f49c9124c5191eb71390a17f368`).
- Literal rule `Contact forwarding`: `contact@turkeyvulturesoftware.com` → forward
  to `hmarquardt@gmail.com` (ID `ffe28b0003504c9e82aac7bafc2f9d51`).
- Catch-all is disabled (`drop`).
- Cloudflare added apex MX (`route1/2/3.mx.cloudflare.net`), SPF
  `v=spf1 include:_spf.mx.cloudflare.net ~all`, and DKIM at
  `cf2024-1._domainkey`. No prior MX or SPF existed, so no policy was merged or
  duplicated.

### Outgoing: Email Sending

- Email Sending is enabled for `turkeyvulturesoftware.com` (tag
  `525e02c1905243e187a932f51f7aa95d`).
- DKIM selector `cf-bounce`; return path `cf-bounce.turkeyvulturesoftware.com`.
- Cloudflare added `cf-bounce` MX, SPF, and DKIM, plus DMARC
  `v=DMARC1; p=reject;`.
- `wrangler.json` declares `SEND_EMAIL` with the fixed destination
  `hmarquardt@gmail.com` and sender allowlist
  `contact@turkeyvulturesoftware.com`.
- `CONTACT_RATE_LIMIT` uses namespace `4302` (5 requests per 60 seconds).
- `TURNSTILE_SECRET` is a Worker secret, not repository configuration. Provision it
  once with:
  `npx wrangler secret put TURNSTILE_SECRET --name turkey-vulture-software`.
  This is not a code release; it must not be added to CI or committed.

The public Turnstile site key is in `src/pages.mjs`. The widget
`turkeyvulture-contact` allows the apex, `www`, the workers.dev hostname, and local
development hosts. Do not reuse the AI Small Business Guru widget.

### Verification and troubleshooting

```sh
npx wrangler email routing settings turkeyvulturesoftware.com
npx wrangler email routing rules list turkeyvulturesoftware.com
npx wrangler email routing addresses list
npx wrangler email sending settings turkeyvulturesoftware.com
dig +short MX turkeyvulturesoftware.com @1.1.1.1
dig +short TXT turkeyvulturesoftware.com @1.1.1.1
dig +short TXT cf-bounce._domainkey.turkeyvulturesoftware.com @1.1.1.1
dig +short TXT _dmarc.turkeyvulturesoftware.com @1.1.1.1
```

Retained routing and sending events are available through the GraphQL Analytics
API datasets `emailRoutingAdaptive` and `emailSendingAdaptive` (zone-level, last 31
days). On October 20, 2026, Cloudflare reported both routing tests as
`status: delivered`, `action: forward`, with SPF, DKIM, and DMARC passing and
distinct `to` addresses. Cloudflare Email Sending reported the outbound copies as
delivered. This is provider delivery evidence; it does not read the Gmail mailbox.

- **No forwarding:** confirm the destination is verified, the literal rule is
  enabled, catch-all remains disabled, and MX/SPF/DKIM records resolve.
- **Form returns 503:** inspect `TURNSTILE_SECRET`, the `CONTACT_RATE_LIMIT`
  binding, and the Worker version bindings.
- **Form returns 403:** the Turnstile token may be expired, replayed, from another
  hostname/action, or the client IP may be missing. Refresh and retry.
- **Form returns 502:** Cloudflare Email Sending rejected or failed the message.
  `wrangler tail` records only `contact_send_failed` with a request ID and provider
  code, never inquiry content. Check sending domain status and suppression lists.
- **Rate limit:** 5 per 60 seconds per client IP and Cloudflare location; the error
  includes the direct email fallback.

## History and compatibility findings

The initial two deployments on October 20, 2026 were manual bootstrap operations,
using a local OAuth login while Actions validated but skipped deployment. Initial
commit: `ffc3558e8c62305cd626be7b16ab9ba7731dd7eb`; hardened bootstrap revision:
`f8c9856674a0aa76b253bfdd3dea5e718c68499f`. They are historical setup, not the normal
release process. The first created the Worker; exact apex/www bindings were then
attached only after a conflict-free changeset, with overwrite flags disabled.

The first diagnostic failures were **400 / 9106**, including a Worker-specific
metadata read, with an ID-shaped value stored in Actions. That credential
presentation issue was distinct from the later granular compatibility failure.

[Run 39475119140, attempt 2](https://github.com/hmarquardt/turkeyvulturesoftware/actions/runs/39475119140/attempts/2)
failed with **403 / 10000, `Authentication error`**, at
`GET /accounts/{account}/workers/domains?service=turkey-vulture-software`.
The account-wide domain gate was incompatible with the dedicated granular token.
The correction uses the supported Worker-specific reads and version-only safety
protocol above; no broader token permissions are required or requested.

A release is verified only when both Actions jobs pass and production's revision
matches that workflow's `headSha`.
