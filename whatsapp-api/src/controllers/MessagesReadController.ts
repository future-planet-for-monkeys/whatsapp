import { Controller, Get, Path, Route, Tags, Security, Res, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { ErrorResponse, ServiceUnavailableError } from '../types';

/**
 * Read-only message operations — media download, message details, etc.
 */
@Route('messages')
@Tags('Messaging')
@Security('bearerAuth')
@Security('basicAuth')
export class MessagesReadController extends Controller {
  /**
   * Download media attached to a message.
   *
   * Returns the raw binary media file with the correct `Content-Type` header.
   * The response is a binary stream (not JSON). Use the `mimeType` and `filename`
   * fields from the parent message (returned by `GET /chats/{chatId}/messages`)
   * to determine how to render the bubble before fetching the binary.
   *
   * Returns `404` if the message has no media, or `404` if the message is not found.
   *
   * @param messageId Serialised message ID (e.g. `true_16073041892@c.us_ABCDEF12345_out`)
   */
  @Get('{messageId}/media')
  async getMedia(
    @Path() messageId: string,
    @Res() notFound: TsoaResponse<404, ErrorResponse>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<Buffer | void> {
    try {
      const media = await whatsAppService.downloadMedia(messageId);

      if (!media) {
        return notFound(404, { error: 'No media found for this message.' });
      }

      const buffer = Buffer.from(media.data, 'base64');
      this.setHeader('Content-Type', media.mimeType);
      this.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);
      this.setHeader('Content-Length', buffer.length);
      return buffer;
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
      if (typedErr.message?.includes('Message not found')) {
        return notFound(404, { error: typedErr.message });
      }
      throw classified;
    }
  }
}