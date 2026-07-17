# WhatsApp PWA — MVP Plan

---

## CONTEXT

You are building a WhatsApp PWA on top of a single Express/TSOA controller (`SingleController`) that exposes a REST API under the `/single` route prefix. The backend source is provided as the source of truth for all endpoint signatures, request shapes, and response DTOs. Do not invent endpoints. Do not guess response shapes. Every type on the frontend must be derived from the DTOs in that file.

---

## BACKEND SOURCE OF TRUTH — CURRENT ENDPOINTS

The following endpoints exist right now. Phase 0 adds one and renames one.

| Method | Endpoint | Notes |
|---|---|---|
| GET | `/single/chats/all` | renamed to `/single/chats/list` in Phase 0 |
| GET | `/single/chats/{id}` | |
| GET | `/single/chats/{id}/messages` | |
| GET | `/single/messages/{id}/media` | |
| POST | `/single/messages/send-text` | |
| POST | `/single/messages/{chatId}/send-media` | |
| GET | `/single/client/state` | |
| GET | `/single/avatar/{contactId}` | returns a JSON string (the URL) |
| POST | `/single/contacts/info` | unused in MVP |
| GET | `/single/check` | |
| POST | `/single/chats/{id}/read` | **added in Phase 0** |

All endpoints require HTTP Basic Auth (added in Phase 0).

---

## STACK

