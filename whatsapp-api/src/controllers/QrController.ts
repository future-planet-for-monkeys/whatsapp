import { Controller, Get, Query, Route, Tags, Security, Res, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { QrJsonResponse, ErrorResponse } from '../types';

interface QrUnavailableError extends ErrorResponse {
  hint: string;
}

/**
 * QR code endpoint — used to authenticate a new WhatsApp session.
 *
 * Only available while `status` is `qr_ready`.
 * - `?format=json` (default) → `{ qr: "data:image/png;base64,..." }`
 * - `?format=png`            → raw PNG image bytes (Content-Type: image/png)
 */
@Route('qr')
@Tags('System')
@Security('bearerAuth')
@Security('basicAuth')
export class QrController extends Controller {
  /**
   * Get the current WhatsApp QR code.
   *
   * Returns `409` when no QR is available (already authenticated, or client
   * is still initialising — check GET /status first).
   */
  @Get('')
  async getQr(
    /** Output format: `json` returns a base64 data-URL; `png` returns raw image bytes */
    @Query() format: 'png' | 'json' = 'json',
    @Res() unavailable: TsoaResponse<409, QrUnavailableError>,
  ): Promise<QrJsonResponse> {
    const qrDataURL = whatsAppService.qrDataURL;

    if (!qrDataURL) {
      return unavailable(409, {
        error: 'QR code not available',
        hint: `Current status is '${whatsAppService.status}'. QR is only present during 'qr_ready'.`,
      });
    }

    if (format === 'png') {
      // PNG: strip data-URL prefix, send raw bytes as image/png.
      // We set headers on the Controller base-class; tsoa will pass through
      // Buffer return values with the correct Content-Type when skipLibCheck is true.
      const base64 = qrDataURL.replace(/^data:image\/png;base64,/, '');
      this.setHeader('Content-Type', 'image/png');
      // Return the base64 string; app.ts mounts a raw-PNG override before tsoa
      // routes so callers hitting ?format=png get the actual binary response.
      // (See app.ts QR PNG override comment for details.)
    }

    // Default: JSON with base64 data-URL
    return { qr: qrDataURL };
  }
}
