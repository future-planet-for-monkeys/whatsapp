import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Which env file to load — defaults to ".env" (the Docker Compose profile).
// Set ENV_FILE to switch profiles without renaming files, e.g.:
//   ENV_FILE=local.env npm run dev        (hybrid: local API + dockerized Chromium)
//   ENV_FILE=debug.local npm run dev      (fully standalone: local API + local Puppeteer)
// See {docker,local,debug.local}.env.example at the project root for the
// three supported profiles.
// ---------------------------------------------------------------------------
const envFileName = process.env.ENV_FILE || '.env';

// Load — try the project root first, then CWD (CWD wins if both exist, e.g.
// when running `npm run dev` from inside whatsapp-api/ with its own override).
dotenv.config({ path: path.resolve(__dirname, '../../', envFileName) });
dotenv.config({ path: path.resolve(process.cwd(), envFileName) });

// ---------------------------------------------------------------------------
// Schema — all fields validated at startup; failures print a clear message
// and immediately exit the process (fail-fast, never silently misconfigure).
// ---------------------------------------------------------------------------
const envSchema = z.object({
  /** Bearer token required on every authenticated request. */
  API_TOKEN: z.string().min(8, 'API_TOKEN must be at least 8 characters'),

  /** Username for HTTP Basic Auth (alternative to API_TOKEN). */
  BASIC_AUTH_USERNAME: z.string().min(1, 'BASIC_AUTH_USERNAME is required').default('admin'),

  /** Password for HTTP Basic Auth (alternative to API_TOKEN). */
  BASIC_AUTH_PASSWORD: z.string().min(1, 'BASIC_AUTH_PASSWORD is required').default('whatsapp'),

  /** WebSocket URL of the remote Chromium CDP proxy.
   *  Leave unset (omit entirely from the env file) to fall back to a local
   *  Puppeteer-launched Chromium instead — see PUPPETEER_HEADLESS below. */
  CHROMIUM_CDP_URL: z.string().min(1).optional(),

  /** Optional HTTP endpoint that receives incoming-message POSTs. */
  WEBHOOK_URL: z.string().url().optional().or(z.literal('')),

  /** TCP port the HTTP server listens on. */
  PORT: z.coerce.number().int().positive().default(3000),

  /** Directory where whatsapp-web.js stores its LocalAuth session data.
   *  Relative paths are resolved from the current working directory
   *  (which is /app inside the Docker container). */
  SESSION_DATA_PATH: z.string().default('./.wwebjs_auth'),

  /** Directory where avatars are cached locally. */
  AVATAR_CACHE_PATH: z.string().default('./avatar_cache'),

  /** Only used when CHROMIUM_CDP_URL is unset — launches a local Puppeteer-
   *  managed Chromium instead of connecting to a remote/dockerized one.
   *  Set to "false" for the debug.local profile to watch the browser live. */
  PUPPETEER_HEADLESS: z
    .enum(['true', 'false'])
    .default('true')
    .transform((v) => v === 'true'),

  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  TZ: z.string().default('UTC'),
});

export type AppConfig = z.infer<typeof envSchema>;

// ---------------------------------------------------------------------------
// Load + validate once at module init — all importers share the same object.
// ---------------------------------------------------------------------------
function loadConfig(): AppConfig {
  const result = envSchema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues
      .map((i) => `  • ${i.path.join('.')}: ${i.message}`)
      .join('\n');
    console.error(
      `[config] ❌  Configuration errors — check your ${envFileName} file:\n${issues}`,
    );
    process.exit(1);
  }

  const cfg = result.data;

  // Normalise: treat an empty string the same as "not set"
  if (cfg.WEBHOOK_URL === '') cfg.WEBHOOK_URL = undefined;

  console.log(`[config] ✅  Configuration validated (${envFileName})`);
  console.log(
    `[config]     Chromium mode: ${cfg.CHROMIUM_CDP_URL ? `remote CDP (${cfg.CHROMIUM_CDP_URL})` : `local Puppeteer (headless=${cfg.PUPPETEER_HEADLESS})`}`,
  );
  return cfg;
}

export const config: AppConfig = loadConfig();
