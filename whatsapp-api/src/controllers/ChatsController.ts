import { Controller, Get, Post, Path, Query, Route, Tags, Security, Res, SuccessResponse, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type { ChatsResponse, MessagesResponse, ServiceUnavailableError, ErrorResponse } from '../types';

/**
 * Chat list and per-chat message history.
 */
@Route('chats')
@Tags('Chats')
@Security('bearerAuth')
@Security('basicAuth')
export class ChatsController extends Controller {
  /**
   * List all WhatsApp chats, ordered by most-recent activity (descending timestamp).
   *
   * Pagination uses an offset-based approach — the backend sorts all chats by
   * timestamp descending first, then slices `limit` items starting at `offset`.
   * `hasMore` is `true` when there are additional chats beyond the current page.
   *
   * @param limit  Maximum number of chats to return (1–200, default 50)
   * @param offset Number of chats to skip (0-based, default 0)
   */
  @Get('')
  async getChats(
    @Query() limit = 50,
    @Query() offset = 0,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<ChatsResponse> {
    const cap = Math.min(Math.max(1, limit), 200);

    try {
      // Use the safe getChats method from the service (now sorted by timestamp desc)
      const chats = await whatsAppService.getChats();

      const total = chats.length;
      const page = chats.slice(offset, offset + cap);
      const hasMore = offset + cap < total;

      const items = page.map((c: any) => ({
        id: c.id._serialized || c.id,
        name: c.name || '',
        isGroup: c.isGroup || false,
        unreadCount: c.unreadCount || 0,
        timestamp: c.timestamp || 0,
        lastMessage: c.lastMessage
          ? {
              body: c.lastMessage.body || '',
              type: c.lastMessage.type || 'chat',
              timestamp: c.lastMessage.timestamp || 0,
              fromMe: c.lastMessage.fromMe || false,
            }
          : null,
      }));

      return { count: items.length, chats: items, hasMore };
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
   * Uses a custom implementation that bypasses the SDK's getChatById() which
   * has serialization issues with certain chat types (LID-based contacts, etc.).
   *
   * Pagination uses a cursor-based approach — pass the `before` parameter with
   * the Unix-epoch timestamp of the oldest message currently displayed to get
   * the next page of older messages. `hasMore` is `true` when more older messages
   * exist beyond the current page.
   *
   * @param chatId WhatsApp chat ID, e.g. `16073041892@c.us` or `123456789@g.us`
   * @param limit  Number of messages to fetch (1–200, default 50)
   * @param before Optional cursor — only return messages older than this Unix-epoch timestamp
   */
  @Get('{chatId}/messages')
  async getChatMessages(
    @Path() chatId: string,
    @Query() limit = 50,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
    @Query() before?: number,
  ): Promise<MessagesResponse> {
    const cap = Math.min(Math.max(1, limit), 200);

    try {
      const { messages, hasMore } = await whatsAppService.getChatMessages(chatId, cap, before);

      return { chatId, count: messages.length, messages, hasMore };
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
   * Mark all messages in a chat as read.
   *
   * Sends a "seen" acknowledgement to WhatsApp for the given chat, clearing
   * the unread badge on the phone and the API.
   *
   * @param chatId WhatsApp chat ID, e.g. `16073041892@c.us` or `123456789@g.us`
   */
  @Post('{chatId}/read')
  @SuccessResponse(200, 'Chat marked as read')
  async markChatRead(
    @Path() chatId: string,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
    @Res() notFound: TsoaResponse<404, ErrorResponse>,
  ): Promise<{ ok: true }> {
    try {
      await whatsAppService.markChatRead(chatId);
      return { ok: true };
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
      // If the error message says "Chat not found", return 404
      if (typedErr.message?.includes('Chat not found')) {
        return notFound(404, { error: typedErr.message });
      }
      throw classified;
    }
  }
}
