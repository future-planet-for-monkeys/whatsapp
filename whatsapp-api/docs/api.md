# WhatsApp Neo API Reference

**Base URL**: `http://localhost:3022` (configurable via `API_PORT`)

**Authentication**: All endpoints except [`GET /health`](#get-health--liveness-probe-public) require the `X-Api-Token` header.

---

## Table of Contents

- [WhatsApp Neo API Reference](#whatsapp-neo-api-reference)
  - [Table of Contents](#table-of-contents)
  - [Authentication](#authentication)
  - [System Endpoints](#system-endpoints)
    - [`GET /health` — Liveness probe (public)](#get-health--liveness-probe-public)
    - [`GET /status` — Session status](#get-status--session-status)
      - [Client Status Values](#client-status-values)
    - [`GET /qr` — QR code](#get-qr--qr-code)
  - [Messaging Endpoints](#messaging-endpoints)
    - [`POST /send` — Send text message](#post-send--send-text-message)
    - [`POST /send-media` — Send media file](#post-send-media--send-media-file)
  - [Chats Endpoints](#chats-endpoints)
    - [`GET /chats` — List chats](#get-chats--list-chats)
    - [`GET /chats/{chatId}/messages` — Get messages](#get-chatschatidmessages--get-messages)
  - [Contacts Endpoints](#contacts-endpoints)
    - [`GET /contacts` — List contacts](#get-contacts--list-contacts)
    - [`GET /contacts/check` — Check phone number](#get-contactscheck--check-phone-number)
    - [`POST /contacts` — Save contact](#post-contacts--save-contact)
  - [Webhook (Incoming Messages)](#webhook-incoming-messages)
  - [Error Responses](#error-responses)
    - [`503 Service Unavailable` — WhatsApp client not ready](#503-service-unavailable--whatsapp-client-not-ready)
    - [`400 Bad Request` — Invalid input](#400-bad-request--invalid-input)
    - [`422 Validation Failed` — Invalid request body (tsoa validation)](#422-validation-failed--invalid-request-body-tsoa-validation)
    - [`401 Unauthorized` — Missing authentication](#401-unauthorized--missing-authentication)
    - [`403 Forbidden` — Invalid token](#403-forbidden--invalid-token)
    - [`409 Conflict` — QR not available](#409-conflict--qr-not-available)
    - [`404 Not Found` — Unknown route](#404-not-found--unknown-route)
  - [Common Phone Number Formats](#common-phone-number-formats)

---

## Authentication

| Header | Value | Required |
|--------|-------|----------|
| `X-Api-Token` | Your API token (configured via `API_TOKEN` env var) | ✅ |

> The API uses a custom `X-Api-Token` header (not `Authorization: Bearer`) to avoid conflicts with HTTP Basic Auth on reverse proxies.

```bash
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/status
```

| Status | Meaning |
|--------|---------|
| `401` | Missing or empty token |
| `403` | Invalid token |

---

## System Endpoints

### `GET /health` — Liveness probe (public)

No authentication required. Returns `200` as long as the Node.js process is alive.

```bash
curl http://localhost:3022/health
```

**Response `200 OK`:**

```json
{
  "ok": true,
  "whatsapp": "ready",
  "ts": "2025-01-01T00:00:00.000Z"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` |
| `whatsapp` | `string` | Current [`ClientStatus`](#client-status-values) |
| `ts` | `string` | ISO-8601 UTC timestamp |

---

### `GET /status` — Session status

```bash
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/status
```

**Response `200 OK`:**

```json
{
  "status": "ready",
  "qrAvailable": false,
  "ready": true
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | `string` | Current [`ClientStatus`](#client-status-values) |
| `qrAvailable` | `boolean` | Whether a QR code PNG is available at `GET /qr` |
| `ready` | `boolean` | `true` only when `status === "ready"` |

#### Client Status Values

| Status | Meaning |
|--------|---------|
| `initializing` | Client starting up, connecting to Chromium |
| `qr_ready` | QR code available — scan with your phone |
| `authenticated` | Credentials accepted, WhatsApp Web stores still loading |
| `ready` | **Fully operational** — all API endpoints accept requests |
| `disconnected` | Connection lost — auto-reconnect scheduled |
| `auth_failure` | Authentication error — manual intervention needed |

---

### `GET /qr` — QR code

Three output modes. The default depends on the `Accept` header and `format` query parameter.

| Mode | Trigger | Content-Type | Description |
|------|---------|-------------|-------------|
| **HTML page** | Browser (`Accept: text/html`) | `text/html` | Full-page QR with scan instructions, auto-refreshes every 30 s |
| **PNG image** | `?format=png` or default | `image/png` | Raw QR code image bytes |
| **JSON** | `?format=json` | `application/json` | `{ "qr": "data:image/png;base64,..." }` |

```bash
# HTML page
curl -H "X-Api-Token: your-secret-token" -H "Accept: text/html" http://localhost:3022/qr

# PNG image
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/qr?format=png -o qr.png

# Base64 JSON
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/qr?format=json
```

**Response `200 OK` (JSON):**

```json
{
  "qr": "data:image/png;base64,iVBORw0KGgo..."
}
```

**Error `409 Conflict`** (when no QR is available):

```json
{
  "error": "QR code not available",
  "hint": "Current status is 'authenticated'. QR is only present during 'qr_ready'."
}
```

| Query Param | Type | Default | Description |
|-------------|------|---------|-------------|
| `format` | `"png"` \| `"json"` | `"png"` | Output format |

---

## Messaging Endpoints

### `POST /send` — Send text message

```bash
curl -X POST http://localhost:3022/send \
  -H "X-Api-Token: your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+1 (555) 123-4567",
    "message": "Hello from the API! 👋"
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | `string` | ✅ | Phone number in any format, or WhatsApp chat ID |
| `message` | `string` | ✅ | Plain-text message body |

**Response `201 Created`:**

```json
{
  "ok": true,
  "id": "true_16073041892@c.us_3EB0C5B1A3D4",
  "to": "16073041892@c.us",
  "timestamp": 1735689600
}
```

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` |
| `id` | `string` | Serialised message ID |
| `to` | `string` | Normalised WhatsApp chat ID |
| `timestamp` | `number` | Unix epoch seconds |

---

### `POST /send-media` — Send media file

Uses `multipart/form-data`. Max file size: **64 MB**.

```bash
curl -X POST http://localhost:3022/send-media \
  -H "X-Api-Token: your-secret-token" \
  -F "to=+1 (555) 123-4567" \
  -F "file=@/path/to/image.jpg" \
  -F "caption=Check this out!"
```

**Form Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `to` | `string` | ✅ | Phone number or WhatsApp chat ID |
| `file` | `file` | ✅ | Binary file (max 64 MB) |
| `caption` | `string` | ❌ | Optional text caption |

**Supported formats:** JPEG, PNG, GIF, WebP, MP3, OGG, AAC, MP4, PDF, DOCX, XLSX, and more.

**Response `201 Created`:**

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

| Field | Type | Description |
|-------|------|-------------|
| `ok` | `boolean` | Always `true` |
| `id` | `string` | Serialised message ID |
| `to` | `string` | Normalised WhatsApp chat ID |
| `filename` | `string` | Original filename |
| `mimeType` | `string` | MIME type of the file |
| `timestamp` | `number` | Unix epoch seconds |

---

## Chats Endpoints

### `GET /chats` — List chats

Returns chats ordered by most-recent activity.

```bash
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/chats?limit=20
```

| Query Param | Type | Default | Max | Description |
|-------------|------|---------|-----|-------------|
| `limit` | `number` | `50` | `200` | Maximum chats to return |

**Response `200 OK`:**

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

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | Number of chats returned |
| `chats[]` | `array` | List of chat items |
| `chats[].id` | `string` | WhatsApp chat ID |
| `chats[].name` | `string` | Chat name (contact name or group subject) |
| `chats[].isGroup` | `boolean` | Whether this is a group chat |
| `chats[].unreadCount` | `number` | Number of unread messages |
| `chats[].timestamp` | `number` | Unix epoch seconds of last activity |
| `chats[].lastMessage` | `LastMessage` or `null` | Most recent message preview |

---

### `GET /chats/{chatId}/messages` — Get messages

Fetches message history for a specific chat. Uses a custom implementation that bypasses SDK serialization issues with LID-based contacts.

```bash
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/chats/16073041892@c.us/messages?limit=30
```

| Param | Location | Type | Default | Max | Description |
|-------|----------|------|---------|-----|-------------|
| `chatId` | path | `string` | — | — | WhatsApp chat ID (e.g. `16073041892@c.us`) |
| `limit` | query | `number` | `50` | `200` | Number of messages to fetch |

**Response `200 OK`:**

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

| Field | Type | Description |
|-------|------|-------------|
| `chatId` | `string` | The requested chat ID |
| `count` | `number` | Number of messages returned |
| `messages[]` | `array` | List of message items |
| `messages[].id` | `string` | Serialised message ID |
| `messages[].from` | `string` | Sender's WhatsApp ID |
| `messages[].to` | `string` | Recipient's WhatsApp ID |
| `messages[].body` | `string` | Message body text |
| `messages[].type` | `string` | Message type (`chat`, `image`, `video`, `document`, etc.) |
| `messages[].timestamp` | `number` | Unix epoch seconds |
| `messages[].fromMe` | `boolean` | Whether the message was sent by the current user |
| `messages[].hasMedia` | `boolean` | Whether the message has media attachments |
| `messages[].author` | `string` or `null` | Author's WhatsApp ID (for groups); `null` for private chats |

---

## Contacts Endpoints

### `GET /contacts` — List contacts

```bash
curl -H "X-Api-Token: your-secret-token" http://localhost:3022/contacts?limit=100
```

| Query Param | Type | Default | Max | Description |
|-------------|------|---------|-----|-------------|
| `limit` | `number` | `200` | `1000` | Maximum contacts to return |

**Response `200 OK`:**

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

| Field | Type | Description |
|-------|------|-------------|
| `count` | `number` | Number of contacts returned |
| `contacts[]` | `array` | List of contact items |
| `contacts[].id` | `string` | WhatsApp contact ID |
| `contacts[].name` | `string` | Contact name |
| `contacts[].pushname` | `string` | Pushname from WhatsApp |
| `contacts[].shortName` | `string` | Short name |
| `contacts[].number` | `string` | Phone number (digits only) |
| `contacts[].isGroup` | `boolean` | Always `false` (contacts are not groups) |
| `contacts[].isWAContact` | `boolean` | Whether the contact is registered on WhatsApp |
| `contacts[].isMyContact` | `boolean` | Whether the contact is in the user's address book |

---

### `GET /contacts/check` — Check phone number

Checks whether a phone number is registered on WhatsApp. Handles country code detection automatically.

```bash
curl -H "X-Api-Token: your-secret-token" "http://localhost:3022/contacts/check?phone=+1%20(555)%20123-4567"
```

| Query Param | Type | Required | Description |
|-------------|------|----------|-------------|
| `phone` | `string` | ✅ | Phone number in any format |

**Country code detection logic:**

| Input pattern | Behaviour |
|---------------|-----------|
| Starts with `+` | Country code present — one check |
| ≥ 11 digits | Country code present — one check |
| ≤ 10 digits, no `+` | Tries **both** `+1` (US/Canada) and `+52` (Mexico) |

**Example — input without country code (`5551234567`, 10 digits):**

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

| Field | Type | Description |
|-------|------|-------------|
| `input` | `string` | Original phone input |
| `results[]` | `array` | All candidate IDs checked |
| `results[].whatsappId` | `string` | WhatsApp ID checked |
| `results[].registered` | `boolean` | Whether this ID is registered |
| `registered` | `boolean` | `true` if ANY candidate was found |
| `whatsappId` | `string` or `null` | First registered WhatsApp ID, or `null` |

---

### `POST /contacts` — Save contact

Saves a new contact to the WhatsApp address book.

```bash
curl -X POST http://localhost:3022/contacts \
  -H "X-Api-Token: your-secret-token" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "16073041892",
    "firstName": "Jane",
    "lastName": "Doe",
    "syncToAddressbook": false
  }'
```

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `phone` | `string` | ✅ | Phone number in digits only (with country code) |
| `firstName` | `string` | ✅ | Contact's first name |
| `lastName` | `string` | ❌ | Contact's last name |
| `syncToAddressbook` | `boolean` | ❌ | Sync to phone's address book (default: `false`) |

**Response `201 Created`:**

```json
{
  "ok": true,
  "id": "16073041892@c.us",
  "phone": "16073041892",
  "firstName": "Jane"
}
```

---

## Webhook (Incoming Messages)

When the API receives an incoming WhatsApp message, it can forward it to an HTTP endpoint.

Configure via the `WEBHOOK_URL` environment variable:

```env
WEBHOOK_URL=https://your-webhook.example.com/messages
```

The webhook sends a `POST` request with the following JSON body:

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

---

## Error Responses

### `503 Service Unavailable` — WhatsApp client not ready

Returned when the client is not in the `ready` state. Includes a `Retry-After` header.

```json
{
  "error": "WhatsApp client is not ready (status: initializing)",
  "retryAfterSeconds": 10
}
```

**Headers:** `Retry-After: 10`

### `400 Bad Request` — Invalid input

```json
{
  "error": "Invalid recipient: \"not-a-phone\""
}
```

### `422 Validation Failed` — Invalid request body (tsoa validation)

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

### `401 Unauthorized` — Missing authentication

```json
{
  "error": "Unauthorized — supply your API token in the X-Api-Token header."
}
```

### `403 Forbidden` — Invalid token

```json
{
  "error": "Forbidden — invalid API token."
}
```

### `409 Conflict` — QR not available

```json
{
  "error": "QR code not available",
  "hint": "Current status is 'authenticated'. QR is only present during 'qr_ready'."
}
```

### `404 Not Found` — Unknown route

```json
{
  "error": "Not found"
}
```

---

## Common Phone Number Formats

The `to` field in messaging endpoints and the `phone` field in contacts endpoints accept various formats:

| Input | Normalised | Notes |
|-------|------------|-------|
| `+1 (607) 304-1892` | `16073041892@c.us` | Country code detected |
| `16073041892` | `16073041892@c.us` | Digits only, 11 digits → country code present |
| `16073041892@c.us` | `16073041892@c.us` | Pass-through (already a WhatsApp ID) |
| `123456789@g.us` | `123456789@g.us` | Pass-through (group ID) |
| `5551234567` | `15551234567@c.us` or `525551234567@c.us` | No country code — both US and MX tried |