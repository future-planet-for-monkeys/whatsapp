import { Controller, Get, Route, Tags } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { HealthResponse } from '../types';

/**
 * Liveness and readiness probe — no authentication required.
 * Returns HTTP 200 as long as the Node.js process is alive.
 * Inspect the `whatsapp` field for WhatsApp connectivity status.
 */
@Route('health')
@Tags('System')
export class HealthController extends Controller {
  /** Public health check — no Bearer token required */
  @Get('')
  async getHealth(): Promise<HealthResponse> {
    return {
      ok: true,
      whatsapp: whatsAppService.status,
      ts: new Date().toISOString(),
    };
  }
}
