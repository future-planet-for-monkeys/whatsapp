/**
 * Entry point — creates the Express app, starts the HTTP server,
 * and kicks off the WhatsApp client initialisation in the background.
 *
 * Separation of concerns:
 *   server.ts  → port binding, process signals, startup sequencing
 *   app.ts     → Express middleware, routes, error handlers
 *   services/  → WhatsApp lifecycle, CDP management, webhook dispatch
 */
import { createApp } from './app';
import { config } from './config';

// ---------------------------------------------------------------------------
// HTTP server
// ---------------------------------------------------------------------------
const app = createApp();

const server = app.listen(config.PORT, () => {
  console.log(`[server] Listening on http://0.0.0.0:${config.PORT}`);
  console.log(`[server] Docs:      http://0.0.0.0:${config.PORT}/docs`);
  console.log(`[server] Auth:      Bearer token (${config.API_TOKEN.length} chars)`);
  console.log(
    `[server] Chromium:  ${config.CHROMIUM_CDP_URL ?? `local Puppeteer (headless=${config.PUPPETEER_HEADLESS})`}`,
  );
  if (config.WEBHOOK_URL) {
    console.log(`[server] Webhook:   ${config.WEBHOOK_URL}`);
  }
});

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------
function shutdown(signal: string): void {
  console.log(`[server] ${signal} received — shutting down gracefully`);
  server.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

// // ---------------------------------------------------------------------------
// // WhatsApp client — starts non-blocking after the HTTP server is listening.
// //
// // initWhatsApp() handles its own retries internally. The only errors that
// // escape are genuine unrecoverable failures (e.g. completely wrong CDP URL)
// // — but even those are caught here so the HTTP server stays alive and
// // /health keeps responding.
// // ---------------------------------------------------------------------------
// whatsAppService.init().catch((err: unknown) => {
//   console.error('[server] WhatsApp init failed (server stays alive):', err);
// });
