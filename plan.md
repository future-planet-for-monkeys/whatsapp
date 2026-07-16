# WhatsApp PWA — Final Plan

---

## 🎯 MASTER PROMPT (feed this to the executing AI agent)

```
You are implementing a WhatsApp PWA client that wraps an existing WhatsApp REST API
(located at whatsapp-api/). Follow this plan exactly, in the order given. Do not skip
steps, do not invent endpoints that aren't listed, and do not guess response shapes —
every type must match whatsapp-api/src/types/index.ts (after the Phase 1 edits below).

STACK (non-negotiable):
- React + TypeScript, strict mode, ZERO use of `any`. Use `unknown` + narrowing if a
  shape is genuinely dynamic.
- TailwindCSS for all styling. Mobile-first: base styles target 320px width, then
  layer md: / lg: breakpoints. No inline styles, no CSS modules, no styled-components.
- Vite as the build tool, with vite-plugin-pwa for manifest + service worker.
- React Router for navigation, TanStack Query for all server state (no manual
  useEffect + useState data fetching), Axios as the HTTP client, Zustand for local
  auth/UI state, react-hot-toast for user-facing errors, date-fns for all date/time
  formatting.

HARD CONSTRAINTS:
1. Every function must have an explicit return type. Every component prop must be an
   explicit interface. No implicit any anywhere (tsconfig noImplicitAny: true).
2. Every API call goes through React Query with explicit loading, error, and empty
   states rendered in the UI — never leave the user looking at a blank screen.
3. Auth is HTTP Basic Auth (username/password), sent as an `Authorization: Basic
   <base64>` header on every request via a single Axios interceptor. On 401/403,
   clear stored credentials and redirect to /login immediately.
4. Avatars are MANDATORY — implement the lazy avatar-loading pattern described in
   Phase 1.6 / Phase 3.3. Do not ship initials-only as the final state.
5. Read receipts / message ack (✓ ✓✓ blue ✓✓) are OUT OF SCOPE. Do not add ack fields,
   checkmark icons, or delivery-status UI anywhere.
6. Pagination must use real backend cursors/offsets (Phase 1.3) — never fetch one
   large batch and paginate client-side. Every paginated list response includes a
   `hasMore: boolean` and the frontend must respect it (stop requesting once false).
7. Backend changes (Phase 1) come FIRST and must be fully working (test with curl or
   Swagger) before any frontend code that depends on them is written.
8. Mirror whatsapp-api/src/types/index.ts field-for-field in the frontend's
   src/api/types.ts. If you change a backend type in Phase 1, update the mirrored
   frontend type in the same work session — they must never drift.
9. Every media type (image, video, audio/ptt, document/PDF, other files) must render
   correctly per the spec in Phase 3.4 — do not leave any media type unhandled or
   showing raw JSON/undefined.

Execute the phases below in order: Phase 1 (backend) → Phase 2 (scaffold) → Phase 3
(frontend behavior, section by section as listed in "Final Execution Order"). After
each phase, verify it works before moving to the next.
```

---

Verified directly against the current backend implementation ([`WhatsAppService.ts`](whatsapp-api/src/services/WhatsAppService.ts:1), all controllers, [`types/index.ts`](whatsapp-api/src/types/index.ts:1), [`auth.ts`](whatsapp-api/src/middleware/auth.ts:1), [`app.ts`](whatsapp-api/src/app.ts:1), [`config.ts`](whatsapp-api/src/config.ts:1), [`docker-compose.yml`](docker-compose.yml:1)). Decisions below are final — no more open questions on avatars, ack, or pagination.

---

## **DECISIONS LOCKED IN**
- ✅ **Avatars are mandatory** — new profile-picture endpoint will be built (not initials-only).
- ❌ **Ack / read-receipts are out of scope** — no checkmarks (✓/✓✓/blue ✓✓) in this version.
- ✅ **Pagination uses the proper backend approach** — real `offset` for chats, real cursor (`before`) for messages. No "fetch one big batch" shortcut.

---

## **STACK**
- **React** + **TypeScript** (`strict: true`, no `any`, `noUncheckedIndexedAccess`, etc.)
- **TailwindCSS**
- **Vite** (build tool + PWA plugin)
- **React Router**, **TanStack Query**, **Axios**, **Zustand**, **react-hot-toast**, **date-fns**

---

## **PHASE 1 — REQUIRED BACKEND CHANGES**

### **1.1 Basic Auth (dual-auth, OR semantics)**

tsoa supports OR-security by stacking multiple `@Security()` decorators on a controller. Plan:

