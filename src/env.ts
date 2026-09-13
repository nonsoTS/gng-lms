import { z } from "zod";

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  DIRECT_URL: z.string().min(1),
  BETTER_AUTH_SECRET: z.string().min(1),
  BETTER_AUTH_URL: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  EMAIL_FROM: z.string().min(1),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET_NAME: z.string().min(1),
  ACCESS_REQUEST_SHARED_SECRET: z.string().min(1),
  // Optional by design, not just pending setup: verifyTurnstileToken() skips
  // captcha verification (rate-limiting still applies) whenever this is
  // unset, which keeps local/preview environments working without needing
  // their own Turnstile site. Set in production, where it's genuinely
  // enforced.
  TURNSTILE_SECRET_KEY: z.string().optional(),
  // Optional: no real Paystack donation page set up yet. The donation banner
  // (src/components/donation-prompt.tsx) just doesn't render until this is set.
  NEXT_PUBLIC_PAYSTACK_DONATION_URL: z.string().optional(),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error("Invalid environment variables:", z.treeifyError(parsed.error));
  throw new Error("Invalid environment variables — see log above.");
}

export const env = parsed.data;
