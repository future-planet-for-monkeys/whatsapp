import type { Request } from 'express';
import { config } from '../config';
import { verifyJWT } from '../services/AuthService';

// ---------------------------------------------------------------------------
// tsoa authentication module.
//
// tsoa calls this function for every route decorated with @Security(...).
// Multiple @Security() decorators on a controller are treated as OR — either
// scheme is sufficient to authenticate.
//
// Supported schemes:
//   1. bearerAuth — X-Api-Token: <API_TOKEN>
//   2. basicAuth  — Authorization: Basic <base64(username:password)>
//   3. jwtAuth    — Authorization: Bearer <JWT>
//
// Using a custom header (X-Api-Token) for bearerAuth means HTTP Basic Auth
// on a reverse-proxy (e.g. Nginx Proxy Manager) and the API token never
// conflict — the proxy handles Authorization: Basic, the app handles
// X-Api-Token.  In contrast, jwtAuth uses the standard Authorization: Bearer
// header because it's the convention every client expects for JWTs.
// ---------------------------------------------------------------------------

export type AuthResult =
  | { authenticated: true }
  | { userId: string; name: string };

export function expressAuthentication(
  request: Request,
  securityName: string,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _scopes?: string[],
): Promise<AuthResult> {
  if (securityName === 'bearerAuth') {
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

  if (securityName === 'basicAuth') {
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — supply Authorization: Basic <base64> header.',
      });
    }

    if (!authHeader.startsWith('Basic ')) {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — Authorization header must use Basic scheme.',
      });
    }

    const base64 = authHeader.slice(6);
    let decoded: string;
    try {
      decoded = Buffer.from(base64, 'base64').toString('utf-8');
    } catch {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — invalid Base64 encoding in Authorization header.',
      });
    }

    const colonIdx = decoded.indexOf(':');
    if (colonIdx === -1) {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — Basic Auth value must be in username:password format.',
      });
    }

    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);

    if (username !== config.BASIC_AUTH_USERNAME || password !== config.BASIC_AUTH_PASSWORD) {
      return Promise.reject({ status: 403, message: 'Forbidden — invalid Basic Auth credentials.' });
    }

    return Promise.resolve({ authenticated: true });
  }

  if (securityName === 'jwtAuth') {
    const authHeader = request.headers['authorization'];

    if (!authHeader || typeof authHeader !== 'string') {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — supply Authorization: Bearer <token> header.',
      });
    }

    if (!authHeader.startsWith('Bearer ')) {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — Authorization header must use Bearer scheme.',
      });
    }

    const token = authHeader.slice(7); // strip "Bearer "

    try {
      const contents = verifyJWT(token);
      // Attach the JWT user info to the request so downstream handlers can
      // access it via `request.user`.
      (request as any).user = contents;
      return Promise.resolve(contents);
    } catch {
      return Promise.reject({
        status: 401,
        message: 'Unauthorized — invalid or expired JWT.',
      });
    }
  }

  return Promise.reject({ status: 401, message: 'Unknown security scheme' });
}
