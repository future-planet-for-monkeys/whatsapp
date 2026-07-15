import { Body, Controller, Post, Route, Tags, Security, Res, type TsoaResponse, SuccessResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { SendMessageBody, MessageSentResponse, BadRequestError, ServiceUnavailableError } from '../types';

// ---------------------------------------------------------------------------
// Recipient normalisation
// ---------------------------------------------------------------------------

/**
 * Converts any common phone-number format to the WhatsApp chat ID format:
 *   "+1 (607) 304-1892"  → "16073041892@c.us"
 *   "16073041892"         → "16073041892@c.us"
 *   "16073041892@c.us"    → pass-through
 *   "123456789@g.us"      → pass-through (group)
 */
function normaliseChatId(raw: string): string {
  if (raw.endsWith('@c.us') || raw.endsWith('@g.us')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Error(`Invalid recipient: "${raw}"`);
  return `${digits}@c.us`;
}

/**
 * Send text messages to individuals or groups.
 */
@Route('send')
@Tags('Messaging')
@Security('bearerAuth')
export class MessagesController extends Controller {
  /**
   * Send a plain-text WhatsApp message.
   *
   * The `to` field accepts any common phone number format — the API auto-normalises
   * it to the `<digits>@c.us` format required by WhatsApp:
   * - `"+1 (607) 304-1892"` → `"16073041892@c.us"`
   * - `"16073041892"`        → `"16073041892@c.us"`
   * - `"16073041892@c.us"`   → pass-through
   * - `"123456789@g.us"`     → pass-through (group ID)
   */
  @Post('')
  @SuccessResponse(201, 'Message sent')
  async sendMessage(
    @Body() body: SendMessageBody,
    @Res() badRequest: TsoaResponse<400, BadRequestError>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<MessageSentResponse> {
    const { to, message } = body;

    let chatId: string;
    try {
      chatId = normaliseChatId(to);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return badRequest(400, { error: msg });
    }

    try {
      const client = whatsAppService.assertReady();
      const result = await client.sendMessage(chatId, message);

      this.setStatus(201);
      return {
        ok: true,
        id: result.id._serialized,
        to: chatId,
        timestamp: result.timestamp,
      };
    } catch (outerErr: unknown) {
      let classified: unknown = outerErr;
      try {
        await whatsAppService.handleOperationError(outerErr);
      } catch (e) {
        classified = e;
      }
      const typedErr = classified as { code?: string; message?: string; retryAfterSeconds?: number };
      if (typedErr.code === 'WA_NOT_READY') {
        const retry = typedErr.retryAfterSeconds ?? 10;
        this.setHeader('Retry-After', String(retry));
        return serviceUnavailable(503, {
          error: typedErr.message ?? 'WhatsApp client not ready',
          retryAfterSeconds: retry,
        });
      }
      throw classified;
    }
  }
}
