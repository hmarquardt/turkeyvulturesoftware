// Report only provider error codes/messages. Never log request headers or raw bodies.
export class CloudflareApiError extends Error {
  constructor(status, errors, token) {
    const clean = value => String(value).replaceAll(token, '[REDACTED]').replace(/[\u0000-\u001f\u007f]/g, ' ').slice(0, 500);
    const details = Array.isArray(errors) ? errors.slice(0, 8).map(error => `code ${clean(error?.code ?? 'unknown')}: ${clean(error?.message ?? 'No message')}`).join('; ') : 'No structured error details';
    super(`Cloudflare HTTP ${status}: ${details}`);
    this.status = status;
  }
}

export async function cloudflareRequest(path, { token, fetcher = fetch }) {
  let response;
  try {
    response = await fetcher(`https://api.cloudflare.com/client/v4${path}`, {
      method: 'GET', redirect: 'error', signal: AbortSignal.timeout(20000),
      headers: { Authorization: `Bearer ${token}` },
    });
  } catch {
    throw new Error('Cloudflare request failed or timed out; refusing deployment.');
  }
  let payload;
  try { payload = await response.json(); }
  catch { throw new Error(`Cloudflare HTTP ${response.status}: invalid JSON; refusing deployment.`); }
  if (!response.ok || payload?.success !== true) throw new CloudflareApiError(response.status, payload?.errors, token);
  return payload;
}