- Add `BASIC_AUTH_USERNAME` / `BASIC_AUTH_PASSWORD` to the zod schema in [`config.ts`](whatsapp-api/src/config.ts:7).
- Extend [`expressAuthentication()`](whatsapp-api/src/middleware/auth.ts:20) to branch on `securityName`:
  - `'bearerAuth'` → existing `X-Api-Token` check (unchanged, backward compatible).
  - `'basicAuth'` → parse `Authorization: Basic <base64>`, decode, compare to `BASIC_AUTH_USERNAME`/`PASSWORD`.
- Add a `basicAuth` entry (`type: "http", scheme: "basic"`) to `tsoa.json` `securityDefinitions` so **Swagger UI's "Authorize" button shows a real username/password prompt** (an `apiKey` scheme would only show a text box, not satisfy "should also work on Swagger" as a login flow).
- Add `@Security('basicAuth')` alongside the existing `@Security('bearerAuth')` on every protected controller (`Chats`, `Contacts`, `Messages`, `Media`, `Qr`, `Status`) — stacked decorators = OR, so either credential works.
- Regenerate routes/swagger: `npm run tsoa`.
- **Manual duplicate check needed**: the [`/qr` PNG-override handler in `app.ts`](whatsapp-api/src/app.ts:44) bypasses tsoa's auth entirely and does its own manual `x-api-token` check — this needs the same Basic Auth branch added manually, or it will silently reject Basic-Auth-only clients requesting the raw PNG.
- `HealthController` stays public (unchanged, by design).
- Swagger UI page itself (`/docs`) stays public — only the "Authorize" button requires credentials to actually call endpoints.

### **1.2 Fix chat sort order (required for "most recent on top")**

In [`WhatsAppService.getChats()`](whatsapp-api/src/services/WhatsAppService.ts:195), sort `results` by `timestamp` descending before returning (currently unsorted, relies on internal collection order which is not guaranteed to be recency-based).

### **1.3 Add pagination support (proper approach — decided)**

- `GET /chats?limit=50&offset=0` — add `offset` query param; slice after the Phase 1.2 sort.
- `GET /chats/{chatId}/messages?limit=50&before=<timestamp>` — add optional cursor param; when present, load/return messages strictly older than `before`. This fits the existing `loadEarlierMsgs()` loop in [`getChatMessages()`](whatsapp-api/src/services/WhatsAppService.ts:438) naturally — keep looping until either `limit` is satisfied or no more history is available.
- Both endpoints' response types gain a `hasMore: boolean` flag so the frontend knows when to stop requesting further pages.

### **1.4 Add "mark as read" endpoint**

