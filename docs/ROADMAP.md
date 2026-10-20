# Roadmap

## v1

Editorial homepage; four service areas; AI-forward engineering positioning; clear
project process; Site Autopsy and project email preparation; privacy and useful
404; responsive/reduced-motion navigation; self-hosted original imagery; metadata,
social card, robots, sitemap, revision endpoint; secure Cloudflare Worker; tested
and documented GitHub Actions validate/deploy/verify pipeline triggered by main pushes.

No automated audit, fake scores, contact database, online submission claim,
client logos, invented case studies, blog, login, billing, portal, or CMS.

## Next priorities

1. Verify unattended deployment by supplying the existing stable account-owned
   Cloudflare token as the repository Actions secret and pushing to main.
2. Establish a project-specific mailbox and verify delivery/reply handling, then
   replace email preparation with protected Worker submission. Keep direct email.
3. Build a narrowly scoped, permission-aware Site Autopsy engine only after the
   manual review offer is validated with real inquiries.

## Site Autopsy engine

Keep the existing intake fields and separate request acceptance from execution.
Define review scope and customer permission, protect against SSRF/private-network
access and redirects, cap runtime and response sizes, rate-limit, and queue work
if warranted. Begin with useful reproducible checks: availability, TLS, metadata,
mobile layout, accessibility signals, performance, and broken public links.
Explain limitations and prioritize actionable findings over an alarming score.
Never imply a security certification or scan private/authenticated content.

## Conversion and service development

With a privacy decision and explicit owner approval, measure actual funnel steps:
CTA choice, intake starts, draft preparation/submission, and qualified leads. Never
collect form contents in analytics. Optimize against real outcomes, not vanity
traffic. Consider permission-based case studies from real delivered work, service
examples with honest labels, and more specific automation/data offers once useful.
No invented client history or performance figures.
