FROM node:20-slim

WORKDIR /app

# Install dependencies first (cached layer).
# "patches/" must be present BEFORE `npm ci` runs, because the postinstall
# hook (`patch-package`) applies patches at install time. Without this, the
# whatsapp-web.js patch is silently skipped ("No patch files found") and the
# unpatched library throws on getChat/getChatById/getChats once WhatsApp Web
# renames internal fields (e.g. message key `_serialized` → `$1`).
COPY package.json package-lock.json* ./
COPY patches ./patches
RUN npm ci --omit=dev=false

# Copy config files needed by tsoa code-gen
COPY tsconfig.json tsoa.json ./

# Copy source — tsoa spec-and-routes is run at start time so that
# bind-mounted src/ changes in dev are always reflected
COPY src ./src

# Generate tsoa routes + OpenAPI spec at image build time.
# In development the Dockerfile is rebuilt rarely; nodemon handles reloads.
# Patch: tsoa ≤6.x serialises the servers[].url object incorrectly as
# "https://[object Object]/". Fix it to a relative root "/" afterwards.
RUN npx tsoa spec-and-routes && \
    sed -i 's|"url": "https://\[object Object\]/"|"url": "/"|g' src/generated/swagger.json

# Expose API port (mapped to host port 3021 in docker-compose)
EXPOSE 3000

# Start the server (tsx runs TypeScript directly — no separate compile step)
CMD ["npx", "tsx", "src/server.ts"]
