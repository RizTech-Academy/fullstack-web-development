import { z } from "zod";

/**
 * Every environment variable the API needs, validated at startup.
 *
 * The alternative is `process.env.WHATEVER` scattered through the codebase,
 * each one `string | undefined`, each one with its own fallback. That fails at
 * three in the morning, on one code path, in production — and the fallback is
 * usually the dangerous option, because the dangerous option is the one that
 * lets the process start.
 *
 * This fails in the first second of a deployment, with a message naming the
 * variable. A deployment that will not start is a rollback. A deployment that
 * starts with no JWT secret is an incident.
 */
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(3001),

  DATABASE_URL: z.string().url().startsWith("postgres"),

  // 32 characters is not decoration: a short secret is brute-forceable, and a
  // forged token is every account at once.
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default("15m"),

  PAYMENT_WEBHOOK_SECRET: z.string().min(16),
  PAYMENT_PUBLIC_KEY: z.string().default("kirana_test_key"),

  // No default. A wrong CORS origin in production is either a broken shop or
  // an open one, and neither should be reachable by forgetting a variable.
  CORS_ORIGIN: z.string().url(),

  LOG_LEVEL: z.enum(["error", "warn", "log", "debug", "verbose"]).default("log"),
});

export type Env = z.infer<typeof schema>;

export function validateEnv(raw: Record<string, unknown>): Env {
  const result = schema.safeParse(raw);

  if (!result.success) {
    // Names every problem at once. Reporting one at a time means as many
    // failed deployments as there are missing variables.
    const problems = result.error.issues
      .map((issue) => `  ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");

    throw new Error(`Environment is not usable:\n${problems}\n`);
  }

  // Never log the values. This is the one place that has all of them, which
  // makes it the one place most likely to leak them.
  return result.data;
}
