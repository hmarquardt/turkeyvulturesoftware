# Search discovery operations

Site: https://turkeyvulturesoftware.com/

## Baseline implemented
- Crawlable public pages and `robots.txt` referencing `/sitemap.xml`.
- Canonical URLs and unique page titles/descriptions in the site source.
- Organization JSON-LD using the site's true name, contact details, and domain.
- CI checks protecting the structured data.

## One-time owner tasks (browser login required)
1. Open https://search.google.com/search-console and add the **Domain property** `turkeyvulturesoftware.com`. Verify ownership using the DNS TXT record supplied by Google. Keep existing Cloudflare MX, SPF, DKIM and DMARC unchanged. Add only the specific verification record shown.
2. Submit `https://turkeyvulturesoftware.com/sitemap.xml` in Search Console and inspect the homepage and service pages with URL Inspection; request indexing when warranted. Indexing is not guaranteed.
3. Open https://www.bing.com/webmasters and add the site (import from Search Console if offered), verify ownership, and submit the same sitemap.
4. Review search performance after enough data accumulates: impressions, query intent, click-through rate, canonical/indexing warnings, and contact conversions. Do not create fake testimonials, review snippets, unsupported local listings, or mass-generated keyword pages.

## Release verification
- Confirm `https://turkeyvulturesoftware.com/robots.txt` returns 200 and references the production sitemap.
- Confirm `https://turkeyvulturesoftware.com/sitemap.xml` returns 200 and lists only indexable public URLs.
- Confirm the homepage has one canonical URL, a descriptive title, a meta description, and parseable `application/ld+json` identifying `Turkey Vulture Software`.
- Confirm canonical `www` redirects and that browser tests, deploy revision check, and existing analytics remain healthy.
- If Google or Bing reports indexing problems, investigate before expanding content.

Do not add third-party tracking scripts, new dependencies, paid SEO tooling, or unverified claims.
