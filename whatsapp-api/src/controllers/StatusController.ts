import { Controller, Get, Route, Tags, Security } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { StatusResponse } from '../types';

/**
 * WhatsApp session status — reports the current lifecycle state of the client.
 */
@Route('status')
@Tags('System')
@Security('bearerAuth')
export class StatusController extends Controller {
  /**
   * Get the current WhatsApp client connection status.
   *
   * Possible states:
   * - `initializing` — client is starting up / connecting to Chromium
   * - `qr_ready` — QR code is available at GET /qr, waiting for phone scan
   * - `authenticated` — credentials accepted, WhatsApp Web stores loading
   * - `ready` — fully operational, API accepts all requests
   * - `disconnected` — connection lost, reconnect scheduled
   * - `auth_failure` — authentication error, manual intervention needed
   *
   * @summary Get WhatsApp client status
   */
  @Get('')
  // Method is named `fetchStatus` (not `getStatus`) to avoid shadowing
  // the inherited tsoa Controller#getStatus() helper that returns number|undefined.
  async fetchStatus(): Promise<StatusResponse> {
    return {
      status: whatsAppService.status,
      qrAvailable: whatsAppService.qrAvailable,
      ready: whatsAppService.ready,
    };
  }
}