- **React + TypeScript** — `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, `noUnusedLocals`, `noUnusedParameters`. Zero use of `any`; use `unknown` + narrowing where a shape is genuinely dynamic.
- **TailwindCSS** — mobile-first, base styles at 320px, then `md:` / `lg:`. No inline styles, no CSS modules, no styled-components.
- **Vite** — build tool, with `vite-plugin-pwa` for manifest + service worker.
- **React Router** — client-side navigation.
- **TanStack Query** — all server state. Every API call goes through a query or mutation with explicit loading, error, and empty states in the UI.
- **Axios** — HTTP client. One instance, one Basic Auth interceptor, one 401/403 handler.
- **Zustand** — auth credentials and any local UI state that must survive navigation.
- **react-hot-toast** — user-facing error and confirmation messages.
- **date-fns** — all date/time formatting.

---

## HARD CONSTRAINTS

1. **Explicit types everywhere.** Every function has an explicit return type. Every component has an explicit props interface. No `any`, no implicit inference on function boundaries.
2. **React Query owns all server state.** No `useEffect` + `useState` for data fetching. Loading, error, and empty states are required for every query.
3. **Auth is HTTP Basic, injected by Axios.** Credentials stored in Zustand (memory) and `localStorage` (persistence). A single request interceptor adds `Authorization: Basic <base64(user:pass)>` to every request. A single response interceptor clears credentials and redirects to `/login` on any 401 or 403.
4. **No real-time transport.** There is no WebSocket or SSE endpoint. All freshness comes from React Query polling at the intervals specified per phase. Do not build a WebSocket or SSE client.
5. **All `/single` URLs require the auth header — the browser will not attach it automatically.** Never put a `/single` URL in `<img src>`, `<audio src>`, `<video src>`, or `window.open()`. Fetch binary through Axios with `responseType: 'blob'`, create an object URL with `URL.createObjectURL`, and revoke it on unmount. The only exception is `ContactInfoDto.avatarUrl`, which is a WhatsApp CDN URL (not a `/single` URL) and can go directly into `<img src>`.
6. **No read receipts / message ack.** No checkmark icons, no ack fields, no delivery-status UI of any kind.
7. **Pagination is offset-based, no `hasMore` flag.** A page is the last page when `response.length < limit`. Message scrollback is capped at 200 total (see Phase 0.5).
8. **Mirror DTOs exactly.** `src/api/types.ts` must match every field of every DTO, including all Phase 0 additions. If Phase 0 changes a backend type, update the frontend mirror in the same session.
9. **`MessageDto.type` is a closed union with an explicit fallback.** Render every known type. Unknown types fall through to an `'unsupported'` bubble. Never render a raw type string or undefined.

---

## PHASE 0 — BACKEND FIXES

Do all of these before writing any frontend code. Verify with the curl checks in 0.12.

### 0.1 — Fix: send endpoints leak the raw SDK object (blocker)

Both `sendMessage` and `sendMedia` do `{ ...messageResult, from: ..., type: ... }`. `messageResult` is a live whatsapp-web.js `Message` instance. TSOA doesn't validate response bodies, so this serializes internal fields (`_data`, `rawData`, `mediaKey`, the client reference) to the wire. The shape doesn't match what `getChatMessages` returns, so optimistic cache inserts produce malformed bubbles.

Fix both endpoints — replace the object literal with:

```ts
return await toMessageDto(client, messageResult, true);
```

### 0.2 — Fix: `downloadMedia` returns JSON instead of bytes (blocker)

`Promise<Buffer>` causes TSOA's generated handler to call `res.json()`. The client receives `{"type":"Buffer","data":[...]}` with `Content-Type: application/json`. The `this.setHeader` calls are ignored because the handler has already written headers.

Replace the entire method with:

```ts
@Get('messages/{id}/media')
@Produces('application/octet-stream')
async downloadMedia(
    @Request() req: ExpressRequest,
    @Path() id: string,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
    @Res() badRequest: TsoaResponse<400, { error: string }>,
): Promise<void> {
    const client = await this.client;
    const message = await client.getMessageById(id);
    if (!message) return notFoundResponse(404, { message: 'Message not found' });
    if (!message.hasMedia) return badRequest(400, { error: 'Message has no media' });
    const media = await message.downloadMedia();
    if (!media) return notFoundResponse(404, { message: 'Media could not be downloaded' });
    const res = (req as ExpressResponse).res!;
    res.setHeader('Content-Type', media.mimetype);
    if (media.filename) {
        res.setHeader('Content-Disposition', `inline; filename="${media.filename}"`);
    }
    res.end(Buffer.from(media.data, 'base64'));
}
```

Use `inline`, not `attachment` — the frontend renders from an object URL in-page.

### 0.3 — Fix: chat list is unsorted (blocker)

`getChats` slices without sorting, so page boundaries are arbitrary and the list order is undefined. Sort descending by `timestamp` before slicing.

Also add `timestamp: number` to `ChatDto` and populate it from `chat.timestamp`, so row timestamps don't depend on `lastMessage` being non-null.

```ts
// Add to ChatDto interface:
timestamp: number;

// Add to toChatDto return:
timestamp: chat.timestamp,

// Replace getChats body:
const chats = await client.getChats();
const sorted = chats
    .filter(chat => includeArchived || !chat.archived)
    .sort((a, b) => b.timestamp - a.timestamp);
return await Promise.all(
    sorted.slice(offset, offset + limit).map(chat => toChatDto(client, chat, false))
);
```

### 0.4 — Fix: list endpoints block on contact+avatar resolutions (performance)

`getChats` and `getChatMessages` pass `resolveImmediately = true`. At 50 rows that's ~100 async resolutions before the response returns, blocking every poll. Pass `false` for list endpoints; keep `true` for single-item endpoints (`getChatById`, `sendMessage`, `sendMedia`, `contacts/info`, `check`).

Consequence: `ContactInfoDto.name` and `avatarUrl` may be `null` on first paint. This is intentional — the frontend must handle null gracefully and the values fill in on subsequent polls or lazy avatar fetches.

### 0.5 — Fix: add scrollback cap

`fetchMessages({ limit: offset + limit })` re-fetches the entire window on every page. Page 4 at limit=50 fetches 200 messages on every request. Reject early:

```ts
if (offset + limit > 200) {
    return badRequest(400, { error: 'Scrollback is limited to 200 messages.' });
}
```

Add the `@Res() badRequest: TsoaResponse<400, { error: string }>` parameter if not already present. The frontend stops paginating at 200 and shows an end-of-history marker.

### 0.6 — Fix: `check` doesn't return the WhatsApp ID

`checkPhone` constructs `whatsappId` (`${num}@c.us`) internally but the response omits it. The frontend needs it to navigate to the new chat. Add it:

```ts
// Update return type:
Promise<{
    phone: string;
    whatsappId: string | null;
    contactInfo: ContactInfoDto | null;
    registered: boolean;
}>

