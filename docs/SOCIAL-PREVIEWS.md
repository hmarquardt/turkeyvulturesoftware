# Social previews

## Investigation: November 17, 2026

Baseline production revision: `02f0afd11e3b9a907daa549a3aa840c6fa331ce9`.
The initial homepage HTML already contained all nine existing `og:*` tags and
`twitter:card=summary_large_image`, with one consistent canonical URL at
`https://turkeyvulturesoftware.com/`. It omitted explicit `twitter:title`,
`twitter:description`, `twitter:image`, and `twitter:image:alt` tags.

The old `/assets/social.jpg` was **available**, not missing: HTTP 200,
`image/jpeg`, 130,985 bytes, decoded 1200 × 630 JPEG, identical SHA-256 to the
repository copy. Its composition cropped off the vulture's head. Ordinary,
`Twitterbot/1.0`, `facebookexternalhit/1.1`, and `LinkedInBot/1.0` requests all
received the same initial HTML and valid image, without redirects, authentication,
`X-Robots-Tag` blocking, or a `cf-mitigated: challenge` response. `robots.txt`
allowed all paths. HTTP and www redirected directly to the HTTPS apex; the www
contact redirect preserved path/query. HTML revalidated with `max-age=0` and
`no-transform`; no JavaScript was required for metadata.

**Diagnosis:** confirmed defects were incomplete explicit X metadata, a poor image
crop, and missing regression checks. The reported platform-side absence was not
reproduced at the HTTP layer; these observations do not establish that omission
of explicit X tags caused it. No broken image URL or crawler block was observed
from this network. Platform caches, real crawler IP treatment, and actual X
rendering remain unverified; no platform account or crawler logs were inspected.
No zone security rules, DNS inventory, or account-wide domain inventory were
enumerated or modified. Avoid attributing the symptom to a speculative cause.

## Required contract

- Shared initial HTML head: one title, description and canonical for each indexable
  page; `og:type=website`, `og:site_name`, title, description, URL and image.
- Open Graph title/description match the HTML title/description; `og:url` matches
  the canonical, with the root's trailing slash. Preserve page-specific copy.
- Image: absolute HTTPS production URL, `og:image:type=image/jpeg`, width 1200,
  height 630, meaningful alt text. Active source: `public/assets/social-v2.jpg`.
- X: `twitter:card=summary_large_image`, explicit title, description, image and
  image alt, consistent with Open Graph. Do not invent a social account handle.
- No duplicate/contradictory tags, JavaScript-dependent metadata, authentication,
  challenges, redirect chains, indexing/image blocks, or SVG-only social image.
- Reuse the brand palette, approved copy and artwork. Retain prior image URLs for
  cached shares. Use a new filename when replacing the image, and update provenance.

These requirements follow the [Open Graph protocol](https://ogp.me/) and our
explicit X metadata contract. They apply to future branding, template, routing,
header, cache, asset and deployment changes. Resolve related defects in the same
deployment cycle. Missing public assets, incorrect MIME, a challenge or an HTML
fallback with status 200 can all break a preview even when tags look correct.

## Verification

```sh
npm run check
npm run build
npm test
npx wrangler versions upload --dry-run --no-x-provision
# After the main-push Actions release, against the tested commit:
EXPECTED_COMMIT=$(git rev-parse HEAD) npm run verify:production
# Read-only diagnostics:
curl -sS -D - -A 'Twitterbot/1.0' https://turkeyvulturesoftware.com/
curl -sS -D - -A 'facebookexternalhit/1.1' https://turkeyvulturesoftware.com/robots.txt
curl -sS -D - -A 'Twitterbot/1.0' https://turkeyvulturesoftware.com/assets/social-v2.jpg -o /tmp/tvs-social.jpg
file /tmp/tvs-social.jpg
```

`scripts/social-preview.mjs` is shared by source checks, built-response tests,
and the mandatory production verifier. Source checks inspect every indexable
page and decode its referenced local image. The browser suite checks served
build output through HTTP without executing JavaScript. Node regressions exercise
missing/duplicate/client-rendered tags, contradictions, corrupt bytes, MIME and
size errors, blocking rules, redirects, and challenges.

The production verifier fetches the actual public origin (never `dist/`) as each
representative client, extracts the image URL from initial HTML, downloads and
fully decodes that asset, checks robots and headers, and checks root redirects
and query canonicalization. Existing checks still cover all public pages, 404,
security headers, analytics, www path/query redirects, and revision equality at
apex and workers.dev. Actions must pass validation before uploading or activating;
post-activation verification failure must remain visible. Roll back through a
revert and main push if a release breaks this contract.

## Platform rendering and caching

HTTP accessibility from a spoofed user agent cannot prove behavior from the real
platform crawler or its IP ranges. Inspect a newly composed X post without
publishing it, or use the platform's available preview/debugging interface. Do not
claim X displays the card until observed. Existing posts may retain old metadata.
Try `https://turkeyvulturesoftware.com/?preview=social-v2` for a fresh composition;
the canonical and `og:url` must remain the clean apex URL. A query is a diagnostic
attempt, not a guaranteed cache purge. Facebook and LinkedIn rendering also need
their own platform-side checks if a problem persists.

The revised asset and explicit tags reduce ambiguity, but cannot force any
platform to recrawl or render. Record the release SHA, Actions result, live HTTP
checks, and any actual platform rendering evidence separately.
