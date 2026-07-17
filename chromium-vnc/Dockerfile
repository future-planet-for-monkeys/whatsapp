FROM debian:bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    x11vnc \
    xvfb \
    fluxbox \
    novnc \
    websockify \
    supervisor \
    fonts-noto-cjk \
    curl \
    && ln -s /usr/share/novnc/vnc.html /usr/share/novnc/index.html \
    && rm -rf /var/lib/apt/lists/*

ENV DISPLAY=:1 \
    RESOLUTION=1280x800x24

COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf
COPY start-chromium.sh /start-chromium.sh
RUN chmod +x /start-chromium.sh

EXPOSE 6901

CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
