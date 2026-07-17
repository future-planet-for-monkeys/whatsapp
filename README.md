# WhatsApp Neo API

A REST API for WhatsApp built on [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) with a remote Chromium browser instance, plus a PWA front-end. One `docker compose up` starts all four services.

## Architecture

```
┌──────────────┐     ┌──────────────┐     ┌─────────────┐     ┌───────────────┐
│  whatsapp-   │────►│  whatsapp-   │◄───►│  cdp-proxy  │◄───►│  whatsapp-    │
│  pwa (nginx) │     │  api         │     │  (nginx)    │     │  chromium     │
│  React SPA   │     │  (Express)   │     │  CDP tunnel │     │  (Chromium)   │
└──────────────┘     └──────┬───────┘     └─────────────┘     └───────────────┘
                             │
                             ├──► Swagger UI at /docs
                             ├──► Webhook POST on incoming messages
                             └──► Docker volume for session persistence
```

- **[`whatsapp-chromium`](chromium-vnc/Dockerfile)** — A headless Chromium browser with a noVNC web interface so you can visually scan the QR code.
- **[`cdp-proxy`](cdp-proxy.conf)** — An nginx sidecar that proxies Chrome DevTools Protocol, bypassing Chrome's DNS-rebinding protection.
- **[`whatsapp-api`](whatsapp-api/Dockerfile)** — Express + tsoa REST API that drives [`whatsapp-web.js`](https://github.com/pedroslopez/whatsapp-web.js) inside the remote Chromium.
- **[`whatsapp-pwa`](whatsapp-pwa/Dockerfile)** — React/Vite Progressive Web App, built and served by nginx, which reverse-proxies `/single/*` to `whatsapp-api` so the browser only ever talks to one origin.

## Prerequisites

- [Docker](https://docs.docker.com/get-docker/) + [Docker Compose](https://docs.docker.com/compose/install/)
- A spare WhatsApp account (a second phone number or a dual-SIM setup)

## Quick Start

### 1. Configure

Copy the example environment file and edit it:

```bash
cp .env.example .env
```

Minimum required variables in [`.env`](.env.example):

```env
# A unique name for this instance (affects container/volume names)
INSTANCE_NAME=whatsapp-neo2

# Port for the noVNC web interface (browser)
NOVNC_PORT=3008

# Port for the API server
API_PORT=3022
```

Add an **API token** (at least 8 characters):

```env
API_TOKEN=your-secret-token-here
```

### 2. Start the stack

```bash
docker-compose up -d
```

This single command builds and starts four containers:

| Container | Purpose | Access |
|---|---|---|
| `whatsapp-neo2-chromium` | Headless Chromium + noVNC | `http://localhost:3008` |
| `whatsapp-neo2-cdp-proxy` | CDP WebSocket proxy | Internal only |
| `whatsapp-neo2-api` | REST API + Swagger UI | `http://localhost:3022` |
| `whatsapp-neo2-pwa` | PWA front-end (nginx) | `http://localhost:3009` |

The PWA container waits for `whatsapp-api`'s healthcheck to pass before starting, and Chromium/cdp-proxy are wired up first — so a single `docker-compose up -d` brings the whole stack up in the right order with no manual steps.

### 3. Check the health endpoint

```bash
curl http://localhost:3022/health
```

Expected response when starting up:

```json
{ "ok": true, "whatsapp": "initializing", "ts": "2025-01-01T00:00:00.000Z" }
```

The [`/health`](whatsapp-api/src/controllers/HealthController.ts) endpoint is **public** (no authentication required). It always returns `200` as long as the process is alive.

## Logging In (QR Code Authentication)

### Option A: Scan via Docker logs (console)

Watch the container logs for the QR code — it's printed as ASCII art whenever a new QR is generated:

```bash
docker-compose logs -f whatsapp-api
```

When the QR code appears, you'll see output like:

```
[whatsapp] QR code ready — scan with your phone

╔══════════════════════════════════════════════════════════════╗
║           🔐  WHATSAPP QR CODE — SCAN TO LOGIN             ║
╚══════════════════════════════════════════════════════════════╝

          ▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
          █ ▄▄▄▄▄ █▄▀ ▀▄ ▄▀█▄▀█ █▄▀█ ▄▄▄▄▄ █
          █ █   █ █▄▄▄█ ▀▄▄▄▀█▄▄▄█ █ █   █ █
          █ █▄▄▄█ █▀ █▄█▄▀▄▀█▄▄▀  █ █▄▄▄█ █
          █▄▄▄▄▄▄▄█ █ █ █▄▀▄▀▄█▄▀▄█▄▄▄▄▄▄▄█
          █ ▄▄▄ ▄▄▄▄▄▀▄▀▄▀█▄█ ▄▀▄▀▄█▀▄ ▄▀▄█
          █ ▄█▄▄▄▄  ▀▄█▄▀▄▀▄▀▄▀▄ █▄▄█▄▀▄▀▄█
          █▄▀▄█▀▄▄▄▄▄ ▀█▄▀▄▄▀▄▄▀ █▄█▄▀▄▀▄ ██
          █▄ ▄ █▄▄▄█▄█ ▄▄▀▄▄ ▀▄█▄▀▄▄▄▄█▄▀▄▄█
          █▄▀▄▀▄█▄▄▄▀▄  ▀▄▀ ▀▄▀▄▀██▀▄▀▄▀▄▀▄█
          █▄▄▄▄▄▄▄█▀▄▀▄▀▄▀▄▀▄█▄▄▄▄▄▄█▄▄▄▀▄▄█
          ▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀▀

   📱  Open WhatsApp → Linked Devices → Link a Device
   🌐  Or open http://localhost:3022/qr in a browser
```

The QR code is re-printed each time it refreshes (every ~20 seconds). Simply scan it with your phone.

### Option B: Scan via browser (HTML page)

Open the QR code endpoint in your browser — it renders a nicely formatted HTML page with the QR code image and step-by-step instructions:

```
http://localhost:3022/qr
```

The page auto-refreshes every 30 seconds, so you can keep it open while you grab your phone. If the QR code isn't available yet, the page shows the current status and a link to [`/status`](#get-status--session-status).

> **Note**: You still need to supply the `X-Api-Token` header. In a browser, you can use a tool like [ModHeader](https://modheader.com/) or access it via the API (see Option C).

### Option C: Scan via API (curl/CLI)

1. Check the session status:

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/status
```

When the status is `qr_ready`, a QR code is available.

2. Fetch the QR code as a PNG image:

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/qr?format=png -o qr.png
```

Or as a base64 JSON payload:

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/qr?format=json
```

3. Scan the QR code with WhatsApp on your phone.

### Option D: Scan via noVNC (browser GUI)

1. Open `http://localhost:3008` in your browser.
2. You'll see a noVNC window connected to the remote Chromium.
3. Wait for WhatsApp Web to load and display a QR code.
4. Open WhatsApp on your phone → **Linked Devices** → **Link a Device**.
5. Scan the QR code displayed in the noVNC window.
6. The session is persisted in a Docker volume — it survives container restarts.

### Authentication States

| Status | Meaning |
|---|---|
| `initializing` | Client starting up, connecting to Chromium |
| `qr_ready` | QR code available — scan with your phone |
| `authenticated` | Credentials accepted, WhatsApp Web stores still loading |
| `ready` | **Fully operational** — all API endpoints available |
| `disconnected` | Connection lost — auto-reconnect scheduled |
| `auth_failure` | Authentication error — manual intervention needed |

> The client self-heals on disconnects. A watchdog every 60 s ensures reconnection even when no API calls are made.

## Authentication

All endpoints except [`/health`](whatsapp-api/src/controllers/HealthController.ts) require authentication via the **`X-Api-Token`** header:

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/status
```

> The API uses a custom `X-Api-Token` header (not `Authorization: Bearer`) so it never conflicts with HTTP Basic Auth on a reverse proxy.

| Response | Meaning |
|---|---|
| `401` | Missing or empty token |
| `403` | Invalid token |

## API Reference

A full interactive Swagger UI is available at [`http://localhost:3022/docs`](http://localhost:3022/docs) when the server is running. A plain-text API reference is also available at [`whatsapp-api/docs/api.md`](whatsapp-api/docs/api.md). Below is the complete endpoint reference.

### System Endpoints

#### `GET /health` — Liveness probe (public)

No authentication required.

```bash
curl http://localhost:3022/health
```

```json
{
  "ok": true,
  "whatsapp": "ready",
  "ts": "2025-01-01T00:00:00.000Z"
}
```

#### `GET /status` — Session status

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/status
```

```json
{
  "status": "ready",
  "qrAvailable": false,
  "ready": true
}
```

#### `GET /qr` — QR code for authentication

This endpoint has **three output modes**, selected based on the `Accept` header or `format` query parameter:

| Mode | How to trigger | Content-Type | Description |
|---|---|---|---|
| **HTML page** | Browser request (`Accept: text/html`) | `text/html` | Full-page QR display with phone instructions, auto-refreshes every 30 s |
| **PNG image** | `?format=png` or default | `image/png` | Raw QR code image bytes — save to file or embed in an `<img>` tag |
| **JSON** | `?format=json` | `application/json` | `{ "qr": "data:image/png;base64,..." }` |

```bash
# HTML page (open in browser) — requires X-Api-Token header
# Use a browser extension like ModHeader, or curl with -o:
curl -H "X-Api-Token: your-secret-token-here" -H "Accept: text/html" http://localhost:3022/qr -o qr.html

# PNG image (default)
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/qr?format=png -o qr.png

# Base64 JSON
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/qr?format=json
```

- Returns `409` (or a status page in HTML mode) when the QR code is not available — check [`/status`](#get-status--session-status) first.
- The QR is only present while status is `qr_ready`.
- **Console output**: Every time a new QR is generated, it's also printed as ASCII art in the Docker container logs — just run `docker-compose logs -f whatsapp-api` to see it.

### Messaging Endpoints

#### `POST /send` — Send a text message

```bash
curl -X POST http://localhost:3022/send \
  -H "X-Api-Token: your-secret-token-here" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1 (555) 123-4567",
    "message": "Hello from the API! 👋"
  }'
```

**Request body:**

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | ✅ | Phone number in any format, or a WhatsApp chat ID (`16073041892@c.us`) |
| `message` | string | ✅ | Plain-text message body |

**Phone number normalisation** — the `to` field is automatically converted to WhatsApp's chat ID format:

| Input | Normalised |
|---|---|
| `+1 (607) 304-1892` | `16073041892@c.us` |
| `16073041892` | `16073041892@c.us` |
| `16073041892@c.us` | no change (pass-through) |
| `123456789@g.us` | no change (group) |

**Response** (`201 Created`):

```json
{
  "ok": true,
  "id": "true_16073041892@c.us_3EB0C5B1A3D4",
  "to": "16073041892@c.us",
  "timestamp": 1735689600
}
```

#### `POST /send-media` — Send a media file

Send images, PDFs, audio, video, or documents. Uses `multipart/form-data`.

```bash
curl -X POST http://localhost:3022/send-media \
  -H "X-Api-Token: your-secret-token-here" \
  -F "to=+1 (555) 123-4567" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Check this out!"
```

**Form fields:**

| Field | Type | Required | Description |
|---|---|---|---|
| `to` | string | ✅ | Phone number or WhatsApp chat ID |
| `file` | file | ✅ | Binary file (max 64 MB) |
| `caption` | string | ❌ | Optional text caption |

Supported formats: JPEG, PNG, GIF, WebP, MP3, OGG, AAC, MP4, PDF, DOCX, XLSX, and more.

**Response** (`201 Created`):

```json
{
  "ok": true,
  "id": "true_16073041892@c.us_3EB0C5B1A3D4",
  "to": "16073041892@c.us",
  "filename": "image.jpg",
  "mimeType": "image/jpeg",
  "timestamp": 1735689600
}
```

### Chats Endpoints

#### `GET /chats` — List all chats

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/chats?limit=20
```

| Query Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | number | `50` | `200` | Maximum chats to return, ordered by most-recent activity |

```json
{
  "count": 2,
  "chats": [
    {
      "id": "16073041892@c.us",
      "name": "Jane Doe",
      "isGroup": false,
      "unreadCount": 3,
      "timestamp": 1735689600,
      "lastMessage": {
        "body": "See you tomorrow!",
        "type": "chat",
        "timestamp": 1735689600,
        "fromMe": false
      }
    }
  ]
}
```

#### `GET /chats/{chatId}/messages` — Get chat message history

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/chats/16073041892@c.us/messages?limit=30
```

| Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `chatId` | path | — | — | WhatsApp chat ID (e.g. `16073041892@c.us`) |
| `limit` | query | `50` | `200` | Number of messages to fetch |

```json
{
  "chatId": "16073041892@c.us",
  "count": 2,
  "messages": [
    {
      "id": "true_16073041892@c.us_3EB0C5B1A3D4",
      "from": "16073041892@c.us",
      "to": "15551234567@c.us",
      "body": "Hey! How are you?",
      "type": "chat",
      "timestamp": 1735689600,
      "fromMe": false,
      "hasMedia": false,
      "author": null
    }
  ]
}
```

### Contacts Endpoints

#### `GET /contacts` — List all contacts

```bash
curl -H "X-Api-Token: your-secret-token-here" http://localhost:3022/contacts?limit=100
```

| Query Param | Type | Default | Max | Description |
|---|---|---|---|---|
| `limit` | number | `200` | `1000` | Maximum contacts to return |

```json
{
  "count": 2,
  "contacts": [
    {
      "id": "16073041892@c.us",
      "name": "Jane Doe",
      "pushname": "Jane",
      "shortName": "Jane",
      "number": "16073041892",
      "isGroup": false,
      "isWAContact": true,
      "isMyContact": true
    }
  ]
}
```

#### `GET /contacts/check` — Check if a phone number is on WhatsApp

```bash
curl -H "X-Api-Token: your-secret-token-here" "http://localhost:3022/contacts/check?phone=+1%20(555)%20123-4567"
```

```bash
curl -H "X-Api-Token: your-secret-token-here" "http://localhost:3022/contacts/check?phone=5551234567"
```

| Query Param | Type | Required | Description |
|---|---|---|---|
| `phone` | string | ✅ | Phone number in any format |

**Country code detection:**
- If the input starts with `+` or has ≥ 11 digits, the country code is assumed to be present and one check is performed.
- If the input has ≤ 10 digits and no leading `+`, **both** `+1` (US/Canada) and `+52` (Mexico) are tried automatically.

```json
{
  "input": "5551234567",
  "results": [
    { "whatsappId": "15551234567@c.us", "registered": true },
    { "whatsappId": "525551234567@c.us", "registered": false }
  ],
  "registered": true,
  "whatsappId": "15551234567@c.us"
}
```

### Incoming Messages (Webhook)

When the API receives an incoming WhatsApp message, it can forward it to an HTTP endpoint of your choice.

Set `WEBHOOK_URL` in your [`.env`](.env.example):

```env
WEBHOOK_URL=https://your-webhook.example.com/messages
```

The webhook payload is a `POST` request with the following JSON body:

```json
{
  "event": "message",
  "data": {
    "id": "true_16073041892@c.us_3EB0C5B1A3D4",
    "from": "16073041892@c.us",
    "to": "15551234567@c.us",
    "body": "Hello!",
    "type": "chat",
    "timestamp": 1735689600,
    "isGroup": false,
    "author": null,
    "hasMedia": false
  }
}
```

If no `WEBHOOK_URL` is configured, incoming messages are logged to the console.

### Error Responses

#### `503 Service Unavailable` — WhatsApp client not ready

Returned when the client is not in the `ready` state. Includes a `Retry-After` header and a `retryAfterSeconds` field:

```json
{
  "error": "WhatsApp client is not ready (status: initializing)",
  "retryAfterSeconds": 10
}
```

#### `400 Bad Request` — Invalid input

```json
{
  "error": "Invalid recipient: \"not-a-phone\""
}
```

#### `422 Validation Failed` — Invalid request body (tsoa validation)

```json
{
  "error": "Validation failed",
  "details": {
    "body.message": {
      "value": 123,
      "message": "Expected string, received number"
    }
  }
}
```

## Configuration Reference

All configuration is via environment variables in [`.env`](.env.example).

| Variable | Required | Default | Description |
|---|---|---|---|
| `API_TOKEN` | ✅ | — | Bearer token for API authentication (min 8 chars), sent as `X-Api-Token` |
| `BASIC_AUTH_USERNAME` | ❌ | `admin` | Basic Auth username used by the PWA against `/single/*` |
| `BASIC_AUTH_PASSWORD` | ❌ | `whatsapp` | Basic Auth password used by the PWA against `/single/*` |
| `INSTANCE_NAME` | ❌ | `whatsapp-neo2` | Unique name for Docker volumes and container names |
| `NOVNC_PORT` | ❌ | `3008` | Host port for the noVNC browser UI |
| `API_PORT` | ❌ | `3022` | Host port for the REST API |
| `PWA_PORT` | ❌ | `3009` | Host port for the PWA front-end |
| `CHROMIUM_CDP_URL` | ❌ | `ws://whatsapp-chromium:9223` | WebSocket URL of the Chromium CDP proxy (compose service name) |
| `WEBHOOK_URL` | ❌ | — | HTTP endpoint that receives incoming message POSTs |
| `SESSION_DATA_PATH` | ❌ | `/app/.wwebjs_auth` | Directory for WhatsApp session persistence |

## Running Multiple Instances

See [`MULTI_INSTANCE.md`](MULTI_INSTANCE.md) for detailed instructions on running multiple isolated WhatsApp instances side by side.

```bash
# Instance 1
INSTANCE_NAME=whatsapp-client1 NOVNC_PORT=3008 API_PORT=3022 PWA_PORT=3009 docker-compose up -d

# Instance 2
INSTANCE_NAME=whatsapp-client2 NOVNC_PORT=3010 API_PORT=3023 PWA_PORT=3011 docker-compose up -d
```

Each instance gets its own:
- Docker volumes for session and browser profile data
- Container names
- Port mappings
- Network namespace

## Development

The API is built with TypeScript, [tsoa](https://tsoa-community.github.io/docs/) (OpenAPI code-gen), and Express. The source code is bind-mounted from the host, so changes trigger an automatic reload via nodemon.

### Running locally (outside Docker)

```bash
cd whatsapp-api
cp .env.example .env    # ensure API_TOKEN is set
npm install
npm run dev
```

### Project Structure

```
whatsapp-api/
├── src/
│   ├── controllers/       # tsoa route controllers (SingleController, etc.)
│   ├── generated/         # Auto-generated by tsoa (routes + swagger.json)
│   ├── middleware/
│   │   └── auth.ts        # X-Api-Token / Basic Auth authentication module
│   ├── services/
│   │   └── WhatsAppService.v2.ts   # WhatsApp client lifecycle + webhook dispatch
│   ├── app.ts             # Express app factory
│   ├── config.ts          # Environment config validation (zod)
│   └── server.ts          # Entry point
├── tsoa.json              # tsoa code-gen configuration
├── Dockerfile
└── package.json

whatsapp-pwa/
├── src/
│   ├── api/               # Axios client + React Query hooks + DTO mirrors
│   ├── components/        # Chat UI + shared components
│   ├── pages/              # Route-level pages (Login, Chats, Chat, Pair, NewChat)
│   ├── store/              # Zustand auth store
│   └── App.tsx
├── nginx.conf              # Serves the build + proxies /single to whatsapp-api
├── Dockerfile               # Multi-stage: vite build → nginx runtime
└── package.json
```

## Docker Commands

```bash
# View logs for a single service
docker-compose logs -f whatsapp-api
docker-compose logs -f whatsapp-pwa

# Rebuild a single service after code changes (PWA image bakes in the build,
# so it must be rebuilt — whatsapp-api hot-reloads via the bind mount)
docker-compose up -d --build whatsapp-pwa

# Restart the API only
docker-compose restart whatsapp-api

# Stop everything
docker-compose down

# Stop and delete volumes (⚠️ removes session data)
docker-compose down -v
