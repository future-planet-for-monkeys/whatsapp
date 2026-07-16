import {
  Controller,
  FormField,
  Post,
  Route,
  Tags,
  Security,
  Res,
  type TsoaResponse,
  SuccessResponse,
  UploadedFile,
} from 'tsoa';
import fs from 'fs';
import path from 'path';
import { whatsAppService, MessageMedia } from '../services/WhatsAppService';
import type { MediaSentResponse, BadRequestError, ServiceUnavailableError } from '../types';

// ---------------------------------------------------------------------------
// Recipient normalisation (mirrors MessagesController)
// ---------------------------------------------------------------------------
function normaliseChatId(raw: string): string {
  if (raw.endsWith('@c.us') || raw.endsWith('@g.us')) return raw;
  const digits = raw.replace(/\D/g, '');
  if (!digits) throw new Error(`Invalid recipient: "${raw}"`);
  return `${digits}@c.us`;
}

/**
 * Send media files (images, PDFs, audio, video, documents) via WhatsApp.
 *
 * File uploads are handled by multer (configured in tsoa.json):
 * - Max file size: 64 MB
 * - Temporary storage: `/tmp/whatsapp-uploads/`
 */
@Route('send-media')
@Tags('Messaging')
@Security('bearerAuth')
@Security('basicAuth')
export class MediaController extends Controller {
  /**
   * Send a media file to a WhatsApp contact or group.
   *
   * Use `multipart/form-data` with the following fields:
   * - `to` — recipient phone number or WhatsApp chat ID (required)
   * - `file` — binary file to send (required, max 64 MB)
   * - `caption` — optional text caption displayed below the media
   *
   * Supported formats: images (JPEG, PNG, GIF, WebP), audio (MP3, OGG, AAC),
   * video (MP4), documents (PDF, DOCX, XLSX, …).
   */
  @Post('')
  @SuccessResponse(201, 'Media sent')
  async sendMedia(
    @FormField() to: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() badRequest: TsoaResponse<400, BadRequestError>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
    @FormField() caption?: string,
  ): Promise<MediaSentResponse> {
    if (!to) {
      if (file?.path) { try { fs.unlinkSync(file.path); } catch { /* ignore */ } }
      return badRequest(400, { error: '`to` field is required.' });
    }

    if (!file) {
      return badRequest(400, { error: '`file` field is required.' });
    }

    let chatId: string;
    try {
      chatId = normaliseChatId(to);
    } catch (e) {
      try { fs.unlinkSync(file.path); } catch { /* ignore */ }
      const msg = e instanceof Error ? e.message : String(e);
      return badRequest(400, { error: msg });
    }

    try {
      const client = whatsAppService.assertReady();

      // whatsapp-web.js requires base64-encoded content + MIME type
      const data = fs.readFileSync(file.path).toString('base64');
      const mimeType = file.mimetype;
      const filename = file.originalname ?? path.basename(file.path);

      const media = new MessageMedia(mimeType, data, filename);
      const result = await client.sendMessage(chatId, media, {
        caption: caption ?? undefined,
      });

      this.setStatus(201);
      return {
        ok: true,
        id: result.id._serialized,
        to: chatId,
        filename,
        mimeType,
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
    } finally {
      // Always clean up the temp file, regardless of success or failure
      if (file?.path) { try { fs.unlinkSync(file.path); } catch { /* ignore */ } }
    }
  }
}
