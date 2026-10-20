/* Turkey Vulture Software analytics client.
   Collector: the existing CFLab Analytics Worker. This file is self-hosted so
   the site loads no executable third-party script and keeps its CSP narrow.

   Events: `pageview` once per load, `contact_cta_click` from one delegated link
   listener, and `intake_submit` from intake.js only after `/api/contact`
   confirms acceptance.

   Privacy: no cookies, no persistent identifier, no fingerprint, no form or
   page content. The anonymous session ID lives in sessionStorage only and
   rotates after 30 minutes of inactivity. Do Not Track and Global Privacy
   Control suppress every request. Only the pathname (never the query string)
   and supported UTM parameters are read from the URL; the collector reduces the
   referrer to a hostname. Failures are silent and cannot affect the page. */
(function () {
  'use strict';

  var SITE_ID = 'as_5wh58kbCgGxaRewfGznoaC';
  var ENDPOINT = 'https://analytics.aismallbizguru.com/collect';
  var SESSION_KEY = 'turkeyvulture.analytics.session';
  var SESSION_IDLE_MS = 30 * 60 * 1000;
  var ALLOWED_HOSTS = ['turkeyvulturesoftware.com', 'www.turkeyvulturesoftware.com'];
  var DESTINATIONS = ['autopsy', 'project', 'email'];
  var PLACEMENTS = ['navigation', 'footer', 'hero', 'services', 'approach', 'autopsy-band', 'how-we-build', 'page'];
  var INTAKE_KINDS = ['autopsy', 'project'];
  var CATEGORIES = ['unsure', 'website', 'software', 'automation', 'data'];
  var pageviewSent = false;

  function allowedHost() {
    try {
      if (window.__TV_ANALYTICS_TEST__ === true) return true;
      return ALLOWED_HOSTS.indexOf(window.location.hostname.toLowerCase()) !== -1;
    } catch (error) {
      return false;
    }
  }

  function privacyOptOut() {
    try {
      if (navigator.doNotTrack === '1' || window.doNotTrack === '1') return true;
      if (navigator.globalPrivacyControl === true) return true;
    } catch (error) {}
    return false;
  }

  function randomToken(prefix) {
    try {
      var bytes = new Uint8Array(16);
      crypto.getRandomValues(bytes);
      var out = '';
      for (var i = 0; i < bytes.length; i += 1) out += bytes[i].toString(16).padStart(2, '0');
      return prefix + out;
    } catch (error) {
      return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 10);
    }
  }

  function sessionId() {
    try {
      var raw = sessionStorage.getItem(SESSION_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && parsed.id && typeof parsed.at === 'number' && Date.now() - parsed.at < SESSION_IDLE_MS) {
          sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: parsed.id, at: Date.now() }));
          return parsed.id;
        }
      }
      var next = randomToken('s_');
      sessionStorage.setItem(SESSION_KEY, JSON.stringify({ id: next, at: Date.now() }));
      return next;
    } catch (error) {
      return null;
    }
  }

  // Only supported UTM parameters are read from the query string. The collector
  // receives the pathname without any other query value.
  function utm() {
    var out = {};
    try {
      var params = new URLSearchParams(window.location.search || '');
      var keys = ['source', 'medium', 'campaign', 'content', 'term'];
      for (var i = 0; i < keys.length; i += 1) {
        var value = params.get('utm_' + keys[i]);
        if (value) out[keys[i]] = value.slice(0, 200);
      }
    } catch (error) {}
    return out;
  }

  function send(kind, name, props) {
    try {
      if (!allowedHost() || privacyOptOut()) return false;
      var session = sessionId();
      if (!session) return false;
      if (!window.fetch) return false;
      var payload = {
        site: SITE_ID,
        kind: kind,
        name: name,
        path: window.location.pathname,
        session: session,
        event_uid: randomToken('e_'),
        referrer: document.referrer || undefined,
        utm: utm(),
        props: props || undefined
      };
      fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true,
        mode: 'cors',
        credentials: 'omit'
      }).catch(function () {});
      return true;
    } catch (error) {
      return false;
    }
  }

  function pageview() {
    if (pageviewSent) return;
    pageviewSent = true;
    send('pageview', 'pageview');
  }

  function placement(anchor) {
    if (anchor.closest('nav')) return 'navigation';
    if (anchor.closest('footer')) return 'footer';
    if (anchor.closest('.build-hero') || anchor.closest('.build-cta')) return 'how-we-build';
    if (anchor.closest('.autopsy-band')) return 'autopsy-band';
    if (anchor.closest('.hero')) return 'hero';
    if (anchor.closest('#services')) return 'services';
    if (anchor.closest('#approach')) return 'approach';
    return 'page';
  }

  function destination(anchor) {
    var href = anchor.getAttribute('href') || '';
    if (/^mailto:/i.test(href)) return 'email';
    var url;
    try {
      url = new URL(anchor.href, window.location.href);
    } catch (error) {
      return null;
    }
    if (url.origin !== window.location.origin) return null;
    if (url.pathname === '/site-autopsy' || url.pathname === '/site-autopsy/') return 'autopsy';
    if (url.pathname === '/contact' || url.pathname === '/contact/') return 'project';
    return null;
  }

  function contactClick(anchor) {
    try {
      var target = destination(anchor);
      if (!target || DESTINATIONS.indexOf(target) === -1) return false;
      var where = placement(anchor);
      if (PLACEMENTS.indexOf(where) === -1) where = 'page';
      return send('event', 'contact_cta_click', { destination: target, placement: where });
    } catch (error) {
      return false;
    }
  }

  function intakeSubmitted(kind, category) {
    try {
      if (INTAKE_KINDS.indexOf(kind) === -1) return false;
      var props = { kind: kind };
      if (kind === 'project' && CATEGORIES.indexOf(category) !== -1) props.category = category;
      return send('event', 'intake_submit', props);
    } catch (error) {
      return false;
    }
  }

  // One delegated listener covers navigation, footer, page, and form-adjacent
  // contact links without changing their normal behavior.
  document.addEventListener('click', function (event) {
    try {
      var target = event.target;
      var anchor = target && target.closest ? target.closest('a') : null;
      if (anchor) contactClick(anchor);
    } catch (error) {}
  }, true);

  window.turkeyVultureAnalytics = { intakeSubmitted: intakeSubmitted };

  if (document.readyState === 'complete') window.setTimeout(pageview, 0);
  else window.addEventListener('load', pageview, { once: true });
}());