// Update return statement:
return {
    phone,
    whatsappId: match?.whatsappId ?? null,
    contactInfo: match ? await toContactInfoDto(client, match.contactInfo, true) : null,
    registered: match !== undefined,
};
```

### 0.7 — Add: mark-as-read endpoint

Without this, `unreadCount` never clears and the unread badge is permanent.

```ts
@Post('chats/{id}/read')
async markAsRead(
    @Path() id: string,
    @Res() notFoundResponse: TsoaResponse<404, { message: string }>,
): Promise<{ success: boolean }> {
    const client = await this.client;
    const chat = await client.getChatById(id);
    if (!chat) return notFoundResponse(404, { message: 'Chat not found' });
    await chat.sendSeen();
    return { success: true };
}
```

### 0.8 — Fix: `MessageDto.type` is an unsound cast

`message.type as AllowedMessageTypes` silences the compiler but real WhatsApp chats produce `ptt` (voice notes), `sticker`, `revoked`, `location`, `vcard`, `e2e_notification`, and others. The narrow union + bare cast means the frontend's exhaustive type switch compiles but falls through to undefined at runtime for every type not in the list.

Widen the union and narrow safely at the boundary:

```ts
export type AllowedMessageTypes =
    | MessageTypes.TEXT       // 'chat'
    | MessageTypes.IMAGE      // 'image'
    | MessageTypes.VIDEO      // 'video'
    | MessageTypes.AUDIO      // 'audio'
    | MessageTypes.VOICE      // 'ptt' — voice notes, extremely common
    | MessageTypes.DOCUMENT   // 'document'
    | MessageTypes.STICKER    // 'sticker'
    | 'unsupported';

const RENDERABLE = new Set<string>([
    MessageTypes.TEXT, MessageTypes.IMAGE, MessageTypes.VIDEO,
    MessageTypes.AUDIO, MessageTypes.VOICE, MessageTypes.DOCUMENT,
    MessageTypes.STICKER,
]);

function toAllowedType(type: string): AllowedMessageTypes {
    return RENDERABLE.has(type) ? (type as AllowedMessageTypes) : 'unsupported';
}
```

Use `toAllowedType(message.type)` in `toMessageDto` instead of the bare cast.

### 0.9 — Fix: route shadowing

`@Get('chats/all')` and `@Get('chats/{id}')` both match the path `/single/chats/all`. It works today only because declaration order registers `chats/all` first — a rename or reorder silently breaks it. Rename the route to `'chats/list'`. Update all frontend references.

### 0.10 — Fix: `getState()` can return null

`getState()` returns `null` (not only throws) when the Puppeteer page isn't ready. `mapWAStateToClientStatus(null)` currently hits `default` and happens to return `'initializing'` — but this is accidental. Make it deliberate:

```ts
function mapWAStateToClientStatus(state: WAState | null): ClientStatus {
    if (state === null) return 'initializing';
    switch (state) { /* existing cases unchanged */ }
}
```

Also remove `'authenticated'` from the `ClientStatus` union — no branch of the mapper produces it, so it's a dead state the frontend would need to handle for no reason.

### 0.11 — Add: Basic Auth

`@Security` is imported but never applied — the controller is currently open to unauthenticated requests.

- Add `BASIC_AUTH_USERNAME` and `BASIC_AUTH_PASSWORD` to the zod config schema and to `.env.example`. No `docker-compose.yml` change needed (it already uses `env_file: .env`).
- In `expressAuthentication()`, add a branch for `securityName === 'basicAuth'`: parse `Authorization: Basic <base64>`, decode with `Buffer.from(encoded, 'base64').toString()`, split on `:`, compare to env values.
- Add a `basicAuth` security definition to `tsoa.json`: `{ "type": "http", "scheme": "basic" }`. This makes Swagger UI's Authorize button show a username/password prompt.
- Add `@Security('basicAuth')` to the `SingleController` class declaration (applies to all methods).
- Regenerate routes and swagger: `npm run tsoa`.
- Leave `/docs` public.

### 0.12 — Verify before continuing

```bash
# Auth is enforced
curl localhost:PORT/single/chats/list
# → 401

