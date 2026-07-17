import express, { type Request, type Response, type NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { config } from './config';
import { StateError } from './client';

// tsoa-generated artefacts (created by `npm run tsoa` / `tsoa spec-and-routes`)
// These files do not exist in source control — they are built at image-build
// time (Dockerfile) and during development by `npm run tsoa`.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RegisterRoutes } = require('./generated/routes');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerDocument = require('./generated/swagger.json') as Record<string, unknown>;

// ---------------------------------------------------------------------------
// Factory — creates and fully wires the Express application.
// Separation from server.ts lets us test the app without starting a real server.
// ---------------------------------------------------------------------------
export function createApp(): express.Express {
  const app = express();

  // CORS middleware to allow frontend access
  app.use((req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Token');
    if (req.method === 'OPTIONS') {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Swagger UI (public — no auth) ──────────────────────────────────────
  // The generated swagger.json ships with `servers: [{ url: "/" }]`, which is
  // a relative URL. swagger-ui's OAS3 "Try it out" feature needs an absolute
  // URL to build request URLs (`new URL(...)` throws "Invalid URL" otherwise
  // once you're not on the exact origin the doc was generated for). We
  // rewrite `servers` per-request using the incoming Host header so it always
  // resolves to an absolute, reachable URL — regardless of proxy/port/host.
  app.get('/docs/spec.json', (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({ ...swaggerDocument, servers: [{ url: origin, description: 'This server' }] });
  });
  app.use(
    '/docs',
    swaggerUi.serve,
    // Passing `undefined` (instead of the static swaggerDocument) makes
    // swagger-ui fetch the spec from `/docs/spec.json` at load time, so it
    // always gets the request-accurate absolute server URL above.
    swaggerUi.setup(undefined, {
      customSiteTitle: 'WhatsApp Neo API Docs',
      swaggerOptions: { url: '/docs/spec.json' },
    }),
  );
  // Redirect root → /docs so clicking the morefine dashboard card is useful
  app.get('/', (_req: Request, res: Response) => res.redirect('/docs'));

  // ── QR PNG override — intercepts GET /qr when format != json ──────────
  // tsoa controllers return JSON only. For the raw-PNG case (default, and
  // ?format=png) we handle the request here, before tsoa routes are registered.
  // When format=json, this handler calls next() and tsoa takes over.
  //
  // Why here (before RegisterRoutes)?  Express matches routes in order. By
  // mounting this first, we get first crack at the request. The tsoa-generated
  // route for GET /qr is registered below by RegisterRoutes and will only be
  // reached when this handler calls next().
  app.get('/qr', (req: Request, res: Response, next: NextFunction) => {
    const format = (req.query.format as string | undefined) ?? 'png';
    if (format === 'json') return next(); // let tsoa handle JSON format

    // Manual auth check (mirrors tsoa's expressAuthentication for both schemes).
    // Accepts either:
    //   1. X-Api-Token: <API_TOKEN>
    //   2. Authorization: Basic <base64(username:password)>
    const authHeader = req.headers['authorization'];
    const token = req.headers['x-api-token'];

    const isBasicAuth =
      typeof authHeader === 'string' &&
      authHeader.startsWith('Basic ');

    const isBearerAuth =
      typeof token === 'string' && token !== '';

    if (!isBasicAuth && !isBearerAuth) {
      return res.status(401).json({
        error: 'Unauthorized — supply X-Api-Token header or Authorization: Basic <base64>.',
      });
    }

    let authenticated = false;

    if (isBearerAuth && token === config.API_TOKEN) {
      authenticated = true;
    }

    if (!authenticated && isBasicAuth) {
      const base64 = authHeader!.slice(6);
      let decoded: string;
      try {
        decoded = Buffer.from(base64, 'base64').toString('utf-8');
      } catch {
        return res.status(401).json({ error: 'Unauthorized — invalid Base64 encoding.' });
      }
      const colonIdx = decoded.indexOf(':');
      if (colonIdx !== -1) {
        const username = decoded.slice(0, colonIdx);
        const password = decoded.slice(colonIdx + 1);
        if (username === config.BASIC_AUTH_USERNAME && password === config.BASIC_AUTH_PASSWORD) {
          authenticated = true;
        }
      }
    }

    if (!authenticated) {
      return res.status(403).json({ error: 'Forbidden — invalid credentials.' });
    }

    const qrDataURL = whatsAppService.qrDataURL;
    if (!qrDataURL) {
      // If a browser is requesting via Accept: text/html, serve a status page
      const accept = req.headers.accept ?? '';
      if (accept.includes('text/html')) {
        return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR — Not Available</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111b21; color: #e9edef;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; }
    h1 { font-size: 1.5rem; margin-bottom: 1rem; }
    p { color: #8696a0; margin-bottom: 0.5rem; }
    .status { color: #f15c52; font-weight: 600; }
  </style>
</head>
<body>
  <div class="container">
    <h1>QR Code Not Available</h1>
    <p>Current status: <span class="status">${whatsAppService.status}</span></p>
    <p>The QR code is only shown while the session is in <strong>qr_ready</strong> state.</p>
    <p>Check <a href="/status" style="color:#00a884;">/status</a> for the current state.</p>
  </div>
</body>
</html>`);
      }
      return res.status(409).json({
        error: 'QR code not available',
        hint: `Current status is '${whatsAppService.status}'. QR is only present during 'qr_ready'.`,
      });
    }

    const base64 = qrDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');

    // If a browser is requesting via Accept: text/html, serve an HTML page
    // with the QR code image embedded — makes it easy to scan from any device.
    const accept = req.headers.accept ?? '';
    if (accept.includes('text/html')) {
      return res.status(200).send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>WhatsApp QR — Scan to Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #111b21; color: #e9edef;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
    }
    .container { text-align: center; padding: 2rem; max-width: 420px; }
    h1 { font-size: 1.25rem; margin-bottom: 0.5rem; }
    .subtitle { color: #8696a0; margin-bottom: 1.5rem; font-size: 0.875rem; }
    .qr-wrapper {
      background: #fff; border-radius: 12px; padding: 1.5rem;
      display: inline-block; margin-bottom: 1.5rem;
    }
    .qr-wrapper img { display: block; width: 264px; height: 264px; image-rendering: pixelated; }
    .steps { text-align: left; background: #1f2c33; border-radius: 8px; padding: 1rem; }
    .steps ol { margin: 0; padding-left: 1.25rem; }
    .steps li { margin-bottom: 0.5rem; color: #d1d7db; font-size: 0.875rem; }
    .steps li:last-child { margin-bottom: 0; }
    .refresh { margin-top: 1rem; font-size: 0.75rem; color: #8696a0; }
    .error { color: #f15c52; }
    a { color: #00a884; }
  </style>
  <meta http-equiv="refresh" content="30">
</head>
<body>
  <div class="container">
    <h1>🔐 Scan to Link WhatsApp</h1>
    <p class="subtitle">Use your phone to scan the QR code below</p>
    <div class="qr-wrapper">
      <img src="data:image/png;base64,${base64}" alt="WhatsApp QR Code" />
    </div>
    <div class="steps">
      <ol>
        <li>Open <strong>WhatsApp</strong> on your phone</li>
        <li>Tap <strong>Menu</strong> ⋮ or <strong>Settings</strong> ⚙</li>
        <li>Select <strong>Linked Devices</strong></li>
        <li>Tap <strong>Link a Device</strong></li>
        <li>Point your camera at this QR code</li>
      </ol>
    </div>
    <p class="refresh">Auto-refreshes every 30 seconds</p>
  </div>
</body>
</html>`);
    }

    return res.set('Content-Type', 'image/png').send(buffer);
  });

  // ── tsoa-generated routes (includes auth via expressAuthentication) ────
  RegisterRoutes(app);

  // ── 404 catch-all ──────────────────────────────────────────────────────
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // ── tsoa ValidateError handler ─────────────────────────────────────────
  // Must come BEFORE the generic error handler so tsoa's validation errors
  // are returned as 422 (not 500).
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ValidateError) {
      return res.status(422).json({
        error: 'Validation failed',
        details: err.fields,
      });
    }

     if (err instanceof StateError) {
      return res.status(503).json({
        error: 'State error',
        details: {
          state: err.state,
          methodName: err.methodName,
        },
      });
    }
    next(err);
  });

  // ── tsoa authentication error handler ─────────────────────────────────
  // expressAuthentication() rejects with a plain { status, message } object
  // (not an Error instance). tsoa passes it to next(err) so we must handle
  // it here before the generic 500 handler catches it.
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (
      err !== null &&
      typeof err === 'object' &&
      'status' in err &&
      'message' in err &&
      typeof (err as Record<string, unknown>).status === 'number'
    ) {
      const { status, message } = err as { status: number; message: string };
      return res.status(status).json({ error: message });
    }
    next(err);
  });

  // ── Generic error handler ──────────────────────────────────────────────
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[express] Unhandled error:', err);
    const message = err instanceof Error ? err.message : 'Internal server error';
    res.status(500).json({ error: message });
  });

  return app;
}
