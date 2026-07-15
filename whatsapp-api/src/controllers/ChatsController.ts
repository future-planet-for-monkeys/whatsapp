import { Controller, Get, Path, Query, Route, Tags, Security, Res, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { ChatsResponse, MessagesResponse, ServiceUnavailableError } from '../types';

/**
 * Chat list and per-chat message history.
 */
@Route('chats')
@Tags('Chats')
@Security('bearerAuth')
export class ChatsController extends Controller {
  /**
   * List all WhatsApp chats, ordered by most-recent activity.
   *
   * @param limit Maximum number of chats to return (1–200, default 50)
   */
  @Get('')
  async getChats(
    @Query() limit = 50,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<ChatsResponse> {
    const cap = Math.min(Math.max(1, limit), 200);

    try {
      const client = whatsAppService.assertReady();
      const chats = await client.getChats();

      const items = chats.slice(0, cap).map((c) => ({
        id: c.id._serialized,
        name: c.name,
        isGroup: c.isGroup,
        unreadCount: c.unreadCount,
        timestamp: c.timestamp,
        lastMessage: c.lastMessage
          ? {
              body: c.lastMessage.body,
              type: c.lastMessage.type,
              timestamp: c.lastMessage.timestamp,
              fromMe: c.lastMessage.fromMe,
            }
          : null,
      }));

      return { count: items.length, chats: items };
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

  /**
   * Fetch message history for a specific chat.
   *
   * @param chatId WhatsApp chat ID, e.g. `16073041892@c.us` or `123456789@g.us`
   * @param limit  Number of messages to fetch (1–200, default 50)
   */
  @Get('{chatId}/messages')
  async getChatMessages(
    @Path() chatId: string,
    @Query() limit = 50,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<MessagesResponse> {
    const cap = Math.min(Math.max(1, limit), 200);

    try {
      const client = whatsAppService.assertReady();
      const chat = await client.getChatById(chatId);
      const messages = await chat.fetchMessages({ limit: cap });

      const items = messages.map((m) => ({
        id: m.id._serialized,
        from: m.from,
        to: m.to,
        body: m.body,
        type: m.type,
        timestamp: m.timestamp,
        fromMe: m.fromMe,
        hasMedia: m.hasMedia,
        author: m.author ?? null,
      }));

      return { chatId, count: items.length, messages: items };
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
