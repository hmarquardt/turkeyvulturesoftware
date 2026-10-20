const APEX = 'turkeyvulturesoftware.com';
const CSP = "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self'; font-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'; upgrade-insecure-requests";

export function secure(response, url) {
  const headers = new Headers(response.headers);
  headers.set('Content-Security-Policy', CSP);
  headers.set('X-Content-Type-Options', 'nosniff');
  headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
  if (url.protocol === 'https:') headers.set('Strict-Transport-Security', 'max-age=31536000');
  // Keep the delivered HTML intact: Cloudflare's auto-injected analytics is out of scope.
  if ((headers.get('Content-Type') || '').includes('text/html')) {
    headers.set('Cache-Control', `${headers.get('Cache-Control') || 'public, max-age=0, must-revalidate'}, no-transform`);
  }
  if (url.pathname === '/version.json') headers.set('Cache-Control', 'no-store');
  if (url.hostname.endsWith('.workers.dev')) headers.set('X-Robots-Tag', 'noindex');
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.hostname === `www.${APEX}` || (url.hostname === APEX && url.protocol === 'http:')) {
      url.hostname = APEX;
      url.protocol = 'https:';
      url.port = '';
      return secure(Response.redirect(url.toString(), 308), url);
    }
    if (!['GET', 'HEAD'].includes(request.method)) {
      return secure(new Response('This site does not accept online submissions. Please use the email options on /contact.', {
        status: 405, headers: { 'Allow': 'GET, HEAD', 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
      }), url);
    }
    return secure(await env.ASSETS.fetch(request), url);
  },
};
