import { ClientOptions, LocalAuth } from "whatsapp-web.js";
import { config } from "../config";

// ---------------------------------------------------------------------------
// ClientOptionFactory — builds ClientOptions for different deployment modes
// ---------------------------------------------------------------------------

export interface CdpTarget {
  id: string;
  type: string;
  url: string;
  title: string;
  webSocketDebuggerUrl: string;
}

export class ClientOptionFactory {
    /**
     * Builds ClientOptions that connect to a **remote** Chromium instance via CDP.
     *
     * Steps:
     *   1. Probes the CDP HTTP endpoint (`/json/version`) to obtain the browser's
     *      WebSocket debugger URL.
     *   2. Rewrites the hostname/port so it is reachable from the API container
     *      (handles cross-container proxy setups).
     *   3. Fetches all open CDP targets (`/json`) and closes any stale WhatsApp
     *      Web tabs to prevent "another device active" warnings.
     *   4. Returns ClientOptions configured with LocalAuth + browserWSEndpoint.
     */
    public static async getCDPClientOptions(chromiumCdpUrl: string): Promise<ClientOptions> {
        // Step 1: resolve the CDP WebSocket endpoint
        const browserWSEndpoint = await ClientOptionFactory._resolveCDPEndpoint(chromiumCdpUrl);

        // Step 2: clean up stale WhatsApp tabs from a previous session
        await ClientOptionFactory._cleanupStaleWhatsAppTabs(chromiumCdpUrl);

        // Step 3: return options pointing at the remote browser
        return {
            authStrategy: new LocalAuth({ dataPath: config.SESSION_DATA_PATH }),
            puppeteer: {
                browserWSEndpoint,
                protocolTimeout: 30000,
            },
        };
    }

    /**
     * Builds ClientOptions that launch a **local** Puppeteer browser instance.
     *
     * Use this when running without a separate Chromium container — Puppeteer
     * will manage its own browser process. This is the debug.local profile's
     * default: no Docker required at all. Set PUPPETEER_HEADLESS=false to
     * watch the browser window live while debugging.
     */
    public static async getLocalPuppeteerClientOptions(): Promise<ClientOptions> {
        console.log(
            `[ClientOptionFactory] Launching local Puppeteer Chromium (headless=${config.PUPPETEER_HEADLESS})`
        );
        return {
            authStrategy: new LocalAuth({ dataPath: config.SESSION_DATA_PATH }),
            puppeteer: {
                headless: config.PUPPETEER_HEADLESS,
                defaultViewport: null,
                protocolTimeout: 30000,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-gpu',
                ],
            },
        };
    }

    // ── Private — CDP helpers ─────────────────────────────────────────────────
    /**
     * Probes the CDP HTTP endpoint and returns a WebSocket URL with the correct
     * hostname so it is reachable from within the API container.
     */
    private static async _resolveCDPEndpoint(rawUrl: string): Promise<string> {
        const httpBase = rawUrl
            .replace(/^wss?:\/\//, 'http://')
            .replace(/^https?:\/\//, 'http://');
        const baseNoSlash = httpBase.replace(/\/$/, '');
        const parsedProxy = new URL(httpBase);

        const versionUrl = `${baseNoSlash}/json/version`;
        console.log(`[ClientOptionFactory] Probing CDP endpoint: ${versionUrl}`);

        const resp = await fetch(versionUrl);
        if (!resp.ok) {
            throw new Error(
                `CDP probe failed: ${resp.status} ${resp.statusText}`
            );
        }

        const data = (await resp.json()) as { webSocketDebuggerUrl?: string; };
        if (!data.webSocketDebuggerUrl) {
            throw new Error('CDP endpoint missing webSocketDebuggerUrl');
        }

        const wsUrl = new URL(data.webSocketDebuggerUrl);
        wsUrl.hostname = parsedProxy.hostname;
        wsUrl.port = parsedProxy.port;

        const resolved = wsUrl.toString();
        console.log(`[ClientOptionFactory] Resolved CDP endpoint: ${resolved}`);
        return resolved;
    }

    /**
     * Fetches all open CDP targets from the Chromium `/json` endpoint.
     * Rewrites embedded localhost → proxy hostname for cross-container access.
     */
    private static async _getCdpTargets(rawUrl: string): Promise<CdpTarget[]> {
        const httpBase = rawUrl
            .replace(/^wss?:\/\//, 'http://')
            .replace(/^https?:\/\//, 'http://');
        const baseNoSlash = httpBase.replace(/\/$/, '');
        const parsedProxy = new URL(httpBase);

        const resp = await fetch(`${baseNoSlash}/json`);
        if (!resp.ok) return [];

        const targets = (await resp.json()) as CdpTarget[];

        // Rewrite embedded localhost → proxy hostname for cross-container access
        return targets.map((t) => {
            try {
                const ws = new URL(t.webSocketDebuggerUrl);
                ws.hostname = parsedProxy.hostname;
                ws.port = parsedProxy.port;
                return { ...t, webSocketDebuggerUrl: ws.toString() };
            } catch {
                return t;
            }
        });
    }

    /**
     * Closes a specific CDP target (tab) by its target ID.
     */
    private static async _closeCdpTarget(rawUrl: string, targetId: string): Promise<void> {
        const httpBase = rawUrl
            .replace(/^wss?:\/\//, 'http://')
            .replace(/^https?:\/\//, 'http://');
        const baseNoSlash = httpBase.replace(/\/$/, '');
        try {
            await fetch(`${baseNoSlash}/json/close/${targetId}`, { method: 'GET' });
            console.log(`[ClientOptionFactory] Closed stale tab: ${targetId}`);
        } catch (err) {
            console.warn(
                `[ClientOptionFactory] Failed to close tab ${targetId}:`,
                err
            );
        }
    }

    /**
     * Closes all open WhatsApp page targets.
     * Prevents "another device active" warnings and unpredictable injection.
     */
    private static async _cleanupStaleWhatsAppTabs(rawUrl: string): Promise<number> {
        const targets = await ClientOptionFactory._getCdpTargets(rawUrl);
        const waTabs = targets.filter(
            (t) => t.type === 'page' && t.url.startsWith('https://web.whatsapp.com')
        );

        for (const t of waTabs) {
            await ClientOptionFactory._closeCdpTarget(rawUrl, t.id);
        }

        if (waTabs.length > 0) {
            console.log(
                `[ClientOptionFactory] Cleaned up ${waTabs.length} stale WhatsApp tab(s)`
            );
        }
        return waTabs.length;
    }
}