# Auth works, list is sorted newest-first, response is fast
curl -u user:pass 'localhost:PORT/single/chats/list?limit=5'

# Message history
curl -u user:pass 'localhost:PORT/single/chats/CHAT_ID/messages?limit=5'

# Media returns real bytes, not JSON
curl -u user:pass -o out.jpg localhost:PORT/single/messages/MSG_ID/media
file out.jpg
# → "JPEG image data ..." not "ASCII text"

# Send-text returns a proper MessageDto (no _data, no rawData)
curl -u user:pass -X POST localhost:PORT/single/messages/send-text \
     -H 'Content-Type: application/json' \
     -d '{"chatId":"CHAT_ID","message":"test"}'
# → { id: {...}, body: "test", timestamp: ..., from: {...}, hasMedia: false, type: "chat" }

# Mark as read
curl -u user:pass -X POST localhost:PORT/single/chats/CHAT_ID/read
# → { success: true }
```

---

## PHASE 1 — SCAFFOLD

```
whatsapp-pwa/
├── public/
│   └── icons/
├── src/
│   ├── api/
│   │   ├── client.ts        # Axios instance, Basic Auth interceptor, 401 handler
│   │   ├── queries.ts       # All React Query hooks
│   │   └── types.ts         # Mirrors SingleController DTOs exactly (post-Phase 0)
│   ├── components/
│   │   ├── chat/
│   │   │   ├── ChatList.tsx
│   │   │   ├── ChatListItem.tsx
│   │   │   ├── ChatView.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   ├── MediaBubble.tsx
│   │   │   └── MessageInput.tsx
│   │   └── ui/
│   │       ├── Avatar.tsx
│   │       ├── LoadingSpinner.tsx
│   │       └── ErrorBoundary.tsx
│   ├── hooks/
│   │   ├── useAuthedBlob.ts   # Blob fetch + object URL lifecycle
│   │   └── useMediaUpload.ts  # Multipart send-media wrapper
│   ├── pages/
│   │   ├── LoginPage.tsx
│   │   ├── PairPage.tsx
│   │   ├── ChatsPage.tsx
│   │   ├── ChatPage.tsx
│   │   └── NewChatPage.tsx
│   ├── store/
│   │   └── authStore.ts       # Zustand: credentials + clear action
│   ├── utils/
│   │   ├── formatters.ts      # date-fns wrappers, message preview text
│   │   └── validators.ts      # phone input
│   ├── App.tsx
│   ├── main.tsx
│   └── vite-env.d.ts
├── .env.example
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
└── vite.config.ts
```

`tsconfig.json` must include: `"strict": true`, `"noImplicitAny": true`, `"noUncheckedIndexedAccess": true`, `"noUnusedLocals": true`, `"noUnusedParameters": true`.

`vite.config.ts`: proxy `/single` → backend URL from env. This avoids CORS in dev and keeps the base URL identical between dev and prod.

---

## PHASE 2 — API CLIENT + TYPES

### `src/api/types.ts`

Mirror every DTO from `SingleController.ts` post-Phase-0, field for field. No omissions, no additions, no renaming.

```ts
export interface ChatIdDto {
  id: string;
  server: string;
  user: string;
  _serialized: string;
}

