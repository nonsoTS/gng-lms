import { randomBytes, createHash } from "node:crypto";
import { db } from "@/db";
import { invites } from "@/db/schema";

export const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function hashInviteToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateInviteToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Creates an invite row for an already-created user and returns the raw token for the email URL. */
export async function createInvite(userId: string): Promise<string> {
  const token = generateInviteToken();

  await db.insert(invites).values({
    userId,
    tokenHash: hashInviteToken(token),
    expiresAt: new Date(Date.now() + INVITE_TTL_MS),
  });

  return token;
}
