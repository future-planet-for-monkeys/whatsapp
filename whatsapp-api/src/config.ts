import dotenv from 'dotenv';
import path from 'node:path';
import { z } from 'zod';

// Load .env — try CWD first, then fall back to the project root (where this file is).
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config(); // also try CWD (overrides above if found)

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

  /** WebSocket URL of the remote Chromium CDP proxy. */
  CHROMIUM_CDP_URL: z
    .string()
    .min(1)
    .default('ws://whatsapp-neo-chromium:9223'),

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
      `[config] ❌  Configuration errors — check your .env file:\n${issues}`,
    );
    process.exit(1);
  }

  const cfg = result.data;

  // Normalise: treat an empty string the same as "not set"
  if (cfg.WEBHOOK_URL === '') cfg.WEBHOOK_URL = undefined;

  console.log('[config] ✅  Configuration validated');
  return cfg;
}

export const config: AppConfig = loadConfig();