export interface ContactInfoDto {
  lid: string | null;
  pn: string | null;
  name: string | null;
  avatarUrl: string | null;
}

export interface MessageIdDto {
  fromMe: boolean;
  remote: string;
  id: string;
  _serialized: string;
}

// Wire values for AllowedMessageTypes — do not import from whatsapp-web.js on the frontend
export type AllowedMessageTypes =
  | 'chat' | 'image' | 'video' | 'audio' | 'ptt'
  | 'document' | 'sticker' | 'unsupported';

export interface MessageDto {
  id: MessageIdDto;
  body: string;
  hasMedia: boolean;
  type: AllowedMessageTypes;
  from: ContactInfoDto;
  timestamp: number; // epoch seconds — multiply by 1000 for Date
}

export interface ChatDto {
  archived: boolean;
  id: ChatIdDto;
  isGroup: boolean;
  name: string;
  unreadCount: number;
  lastMessage: MessageDto | null;
  pinned: boolean;
  timestamp: number; // added in Phase 0.3 — epoch seconds
}

// 'authenticated' is intentionally absent — no backend branch produces it
export type ClientStatus =
  | 'initializing' | 'qr_ready' | 'ready' | 'disconnected' | 'auth_failure';

export interface ClientStateResponse {
  waState: string;
  status: ClientStatus;
  qrAvailable: boolean;
  qrDataURL: string | null;
  ready: boolean;
}

