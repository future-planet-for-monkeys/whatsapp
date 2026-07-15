#!/bin/bash
# Remove stale Chromium singleton lock files left by a previous crashed session.
# Without this, Chromium exits with code 21 when the profile volume is reused.
rm -f /chromium-profile/SingletonLock \
      /chromium-profile/SingletonCookie \
      /chromium-profile/SingletonSocket

# Wait for X display to be ready
until xdpyinfo -display :1 >/dev/null 2>&1; do sleep 0.5; done

# Open a blank page — whatsapp-web.js will navigate to WhatsApp Web itself.
# Opening web.whatsapp.com here causes a double-navigation that destroys the
# Puppeteer execution context when whatsapp-web.js also calls page.goto().
exec /usr/bin/chromium \
  --no-sandbox \
  --disable-dev-shm-usage \
  --disable-gpu \
  --remote-debugging-port=9222 \
  --remote-allow-origins=* \
  --no-first-run \
  --no-default-browser-check \
  --start-maximized \
  --user-data-dir=/chromium-profile \
  "about:blank"
