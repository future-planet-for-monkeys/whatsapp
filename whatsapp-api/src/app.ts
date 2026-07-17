import express, { type Request, type Response, type NextFunction } from 'express';
import swaggerUi from 'swagger-ui-express';
import { ValidateError } from 'tsoa';
import { StateError } from './client';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { RegisterRoutes } = require('./generated/routes');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const swaggerDocument = require('./generated/swagger.json') as Record<string, unknown>;

export function createApp(): express.Express {
  const app = express();

  // CORS
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Token');
    if (_req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true }));

  // Liveness probe — public, no auth. Used by the Docker healthcheck so
  // dependent services (e.g. the PWA) only start once the API is actually
  // accepting connections.
  app.get('/health', (_req: Request, res: Response) => {
    res.json({ ok: true, ts: new Date().toISOString() });
  });

  // Swagger UI
  app.get('/docs/spec.json', (req: Request, res: Response) => {
    const origin = `${req.protocol}://${req.get('host')}`;
    res.json({ ...swaggerDocument, servers: [{ url: origin, description: 'This server' }] });
  });
  app.use('/docs', swaggerUi.serve, swaggerUi.setup(undefined, {
    customSiteTitle: 'WhatsApp Neo API Docs',
    swaggerOptions: { url: '/docs/spec.json' },
  }));
  app.get('/', (_req: Request, res: Response) => res.redirect('/docs'));

  // tsoa routes
  RegisterRoutes(app);

  // 404
  app.use((_req: Request, res: Response) => {
    res.status(404).json({ error: 'Not found' });
  });

  // Validation errors
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err instanceof ValidateError) {
      return res.status(422).json({ error: 'Validation failed', details: err.fields });
    }
    if (err instanceof StateError) {
      return res.status(503).json({ error: 'State error', details: { state: err.state, methodName: err.methodName } });
    }
    next(err);
  });

  // Auth errors (tsoa expressAuthentication rejects with plain { status, message })
  app.use((err: unknown, _req: Request, res: Response, next: NextFunction) => {
    if (err && typeof err === 'object' && 'status' in err && 'message' in err && typeof (err as any).status === 'number') {
      return res.status((err as any).status).json({ error: (err as any).message });
    }
    next(err);
  });

  // Generic error handler
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error('[express] Unhandled error:', err);
    res.status(500).json({ error: err instanceof Error ? err.message : 'Internal server error' });
  });

  return app;
}
