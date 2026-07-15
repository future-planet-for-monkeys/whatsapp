import type { Request } from 'express';
import { config } from '../config';

// ---------------------------------------------------------------------------
// tsoa authentication module.
//
// tsoa calls this function for every route decorated with @Security('bearerAuth').
// It must return a resolved Promise (authenticated) or a rejected Promise with a
// { status, message } object (which tsoa converts to the appropriate HTTP error).
//
// Authentication header
// ─────────────────────────────────────────────────────────────────────────────
// X-Api-Token: <API_TOKEN>
//
// Using a custom header (not Authorization) means HTTP Basic Auth on a
// reverse-proxy (e.g. Nginx Proxy Manager) and the API token never conflict —
// the proxy handles Authorization: Basic, the app handles X-Api-Token.
// ---------------------------------------------------------------------------

export function expressAuthentication(
  request: Request,
  securityName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _scopes?: string[],
): Promise<{ authenticated: true }> {
  if (securityName !== 'bearerAuth') {
    return Promise.reject({ status: 401, message: 'Unknown security scheme' });
  }

  const token = request.headers['x-api-token'];

  if (!token || typeof token !== 'string') {
    return Promise.reject({
      status: 401,
      message: 'Unauthorized — supply your API token in the X-Api-Token header.',
    });
  }

  if (token !== config.API_TOKEN) {
    return Promise.reject({ status: 403, message: 'Forbidden — invalid API token.' });
  }

  return Promise.resolve({ authenticated: true });
}