`POST /chats/{chatId}/read` — new `page.evaluate()`-based implementation (consistent with the rest of `WhatsAppService`, since the SDK's high-level `chat.sendSeen()` may hit the same serialization issues documented throughout the file) that finds the chat and calls the internal seen-action.

### **1.5 Add media download endpoint**

`GET /messages/{messageId}/media` — new endpoint + service method using the same `WAWebCollections.Msg.get()` / `page.evaluate()` pattern already used in [`sendTextMessage()`](whatsapp-api/src/services/WhatsAppService.ts:276), calling the message's `downloadMedia()` equivalent, returning binary with correct `Content-Type`. Also extend [`MessageItem`](whatsapp-api/src/types/index.ts:68) to include `mimeType?: string` and `filename?: string` when `hasMedia` is true, so the frontend knows how to render the bubble *before* fetching the binary.

### **1.6 Avatars (mandatory — decided)**

Neither [`ChatItem`](whatsapp-api/src/types/index.ts:50) nor [`ContactItem`](whatsapp-api/src/types/index.ts:91) currently exposes a profile-pic URL. Required additions:

- New endpoint: `GET /contacts/{contactId}/avatar` — uses `client.getProfilePicUrl(contactId)` (whatsapp-web.js built-in), proxies/returns the image (redirect or stream), `404` if no picture is set.
- Add `avatarUrl?: string | null` to both `ChatItem` and `ContactItem` — populate by calling `getProfilePicUrl()` per chat/contact server-side, OR (better for performance) omit from the list payload and have the frontend request `GET /contacts/{id}/avatar` lazily per visible row (avoids N blocking calls on every `/chats` fetch).
  - **Recommended implementation**: keep `/chats` and `/contacts` fast (no avatar field, no per-row WA call blocking the list response) and let the frontend request `/contacts/{id}/avatar` lazily as rows scroll into view, with a client-side cache + graceful fallback to initials on `404`/error.
- Frontend: `<Avatar>` component tries the endpoint, falls back to colored initials on failure — never blocks list rendering on avatar load.

### **1.7 Env / config wiring**

- `.env.example` gains `BASIC_AUTH_USERNAME`, `BASIC_AUTH_PASSWORD`.
- No `docker-compose.yml` changes needed — it already uses `env_file: .env`, which loads every variable automatically.

---

## **PHASE 2 — PWA STRUCTURE**

```
whatsapp-pwa/
├── public/icons/
├── src/
│   ├── api/
│   │   ├── client.ts        # Axios instance, Basic Auth header injector
│   │   ├── queries.ts       # React Query hooks (typed)
│   │   └── types.ts         # Mirrors backend types/index.ts exactly
│   ├── components/
│   │   ├── auth/QRScanner.tsx
│   │   ├── chat/{ChatList,ChatListItem,ChatView,MessageBubble,MessageInput,MediaViewer}.tsx
│   │   ├── contacts/{ContactList,NumberInput}.tsx
│   │   └── ui/{Avatar,LoadingSpinner,ErrorBoundary,Toast}.tsx
│   ├── hooks/{useAuth,useMediaUpload,useDebounce}.ts
│   ├── pages/{LoginPage,QRPage,ChatsPage,ChatPage,NewChatPage}.tsx
│   ├── store/authStore.ts   # Zustand
│   ├── utils/{formatters,validators,mediaHelpers}.ts
│   ├── App.tsx / main.tsx / vite-env.d.ts
├── .env.example
├── index.html / package.json / tailwind.config.js / tsconfig.json / vite.config.ts
```

---

## **PHASE 3 — FRONTEND BEHAVIOR SPEC**

### **3.1 Auth Flow**
1. Login form → `Authorization: Basic base64(user:pass)` stored (memory + localStorage).
2. Every request carries that header via an Axios interceptor.
3. `401/403` → clear auth, redirect `/login`.
4. On login success → `GET /status`:
   - `qr_ready` → `/qr`
   - `ready` → `/chats`
   - anything else → poll every 2s with a loading state

### **3.2 QR Page**
- Poll `GET /qr?format=png` every 1s.
- `409` → check `/status`; redirect to `/chats` once `ready`.
- Manual refresh button, mobile-sized image (≤300px).

### **3.3 Chat List**
- `GET /chats?limit=50&offset=0` (after Phase 1.2/1.3 fixes).
- Scroll to bottom + `hasMore === true` → `GET /chats?limit=10&offset=50`, append.
- Each row: `<Avatar>` (lazy-loads `GET /contacts/{id}/avatar`, falls back to initials), name (bold if unread), truncated last message, relative timestamp, unread badge. No ack/checkmark icon (out of scope).

### **3.4 Chat View**
- `GET /chats/{chatId}/messages?limit=50` initial load, oldest→newest render order (already correct server-side).
- Scroll-to-top + `hasMore === true` → `GET /chats/{chatId}/messages?limit=10&before=<oldest.timestamp>`.
- Media rendering driven by `type` + new `mimeType`/`filename` fields (Phase 1.5):
  - `image`/`video` → inline, lightbox/controls
  - `ptt`/`audio` → `<audio>` player
  - `document` (PDF) → "View" opens `GET /messages/{id}/media` in new tab; other docs → download link
- Input: textarea + attach button + send; `POST /send` for text, `POST /send-media` (multipart) for files.
- Calls `POST /chats/{chatId}/read` on open/scroll-to-bottom (Phase 1.4).

### **3.5 New Chat Flow**
- Search bar filters `GET /contacts` client-side.
- Manual number entry → format-as-you-type → "Check WhatsApp" → `GET /contacts/check?phone=...`.
- `response.registered === true` → navigate to `/chat/{response.whatsappId}`; else toast error.

---

## **TYPESCRIPT / QUALITY CONSTRAINTS**
- `strict: true`, `noImplicitAny`, `noUncheckedIndexedAccess`, `noUnusedLocals/Parameters` in `tsconfig.json`.
- All API types in `src/api/types.ts` must mirror [`whatsapp-api/src/types/index.ts`](whatsapp-api/src/types/index.ts:1) exactly, including the Phase 1 additions (`hasMore`, `mimeType`, `filename`, avatar endpoint contract) — no `any`, no guessing shapes.
- Every async call wrapped in React Query with explicit loading/error states.
- Mobile-first Tailwind (`base → md: → lg:`), 44px touch targets, safe-area insets.

---

## **FINAL EXECUTION ORDER**

1. **Backend**
   1. Basic Auth (1.1)
   2. Chat sort fix (1.2)
   3. Pagination — `offset` for chats, `before` cursor for messages, `hasMore` flags (1.3)
   4. Mark-as-read endpoint (1.4)
   5. Media download endpoint (1.5)
   6. Avatar endpoint (1.6)
   7. Env/config wiring (1.7)
2. **PWA scaffold** — Vite + TS strict + Tailwind + PWA plugin
3. **API client + types** — mirror backend types exactly, including all Phase 1 additions
4. **Auth + QR pages**
5. **Chat list** — pagination + lazy avatars
6. **Chat view** — pagination + media rendering + mark-as-read + input
7. **New chat flow**
8. **Polish** — error boundaries, empty states, PWA icons, mobile QA
9. **Containerization** — separate `whatsapp-pwa` container per Phase 4

---

## **PHASE 4 — CONTAINERIZATION (separate container — decided, good idea)**

Running the PWA in its own container is the right call: it decouples release cadence (static frontend deploys are instant, no Puppeteer/Chromium risk), keeps the API image lean, and matches the multi-instance pattern already used by this repo ([`docker-compose.yml`](docker-compose.yml:1), [`MULTI_INSTANCE.md`](MULTI_INSTANCE.md:1)).

### **4.1 Recommended approach — nginx static + reverse-proxy (not a bare static host)**

Do **not** bake the API base URL into the Vite build at build time (`VITE_API_URL` gets frozen into the JS bundle, which breaks the per-instance/multi-port pattern this repo relies on — a rebuild would be needed for every instance/port combo). Instead:

- Build the PWA as static files (`vite build` → `dist/`).
- Serve `dist/` with `nginx:alpine` inside the new container.
- Configure nginx to reverse-proxy `/api/*` (or the API's real paths) to `whatsapp-api:3000` over the internal Docker network — **same pattern already used by [`cdp-proxy`](cdp-proxy.conf:1)**.
- The browser then only ever calls same-origin relative paths (e.g. `fetch('/api/chats')`) — **zero CORS configuration needed**, and zero build-time URL baking. Works identically across every `INSTANCE_NAME`/port combination without rebuilding the image.

### **4.2 New Dockerfile — `whatsapp-pwa/Dockerfile`**

```dockerfile
# Build stage
FROM node:20-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

# Serve stage
FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

### **4.3 New `whatsapp-pwa/nginx.conf`**

```nginx
server {
    listen 80;

    location /api/ {
        proxy_pass http://whatsapp-api:3000/;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location / {
        root /usr/share/nginx/html;
        try_files $uri $uri/ /index.html;  # SPA fallback for React Router
    }
}
```

### **4.4 New `docker-compose.yml` service**

```yaml
  whatsapp-pwa:
    build:
      context: ./whatsapp-pwa
    image: whatsapp-neo-pwa:local
    container_name: ${INSTANCE_NAME:-whatsapp-neo}-pwa
    restart: unless-stopped
    ports:
      - "${PWA_PORT:-3033}:80"
    depends_on:
      - whatsapp-api
    networks:
      - whatsapp-internal   # to reach whatsapp-api:3000 for the nginx proxy_pass
      - proxy               # to be reachable externally, same as the other services
```

Add `PWA_PORT=3033` to `.env.example` alongside the existing `NOVNC_PORT`/`API_PORT` convention, and document it in [`MULTI_INSTANCE.md`](MULTI_INSTANCE.md:1) next to the other per-instance ports.

### **4.5 Axios client adjustment**

Since nginx now proxies `/api/*` same-origin, [`src/api/client.ts`](whatsapp-pwa/src/api/client.ts:1) should use a relative `baseURL: '/api'` in production, with a Vite dev-server proxy (`vite.config.ts` → `server.proxy['/api']`) pointing at `http://localhost:3022` for local development without Docker. This means **one** Axios config works in both environments — no env-var URL juggling.

### **4.6 Dev-mode note**

For local development outside Docker, `npm run dev` (Vite dev server) + the `vite.config.ts` proxy above is sufficient — no need to containerize during active frontend development. The container is a production/deployment concern, matching how `whatsapp-api`'s Dockerfile already coexists with running it locally.

---

## **REMAINING OPEN ITEM**

- **Media upload transport**: confirmed multipart (matches existing `/send-media`) — no ambiguity, no decision needed here.

Everything else that was previously an open question (avatars, ack, pagination strategy, containerization) is now decided and reflected above. Ready to move to implementation.

