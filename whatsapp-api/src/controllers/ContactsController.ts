import { Controller, Get, Query, Route, Tags, Security, Res, type TsoaResponse } from 'tsoa';
import { whatsAppService } from '../services/WhatsAppService';
import type {
  ContactsResponse,
  PhoneCheckResponse,
  PhoneCheckResult,
  BadRequestError,
  ServiceUnavailableError,
} from '../types';

/**
 * WhatsApp contact list.
 */
@Route('contacts')
@Tags('Contacts')
@Security('bearerAuth')
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
}
