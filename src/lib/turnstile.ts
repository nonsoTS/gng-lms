import { env } from "@/env";

const VERIFY_URL = "https://challenges.cloudflare.com/turnstile/v0/siteverify";

/**
 * Skips verification (returns true) when TURNSTILE_SECRET_KEY isn't
 * configured — no real Cloudflare Turnstile site is provisioned yet. See
 * the Phase 7 plan / CLAUDE.md for why this is optional rather than a
 * required env var.
 */
export async function verifyTurnstileToken(token: string | undefined): Promise<boolean> {
  if (!env.TURNSTILE_SECRET_KEY) {
    console.log("[turnstile] TURNSTILE_SECRET_KEY not set — skipping captcha verification");
    return true;
  }

  if (!token) return false;

  const res = await fetch(VERIFY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ secret: env.TURNSTILE_SECRET_KEY, response: token }),
  });

  const data = (await res.json()) as { success: boolean };
  return data.success === true;
}
