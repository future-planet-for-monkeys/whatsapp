import { Controller, Get, Post, Body, Path, Query, Route, Tags, Security, Res, SuccessResponse, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type {
  ContactsResponse,
  PhoneCheckResponse,
  PhoneCheckResult,
  SaveContactBody,
  SaveContactResponse,
  BadRequestError,
  ErrorResponse,
  ServiceUnavailableError,
} from '../types';

/**
 * WhatsApp contact list.
 */
@Route('contacts')
@Tags('Contacts')
@Security('bearerAuth')
@Security('basicAuth')
export class ContactsController extends Controller {
  /**
   * List all WhatsApp contacts saved on the connected account.
   *
   * @param limit Maximum contacts to return (1–1000, default 200)
   */
  @Get('')
  async getContacts(
    @Query() limit = 200,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<ContactsResponse> {
    const cap = Math.min(Math.max(1, limit), 1000);

    try {
      const client = whatsAppService.assertReady();
      const contacts = await client.getContacts();

      const items = contacts.slice(0, cap).map((c) => ({
        id: c.id._serialized,
        name: c.name,
        pushname: c.pushname,
        shortName: c.shortName,
        number: c.number,
        isGroup: c.isGroup,
        isWAContact: c.isWAContact,
        isMyContact: c.isMyContact,
      }));

      return { count: items.length, contacts: items };
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
   * Check whether a phone number is registered on WhatsApp.
   *
   * If no country code is detected (stripped input has ≤ 10 digits and no
   * leading `+`), **both** `+1` (US/Canada) and `+52` (Mexico) are tried
   * automatically and all results are returned.
   *
   * Examples of accepted formats:
   * - `+1 (555) 123-4567`  → country code detected, one check
   * - `5551234567`          → 10 digits, no `+` → checks +1 and +52
   * - `526441234567`        → 12 digits → country code detected, one check
   *
   * @param phone Phone number in any format.
   */
  @Get('check')
  async checkPhone(
    @Query() phone: string,
    @Res() badRequest: TsoaResponse<400, BadRequestError>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<PhoneCheckResponse> {
    // ── Normalise input ──────────────────────────────────────────────────────
    const hasPlus = phone.trim().startsWith('+');
    const digits = phone.replace(/\D/g, '');

    if (!digits) {
      return badRequest(400, { error: '`phone` must contain at least one digit.' });
    }

    // Determine candidates to check:
    //   • leading `+` or ≥ 11 digits → assume country code already present
    //   • ≤ 10 digits without `+`    → try both +1 and +52
    const candidates: string[] =
      hasPlus || digits.length >= 11
        ? [digits]
        : [`1${digits}`, `52${digits}`];

    // ── WhatsApp lookups ─────────────────────────────────────────────────────
    try {
      const client = whatsAppService.assertReady();

      const results: PhoneCheckResult[] = await Promise.all(
        candidates.map(async (num) => {
          const registered = await client.isRegisteredUser(`${num}@c.us`);
          return { whatsappId: `${num}@c.us`, registered };
        }),
      );

      const firstRegistered = results.find((r) => r.registered);
      return {
        input: phone,
        results,
        registered: !!firstRegistered,
        whatsappId: firstRegistered?.whatsappId ?? null,
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

  /**
   * Save a new contact to the WhatsApp address book.
   *
   * The `phone` field should be a number with country code (digits only, e.g.
   * `"16073041892"`). The contact will be saved to the WhatsApp cloud and
   * optionally synced to the phone's address book.
   *
   * @param body Contact details
   */
  @Post('')
  @SuccessResponse(201, 'Contact saved')
  async saveContact(
    @Body() body: SaveContactBody,
    @Res() badRequest: TsoaResponse<400, BadRequestError>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<SaveContactResponse> {
    const { phone, firstName, lastName, syncToAddressbook } = body;

    if (!phone || !phone.replace(/\D/g, '')) {
      return badRequest(400, { error: '`phone` must contain at least one digit.' });
    }
    if (!firstName || !firstName.trim()) {
      return badRequest(400, { error: '`firstName` is required.' });
    }

    try {
      const whatsappId = await whatsAppService.saveContact(
        phone,
        firstName.trim(),
        lastName?.trim(),
        syncToAddressbook ?? false,
      );

      this.setStatus(201);
      return {
        ok: true,
        id: whatsappId,
        phone: phone.replace(/\D/g, ''),
        firstName: firstName.trim(),
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

  /**
   * Get the profile picture (avatar) for a WhatsApp contact.
   *
   * Proxies the profile picture from WhatsApp's CDN and returns the raw image
   * bytes. Returns `404` if the contact has no profile picture set.
   *
   * The frontend should call this endpoint lazily per visible row and fall back
   * to showing coloured initials on `404` or network error.
   *
   * @param contactId WhatsApp contact ID, e.g. `16073041892@c.us`
   */
  @Get('{contactId}/avatar')
  async getAvatar(
    @Path() contactId: string,
    @Res() notFound: TsoaResponse<404, ErrorResponse>,
    @Res() serviceUnavailable: TsoaResponse<503, ServiceUnavailableError>,
  ): Promise<Buffer | void> {
    try {
      const avatarUrl = await whatsAppService.getAvatar(contactId);

      if (!avatarUrl) {
        return notFound(404, { error: 'No profile picture set for this contact.' });
      }

      // Fetch the avatar image from WhatsApp's CDN and proxy it back
      const response = await fetch(avatarUrl);
      if (!response.ok) {
        return notFound(404, { error: 'Failed to fetch profile picture.' });
      }

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      // Determine content type from the URL or response
      const contentType = response.headers.get('content-type') || 'image/jpeg';
      this.setHeader('Content-Type', contentType);
      this.setHeader('Content-Length', buffer.length);
      // Cache for 1 hour — avatars rarely change mid-session
      this.setHeader('Cache-Control', 'private, max-age=3600');
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
      throw classified;
    }
  }
}
