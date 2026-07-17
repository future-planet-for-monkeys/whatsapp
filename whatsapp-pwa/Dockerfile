# ── Build stage ──────────────────────────────────────────────────────────────
# Compiles the React/Vite PWA into static assets.
FROM node:20-slim AS build

WORKDIR /app

# Install dependencies first (cached layer)
COPY package.json package-lock.json* ./
RUN npm ci

# Copy the rest of the source and build the production bundle.
# VITE_API_URL is only used by the Vite *dev server* proxy — the production
# build always calls the same-origin "/single" path, which this container's
# nginx proxies to the whatsapp-api service (see nginx.conf).
COPY . .
RUN npm run build

# ── Runtime stage ────────────────────────────────────────────────────────────
# Serves the compiled static assets and reverse-proxies /single to the API,
# so the browser only ever talks to one origin (no CORS, no extra config).
FROM nginx:alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD wget -qO- http://localhost/ >/dev/null 2>&1 || exit 1

CMD ["nginx", "-g", "daemon off;"]
