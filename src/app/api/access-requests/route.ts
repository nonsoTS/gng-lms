import { timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { and, count, eq, gt } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { accessRequests } from "@/db/schema";
import { env } from "@/env";
import { verifyTurnstileToken } from "@/lib/turnstile";

// SPEC.md §10: "Rate-limit and captcha the access request endpoint." Captcha
// is optional (see src/lib/turnstile.ts) until real Turnstile keys exist;
// this coarse count-based rate limit always applies regardless.
const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000;
const RATE_LIMIT_MAX = 20;

const bodySchema = z.object({
  email: z.email(),
  name: z.string().min(1),
  message: z.string().optional(),
  turnstileToken: z.string().optional(),
});

function isAuthorized(request: NextRequest): boolean {
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");
  if (scheme !== "Bearer" || !token) return false;

  const expected = Buffer.from(env.ACCESS_REQUEST_SHARED_SECRET);
  const actual = Buffer.from(token);
  if (expected.length !== actual.length) return false;
  return timingSafeEqual(expected, actual);
}

export async function POST(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const [{ recentCount }] = await db
    .select({ recentCount: count() })
    .from(accessRequests)
    .where(gt(accessRequests.createdAt, new Date(Date.now() - RATE_LIMIT_WINDOW_MS)));

  if (recentCount >= RATE_LIMIT_MAX) {
    return NextResponse.json({ ok: false, error: "Too many requests" }, { status: 429 });
  }

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "Invalid request body" }, { status: 400 });
  }
  const { email, name, message, turnstileToken } = parsed.data;

  const captchaOk = await verifyTurnstileToken(turnstileToken);
  if (!captchaOk) {
    return NextResponse.json(
      { ok: false, error: "Captcha verification failed" },
      { status: 400 },
    );
  }

  const [existingPending] = await db
    .select({ id: accessRequests.id })
    .from(accessRequests)
    .where(and(eq(accessRequests.email, email), eq(accessRequests.status, "pending")));

  if (!existingPending) {
    await db.insert(accessRequests).values({ email, name, message: message ?? null });
  }

  return NextResponse.json({ ok: true });
}
