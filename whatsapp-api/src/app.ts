import express, { type Request, type Response, type NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { config } from './config';
import { whatsAppService } from './services/WhatsAppService';

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

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // ── Swagger UI (public — no auth) ──────────────────────────────────────
  app.get('/docs/spec.json', (_req: Request, res: Response) => res.json(swaggerDocument));
  app.use(
    '/docs',
    swaggerUi.serve,
    swaggerUi.setup(swaggerDocument, { customSiteTitle: 'WhatsApp Neo API Docs' }),
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

    // Manual token check (mirrors tsoa's expressAuthentication).
    // Uses the custom X-Api-Token header so it never conflicts with NPM Basic Auth.
    const token = req.headers['x-api-token'];
    if (!token || typeof token !== 'string') {
      return res.status(401).json({ error: 'Unauthorized — set X-Api-Token header.' });
    }
    if (token !== config.API_TOKEN) {
      return res.status(403).json({ error: 'Forbidden — invalid API token.' });
    }

    const qrDataURL = whatsAppService.qrDataURL;
    if (!qrDataURL) {
      return res.status(409).json({
        error: 'QR code not available',
        hint: `Current status is '${whatsAppService.status}'. QR is only present during 'qr_ready'.`,
      });
    }

    const base64 = qrDataURL.replace(/^data:image\/png;base64,/, '');
    const buffer = Buffer.from(base64, 'base64');
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