export interface CheckResponse {
  phone: string;
  whatsappId: string | null; // added in Phase 0.6
  contactInfo: ContactInfoDto | null;
  registered: boolean;
}
```

### `src/api/client.ts`

One Axios instance. `baseURL: '/single'` (Vite proxy rewrites to the actual backend in dev).

Request interceptor — inject auth header:
```ts
config.headers['Authorization'] = `Basic ${btoa(`${username}:${password}`)}`;
```

Response interceptor — on 401 or 403: `useAuthStore.getState().clearCredentials()` then `window.location.replace('/login')`.

### `useAuthedBlob(url: string | null)`

```ts
// Returns: { objectUrl: string | null; isLoading: boolean; error: Error | null }
// - When url is null: returns { objectUrl: null, isLoading: false, error: null } immediately.
// - Otherwise: fetches via axios with responseType: 'blob', calls URL.createObjectURL on success.
// - Calls URL.revokeObjectURL on unmount or when url changes.
```

Every `/single/messages/{id}/media` fetch goes through this hook. Never use it for `ContactInfoDto.avatarUrl` (that's a CDN URL, goes straight into `<img src>`).

---

## PHASE 3 — AUTH + PAIRING

### Login page (`/login`)
- Username + password fields.
- On submit: store credentials in Zustand + localStorage, then call `GET /single/client/state`.
- 401 → toast "Invalid credentials", clear credentials, stay on `/login`.
- On success, route by `status`:

| status | action |
|---|---|
| `ready` | navigate to `/chats` |
| `qr_ready` | navigate to `/pair` |
| `initializing` | show spinner, poll every 2s, re-route when status changes |
| `disconnected` | error screen "WhatsApp disconnected" + retry button |
| `auth_failure` | error screen "WhatsApp auth failed" + retry button |

### Pair page (`/pair`)
- Poll `GET /single/client/state` every 2s.
- When `qrAvailable` is true and `qrDataURL` is non-null: render `<img src={qrDataURL}>`. It is a `data:` URL — no auth header needed, constraint 5 does not apply. Max width 300px, centered.
- When `status` becomes `ready`: navigate to `/chats` automatically.
- While `qrDataURL` is null: show "Waiting for WhatsApp...".
- QR codes rotate server-side; the 2s poll picks up the new one without any manual refresh button.

### `<RequireReady>` route guard
Wraps `/chats` and `/chat/:id`. Polls `GET /single/client/state` every 30s. If `ready` becomes false, redirect immediately to `/pair`. Renders children when ready, loading spinner otherwise.

---

## PHASE 4 — CHAT LIST

### Data — `GET /single/chats/list`

TanStack Query infinite query:
- `queryKey: ['chats']`
- `refetchInterval: 5000`
- First page: `limit=50&offset=0`
- Next page: `offset += 50` when `lastPage.length === 50`; no next page when shorter.

Polling is the only freshness mechanism. Do not shorten the interval to compensate for missing push.

### Row — `<ChatListItem>`

Render in order: `<Avatar>`, name (bold when `unreadCount > 0`), last message preview (one line, truncated), relative timestamp, unread badge.

**Timestamp**: `chat.timestamp * 1000` → date-fns formatting: today → `HH:mm`; this week → weekday name; older → `dd/MM/yyyy`.

**Last message preview** — derived from `lastMessage.type`, never a raw type string:

| type | preview |
|---|---|
| `chat` | `lastMessage.body` |
| `image` | 📷 Photo |
| `video` | 🎥 Video |
| `ptt` | 🎤 Voice message |
| `audio` | 🎵 Audio |
| `document` | 📄 Document |
| `sticker` | Sticker |
| `unsupported` | (empty string) |
| `lastMessage` is null | (empty string) |

No checkmarks. No ack status.

### `<Avatar>` — lazy loading

Input: `ContactInfoDto` + `name` string for the initials fallback.

Resolution priority:
1. `avatarUrl` non-null → `<img src={avatarUrl}>` (WhatsApp CDN URL, no auth header needed).
2. `avatarUrl` null and `lid` non-null → fetch `GET /single/avatar/{lid}` lazily when the row enters the viewport (IntersectionObserver). React Query: `queryKey: ['avatar', lid]`, `staleTime: 3_600_000` (1h). The endpoint returns a JSON-encoded string — parse it and use as `<img src>`.
3. `lid` null, 404, or any fetch error → colored initials circle derived from `name`. This is a normal terminal state, not an error. No toast, no retry.

Never block list render on avatar resolution.

### States
- Loading: shimmer skeleton rows.
- Error: "Could not load chats" + retry button.
- Empty: "No chats yet".

---

## PHASE 5 — CHAT VIEW

### Data — `GET /single/chats/{id}/messages`

Standard (non-infinite) query managing scrollback manually:
- Initial load: `limit=50&offset=0`, `refetchInterval: 3000`.
- User scrolls to top + page was full (50 items) → re-fetch with `offset += 50`, prepend results, preserve scroll position.
- Stop when `offset + limit === 200`. Render "Earlier messages aren't available" above the oldest bubble. Do not request beyond 200.
- The 3s poll refreshes only `offset=0` for new inbound messages. Pages at higher offsets are static.

### Mark as read — `POST /single/chats/{id}/read`

Fire on component mount and on scroll-to-bottom. On success, invalidate `['chats']` so the unread badge clears. Fire-and-forget — do not block rendering on the result.

### Bubbles — `<MessageBubble>`

- Right-align when `id.fromMe`, left-align otherwise.
- Timestamp: `message.timestamp * 1000` → date-fns `HH:mm`.
- Date separator line between messages from different calendar days.
- In group chats (`chat.isGroup`): show `from.name` and `<Avatar>` on left-aligned bubbles only.

### Media bubbles — `<MediaBubble>`

All `/single/messages/{id}/media` fetches require the auth header (constraint 5). Use `useAuthedBlob` for every binary type. Trigger the fetch only when the bubble is near the viewport (IntersectionObserver). `staleTime: Infinity` — message media is immutable.

| type | hasMedia | Render |
|---|---|---|
| `chat` | false | Text bubble using `body` |
| `image` | true | Thumbnail in-bubble; tap → full-screen lightbox |
| `sticker` | true | Image, no lightbox, transparent background |
| `video` | true | `<video controls src={objectUrl}>` |
| `ptt` | true | `<audio controls src={objectUrl}>`, compact voice-note bubble |
| `audio` | true | `<audio controls src={objectUrl}>` |
| `document` | true | Filename + Download button. Fetch blob → trigger `<a download href={objectUrl}>` click. Do NOT `window.open(endpointUrl)` — that 401s without the auth header. |
| `unsupported` | any | Muted italic "This message is not supported". No fetch. |
| any type | false | Text bubble using `body` |

Filename: read from the `Content-Disposition` response header; fall back to "Document".

### Input — `<MessageInput>`

- Textarea: auto-grows, max 5 rows.
- Attach button: opens file picker, no MIME restriction.
- Send button: disabled when textarea is empty and no file selected.

Text send → `POST /single/messages/send-text` with `{ chatId, message }`.
File send → `POST /single/messages/{chatId}/send-media` as `multipart/form-data`, field name `file`.

Both: optimistic insert using the returned `MessageDto`. On error, remove the optimistic message and show a toast.

---

## PHASE 6 — NEW CHAT

There is no contact list. New chats can only be opened by phone number.

1. Phone input with format-as-you-type.
2. "Check WhatsApp" button → `GET /single/check?phone={value}`.
3. While loading: disable button, show spinner.
4. Response handling:
   - `registered: true` → show `contactInfo.name ?? contactInfo.pn` as confirmation + "Open chat" button → navigate to `/chat/{whatsappId}`.
   - `registered: false` → toast "This number is not on WhatsApp".
   - HTTP 503 → toast `"WhatsApp is not ready — try again in {retryAfterSeconds}s"`.
5. The backend tries bare numbers as `+1` then `+52`. Show the resolved `contactInfo.pn` before the user confirms, so they know which country code matched.

---

## PHASE 7 — POLISH

- **Error boundaries**: one per route. Catches render errors, shows a "Something went wrong" screen with a reload button.
- **Empty states**: every list and view has an explicit empty state.
- **PWA**: `vite-plugin-pwa` with `manifest.json` (name, icons, theme color, `display: standalone`). Offline shell: app shell loads from cache; API errors while offline show a "You're offline" banner without crashing.
- **Touch targets**: all interactive elements ≥ 44px.
- **Safe-area insets**: `padding-bottom: env(safe-area-inset-bottom)` on the message input; `padding-top: env(safe-area-inset-top)` on the header. Required for iPhone notch and home bar.
- **Mobile QA**: verify at 320px width. No horizontal overflow anywhere.

---

## EXECUTION ORDER

Do not start a phase until the previous one is verified.

1. **Phase 0** — all backend fixes, verified with 0.12 curl checks
2. **Phase 1** — scaffold: Vite project, dependencies, tsconfig, Tailwind, PWA plugin
3. **Phase 2** — API client, types mirror, `useAuthedBlob`
4. **Phase 3** — auth + pairing pages + `<RequireReady>` guard
5. **Phase 4** — chat list + lazy avatars
6. **Phase 5** — chat view + media bubbles + mark-as-read + input
7. **Phase 6** — new chat flow
8. **Phase 7** — polish + mobile QA

---

## KNOWN LIMITATIONS (accepted for MVP)

- **No real-time.** Freshness comes from 5s (chat list) and 3s (chat view) polling. An inbound message appears within that window.
- **Scrollback capped at 200 messages.** The SDK re-fetches the entire window per page; 200 is the cost ceiling.
- **No contact browsing.** New chats require a phone number.
- **`ContactInfoDto.name` and `avatarUrl` may be null on first paint.** Intentional (Phase 0.4). Values fill in on subsequent polls or lazy avatar fetches.
- **No ack/read receipts, reactions, message replies, typing indicators, or delete.**