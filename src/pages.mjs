export const origin = 'https://turkeyvulturesoftware.com';
export const contactEmail = 'contact@turkeyvulturesoftware.com';
export const hankEmail = 'hank@turkeyvulturesoftware.com';
export const turnstileSiteKey = '0x4AAAAAAFeHtz7R-7fjltLE';
const arrow = '<span aria-hidden="true">↗</span>';
export const mark = `<svg viewBox="0 0 64 40" fill="none" aria-hidden="true"><path d="M3 8C13 9 18 14 26 19L30 16L31 10L36 7L42 9L38 13L37 19C45 15 50 11 61 10L49 23L39 26L33 36L29 26L17 23Z" fill="currentColor"/><circle cx="36" cy="10" r="1" fill="#171917"/></svg>`;
const button = (href, text, secondary = false) => `<a class="button${secondary ? ' button-secondary' : ''}" href="${href}">${text}${arrow}</a>`;
const emailLink = `<a href="mailto:${contactEmail}">${contactEmail}</a>`;

export function layout(page) {
  const path = page.path;
  const escape = value => value.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="theme-color" content="#171917">
<title>${escape(page.title)}</title>
<meta name="description" content="${escape(page.description)}">
${page.noindex ? '<meta name="robots" content="noindex, follow">' : `<link rel="canonical" href="${origin}${path}">`}
<meta property="og:type" content="website">
<meta property="og:site_name" content="Turkey Vulture Software">
<meta property="og:title" content="${escape(page.title)}">
<meta property="og:description" content="${escape(page.description)}">
<meta property="og:url" content="${origin}${path}">
<meta property="og:image" content="${origin}/assets/social.jpg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="Turkey Vulture — Software, Websites &amp; Automation. A red-headed turkey vulture in warm light.">
<meta name="twitter:card" content="summary_large_image">
<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">
<link rel="stylesheet" href="/assets/site.css">
${path === '/' ? '<link rel="preload" as="image" href="/assets/vulture-960.webp" imagesrcset="/assets/vulture-640.webp 640w, /assets/vulture-960.webp 960w, /assets/vulture-1086.webp 1086w" imagesizes="(max-width: 700px) 100vw, 50vw">' : ''}
<script src="/assets/site.js" defer></script>
${page.intake ? '<script src="/assets/intake.js" type="module"></script>' : ''}
</head>
<body${page.intake ? ' class="intake-page"' : ''}>
<a class="skip-link" href="#main">Skip to content</a>
<header class="site-header"><div class="shell header-inner">
<a class="brand" href="/" aria-label="Turkey Vulture Software home">${mark}<span>turkey vulture<span class="brand-descriptor">SOFTWARE, WEBSITES &amp; AUTOMATION</span></span></a>
<button class="menu-toggle" type="button" aria-expanded="false" aria-controls="navigation" hidden>Menu <span aria-hidden="true">+</span></button>
<nav id="navigation" aria-label="Main navigation"><a href="/#services">What we do</a><a href="/#approach">Our approach</a><a class="nav-cta" href="/contact"${path === '/contact' ? ' aria-current="page"' : ''}>Let’s talk ${arrow}</a></nav>
</div></header>
<main id="main" tabindex="-1">${page.content}</main>
<footer class="site-footer"><div class="shell"><div class="footer-top"><a class="footer-wordmark" href="/">turkey vulture<span class="rust">.</span></a><p>Good instincts.<br>Better software.</p></div><div class="footer-bottom"><span>© ${new Date().getUTCFullYear()} Turkey Vulture Software</span><span>Independent by design.</span><div><a href="/contact">Contact</a><a href="mailto:${contactEmail}">Email</a><a href="/privacy"${path === '/privacy' ? ' aria-current="page"' : ''}>Privacy</a></div></div></div></footer>
</body></html>`;
}

const home = {
  path: '/', title: 'Turkey Vulture — Software, Websites & Automation',
  description: 'Website rescue, custom software, AI automation, and data systems. Decades of engineering experience, amplified by AI. Let’s bring your next project to life.',
  content: `
<section class="hero shell" aria-labelledby="hero-heading">
<div class="hero-copy"><p class="eyebrow"><span class="status-dot"></span> NATURE’S CLEANUP CREW. NOW IN TECH.</p>
<h1 id="hero-heading">If your site<br>stinks like <em>death,</em><br>we can help.</h1>
<p class="hero-description">We rescue websites, build custom software, and automate the work slowing you down. Experienced human engineering. Seriously capable AI.</p>
<div class="hero-actions">${button('/site-autopsy', 'Request a Site Autopsy')}${button('/contact', 'Discuss a Project', true)}</div>
<p class="hero-note">Independent software engineering. Less overhead. More possibility.</p></div>
<figure class="hero-art"><picture><source type="image/webp" srcset="/assets/vulture-640.webp 640w, /assets/vulture-960.webp 960w, /assets/vulture-1086.webp 1086w" sizes="(max-width: 700px) 100vw, 50vw"><img src="/assets/vulture-960.webp" alt="A red-headed turkey vulture, wings spread in warm light, perched on a weathered branch." width="1086" height="1448" fetchpriority="high"></picture><span class="art-index" aria-hidden="true">TV / 001</span><figcaption><span>THE ORIGINAL PROBLEM SOLVER</span><span>Cathartes aura <span aria-hidden="true">↗</span></span></figcaption></figure>
</section>
<div class="capability-strip"><div class="shell"><span>WEBSITES THAT WORK</span><span aria-hidden="true">✳</span><span>SOFTWARE THAT FITS</span><span aria-hidden="true">✳</span><span>LESS BUSYWORK</span><span aria-hidden="true">✳</span><span>MORE LIFT</span></div></div>
<section id="services" class="section shell" aria-labelledby="services-heading"><div class="section-intro"><p class="eyebrow dark-eyebrow">01 / WHAT WE DO</p><div><h2 id="services-heading">A little less chaos.<br>A lot more capability.</h2><p>A tired website might be the first symptom. We can help with the systems behind it, too.</p></div></div>
<div class="services-grid">
<article class="service"><div class="service-top"><span class="service-number">01</span><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="5" y="8" width="38" height="30" rx="2"/><path d="M5 16h38M11 12h1m4 0h1m4 0h1M17 24l-5 4 5 4m14-8 5 4-5 4m-5-10-4 13"/></svg></div><h3>Website Rescue<br>&amp; Development</h3><p>Slow, dated, hard to use, or just missing? Let’s build a web presence that earns its keep, from a focused repair to a fresh start.</p><p class="service-detail">Modern websites · Performance · Accessibility</p><a class="text-link" href="/site-autopsy">Give your site a second opinion ${arrow}</a></article>
<article class="service"><div class="service-top"><span class="service-number">02</span><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="6" y="6" width="15" height="15" rx="2"/><rect x="27" y="27" width="15" height="15" rx="2"/><path d="M28 6h14v14M6 28v14h14M28 13h7v7M13 28v7h7"/></svg></div><h3>Custom<br>Software</h3><p>Your business shouldn’t have to contort itself around a tool. Get an application built for how you actually work.</p><p class="service-detail">Business apps · Internal tools · Customer portals</p><a class="text-link" href="/contact?service=software">Build something that fits ${arrow}</a></article>
<article class="service"><div class="service-top"><span class="service-number">03</span><svg viewBox="0 0 48 48" aria-hidden="true"><path d="m27 4-17 24h13l-2 16 17-25H25Z"/></svg></div><h3>AI &amp; Business<br>Automation</h3><p>Connect the tools you already use, take repetitive tasks off your plate, and put AI to work where it makes practical sense.</p><p class="service-detail">AI integration · Workflows · Connected tools</p><a class="text-link" href="/contact?service=automation">Make room for better work ${arrow}</a></article>
<article class="service"><div class="service-top"><span class="service-number">04</span><svg viewBox="0 0 48 48" aria-hidden="true"><ellipse cx="24" cy="10" rx="16" ry="6"/><path d="M8 10v27c0 8 32 8 32 0V10M8 23c0 8 32 8 32 0"/></svg></div><h3>Data &amp; Cloud<br>Systems</h3><p>Get information out of silos and into useful places. We build the connections and infrastructure that keep your business moving.</p><p class="service-detail">APIs · Data pipelines · Lean cloud infrastructure</p><a class="text-link" href="/contact?service=data">Connect the dots ${arrow}</a></article>
</div></section>
<section id="approach" class="approach section" aria-labelledby="approach-heading"><div class="shell approach-layout"><div><p class="eyebrow">02 / THE UNFAIR ADVANTAGE</p><h2 id="approach-heading">Old-school<br>engineering.<br><em>AI-powered</em><br>execution.</h2><p class="approach-aside">The tools have changed.<br>Good judgment still does the heavy lifting.</p></div><div class="approach-copy"><p class="large-copy">Decades of hands-on software engineering experience, amplified by a fundamentally different way of building.</p><p>AI is central to our workflow. It helps us explore options, accelerate implementation, and spend less time on repetitive work. Experienced human judgment sets the direction, reviews the code, and validates the result.</p><p>That means substantial engineering capability without conventional agency overhead. More attention on your problem. Less machinery around the solution.</p><div class="principles"><div><span>01</span><div><h3>Practical beats complicated.</h3><p>The right tool for the job. Maintainable code. Infrastructure that doesn’t need a department.</p></div></div><div><span>02</span><div><h3>Your business. Your software.</h3><p>Clear ownership and handoff agreed up front. No mystery systems designed to keep you dependent.</p></div></div><div><span>03</span><div><h3>Outcomes over output.</h3><p>Working software, tested against the problem it needs to solve. A pile of generated code isn’t the finish line.</p></div></div></div></div></div></section>
<section class="section shell process" aria-labelledby="process-heading"><div class="section-intro"><p class="eyebrow dark-eyebrow">03 / HOW IT WORKS</p><div><h2 id="process-heading">First, we listen.<br>Then, we get useful.</h2><p>No elaborate pitch ritual. Just a straightforward path from what’s wrong to what’s next.</p></div></div><ol class="steps"><li><span>01 / GET THE PICTURE</span><h3>Tell us what’s stuck.</h3><p>A broken site, a manual process, a new idea. You don’t need a technical brief to start a conversation.</p></li><li><span>02 / FIND THE RIGHT FIX</span><h3>Make a sensible plan.</h3><p>We clarify the problem, scope, and tradeoffs. You know what we’re proposing and why before work begins.</p></li><li><span>03 / BUILD &amp; HAND OVER</span><h3>Put it to work.</h3><p>Build, test, refine, and explain. Leave with something useful and a clear understanding of how to keep it that way.</p></li></ol></section>
<section class="autopsy-band"><div class="shell"><div><p class="eyebrow">A SECOND OPINION FOR YOUR WEBSITE</p><h2>Not every website<br>needs a funeral.</h2><p>Tell us where it hurts. We’ll take a human look at your site and discuss what’s worth fixing. No fake scan. No automated scare tactics.</p></div><div class="autopsy-band-action">${button('/site-autopsy', 'Request a Site Autopsy')}<p>Starting something new?<br><a href="/contact">Let’s discuss your project ${arrow}</a></p></div></div></section>`
};

function intake(kind) {
  const autopsy = kind === 'autopsy';
  return {
    path: autopsy ? '/site-autopsy' : '/contact', intake: true,
    title: autopsy ? 'Request a Site Autopsy — Turkey Vulture' : 'Discuss a Project — Turkey Vulture',
    description: autopsy ? 'Request a human website review. Share your URL, what’s wrong, and what you need your website to do. No pretend audit scores.' : 'Tell Turkey Vulture about your website, software, automation, or data project. Start a practical engineering conversation.',
    content: `<section class="shell intake-layout section"><div class="intake-intro"><p class="eyebrow dark-eyebrow">${autopsy ? 'A SECOND OPINION. NO LAST RITES.' : 'GOOD WORK STARTS WITH A CONVERSATION.'}</p><h1>${autopsy ? 'Let’s see<br>what’s <em>salvageable.</em>' : 'What can we<br>bring to <em>life?</em>'}</h1><p class="large-copy">${autopsy ? 'Your website should attract customers. Not scavengers.' : 'A website to rescue. A tool to build. A tedious process to retire.'}</p><p>${autopsy ? 'Share your website and what isn’t working. We’ll take a human look and follow up to discuss the problems, priorities, and possible next steps.' : 'Tell us what you’re trying to accomplish. A rough idea is plenty. We’ll talk through what a practical solution could look like.'}</p><div class="expectation"><h2>${autopsy ? 'What a Site Autopsy means' : 'What happens next'}</h2><p>${autopsy ? 'A request for an initial human review, not an instant technical audit or a security scan. We won’t access private areas or run intrusive tests. Any deeper work and its cost are agreed separately.' : 'We read your message, ask useful questions, and work out whether we can help. Scope, ownership, timing, and cost are discussed before a project starts.'}</p></div><p class="direct-contact">Prefer a direct email?<br>${emailLink}</p></div>
<div class="intake-panel"><div class="panel-heading"><span class="eyebrow dark-eyebrow">${autopsy ? 'SITE AUTOPSY REQUEST' : 'PROJECT INQUIRY'}</span><span aria-hidden="true">↗</span></div>
<div class="email-notice"><strong>Send a request.</strong> This form submits securely to Turkey Vulture. We review every request by hand and reply by email. ${autopsy ? 'A Site Autopsy is a human review, not an automated scan.' : 'No account, database, or mailing list.'}</div>
<noscript><p class="noscript-note">This form needs JavaScript to send. Please email ${emailLink} with ${autopsy ? 'your website URL and what you’d like reviewed' : 'a few details about your project'}.</p></noscript>
<form id="intake-form" data-kind="${kind}" novalidate>
<div class="form-row"><div class="field"><label for="name">Your name <span>(required)</span></label><input type="text" id="name" name="name" autocomplete="name" maxlength="100" required aria-describedby="name-error"><p class="field-error" id="name-error" hidden></p></div><div class="field"><label for="email">Your email <span>(required)</span></label><input id="email" name="email" type="email" autocomplete="email" maxlength="254" required aria-describedby="email-error"><p class="field-error" id="email-error" hidden></p></div></div>
<div class="field"><label for="business">Business name <span>(optional)</span></label><input type="text" id="business" name="business" autocomplete="organization" maxlength="120" aria-describedby="business-error"><p class="field-error" id="business-error" hidden></p></div>
${autopsy ? '' : `<div class="field"><label for="service">What do you have in mind?</label><select id="service" name="service" aria-describedby="service-error"><option value="unsure">Let’s figure it out</option><option value="website">Website rescue or development</option><option value="software">Custom software</option><option value="automation">AI &amp; business automation</option><option value="data">Data &amp; cloud systems</option></select><p class="field-error" id="service-error" hidden></p></div>`}
<div class="field"><label for="url">Website URL <span>(${autopsy ? 'required' : 'optional'})</span></label><input id="url" name="url" type="url" autocomplete="url" placeholder="https://your-business.com" maxlength="500" aria-describedby="url-hint url-error"${autopsy ? ' required' : ''}><span class="field-hint" id="url-hint">A public http:// or https:// address. No passwords or private links.</span><p class="field-error" id="url-error" hidden></p></div>
<div class="field"><label for="description">${autopsy ? 'What’s giving you trouble?' : 'Tell us a little about the project.'} <span>(${autopsy ? 'optional' : 'required'})</span></label><textarea id="description" name="description" rows="4" maxlength="2000"${autopsy ? '' : ' required'} aria-describedby="description-error" placeholder="${autopsy ? 'Slow pages? Outdated content? Customers can’t find what they need?' : 'What do you need to do, and what’s getting in the way?'}"></textarea><p class="field-error" id="description-error" hidden></p></div>
<div class="honeypot" aria-hidden="true"><label for="fax">Fax</label><input id="fax" name="fax" type="text" tabindex="-1" autocomplete="off"></div>
<div class="field"><div class="cf-turnstile" data-sitekey="${turnstileSiteKey}" data-action="contact" data-theme="light"></div><p class="field-error" id="verification-error" tabindex="-1" hidden></p></div>
<p class="form-privacy">Your name, email, optional business name and website, service area, and description are sent to Turkey Vulture through Cloudflare so we can respond. Please leave out sensitive information. <a href="/privacy">How we handle your information</a>.</p>
<button class="button submit-button" type="submit">Send request ${arrow}</button>
<p class="form-status" id="form-status" role="alert" aria-live="polite" tabindex="-1"></p>
<p class="fallback">Prefer email? Write to ${emailLink}.</p>
</form>
<section class="intake-success" id="intake-success" aria-labelledby="success-title" hidden><p class="eyebrow dark-eyebrow">REQUEST RECEIVED</p><h2 id="success-title" tabindex="-1">Your request is on its way.</h2><p>We’ll review it and reply using the email address you provided. ${autopsy ? 'A Site Autopsy is a human review, not an automated scan.' : 'No account, database, or mailing list was created.'}</p><p class="reference">Reference <strong id="reference-id"></strong></p><p class="fallback">Need to add something? Email ${emailLink}.</p></section>
</div></section>`
  };
}
const privacy = {
  path: '/privacy', title: 'Privacy — Turkey Vulture Software',
  description: 'How Turkey Vulture Software handles website visits and project inquiries. No advertising trackers, no form database, and a straightforward email contact process.',
  content: `<article class="shell legal section"><p class="eyebrow dark-eyebrow">THE SMALL PRINT, IN PLAIN ENGLISH</p><h1>Your business<br>is <em>your business.</em></h1><p class="large-copy">Here’s what happens to your information.</p><p class="updated">Effective October 20, 2026</p><h2>Who we are</h2><p>Turkey Vulture Software is an independent software consultancy. For privacy questions or requests, email ${emailLink}.</p><h2>When you visit</h2><p>Cloudflare hosts this website and processes network information, including IP addresses, request details, and security signals, to deliver and protect it. Cloudflare may retain operational and security logs according to its service policies. We do not add advertising trackers, third-party analytics, or application cookies. We do not sell visitor information.</p><h2>When you send a request</h2><p>The Site Autopsy and project forms send your name, email address, optional business name and website, optional service area, and description to our Cloudflare Worker. Cloudflare Turnstile checks whether the request comes from a person rather than a bot. The Worker then sends the request through Cloudflare Email Service to our inbox. We do not store inquiries in a database, create an account, or use the details for advertising.</p><p>Cloudflare processes the request and the email. Our inbox is hosted by Google. Both providers may process data outside your country. This page loads Turnstile only when you interact with a form.</p><h2>When you email us</h2><p>We receive the details you choose to send, such as your name, email address, business, website, and project description. We use them to respond, discuss your request, and manage any work you commission. Our contact mailbox is hosted by Google. Cloudflare and Google may process data outside your country.</p><p>We retain correspondence only as reasonably needed for the inquiry, any resulting work, recordkeeping, and legal obligations. You can ask us to access, correct, or delete your information; legal recordkeeping requirements may limit deletion. An inquiry does not subscribe you to a mailing list.</p><h2>A note about AI</h2><p>AI assists our engineering work. This website does not send inquiry details to an AI service. Before any client material is used with AI tools during a project, we agree on appropriate handling and confidentiality.</p><h2>Keep secrets out of your message</h2><p>Please don’t send passwords, API keys, payment details, health records, or other sensitive information through these forms or ordinary email. We’ll agree on a suitable way to exchange anything sensitive if a project needs it.</p><h2>Website reviews</h2><p>A Site Autopsy request is a request for a human review of a public website. This release does not run an automated audit, security scan, or background crawl.</p><h2>Changes</h2><p>We’ll update this page if our tools or data handling change. The effective date above identifies the current version.</p><p><a class="text-link" href="/contact">Start a conversation ${arrow}</a></p></article>`
};
const notFound = {
  path: '/404', noindex: true, title: 'Page Not Found — Turkey Vulture', description: 'This page has flown the coop. Find your way back to Turkey Vulture Software.',
  content: `<section class="shell section missing"><p class="eyebrow dark-eyebrow">404 / NOTHING TO PICK OVER HERE</p><h1>This page has<br><em>flown the coop.</em></h1><p>The link may be old, or the address may have a typo. There’s plenty of life back on the homepage.</p><div class="hero-actions">${button('/', 'Back to the homepage')}${button('/contact', 'Get in touch', true)}</div></section>`
};
export const pages = [home, intake('autopsy'), intake('project'), privacy, notFound];
