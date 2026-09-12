"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { and, count, eq, isNull, ne, or } from "drizzle-orm";
import { db } from "@/db";
import { user as userTable } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import { auth } from "@/lib/auth";
import { createUserAndInvite } from "@/lib/onboard-user";
import { createInvite } from "@/lib/invites";
import { sendInviteEmail } from "@/lib/email";
import { env } from "@/env";

type ActionResult<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: string };

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Something went wrong.";
}

function revalidateUsers() {
  revalidatePath("/admin/users");
}

export async function inviteUser(
  email: string,
  name: string,
  role: "learner" | "admin",
): Promise<ActionResult> {
  await requireAdmin();

  const trimmedEmail = email.trim();
  const trimmedName = name.trim();
  if (!trimmedEmail || !trimmedName) {
    return { ok: false, error: "Name and email are required." };
  }

  try {
    await createUserAndInvite(trimmedEmail, trimmedName, role);
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidateUsers();
  return { ok: true, data: undefined };
}

export async function resendInvite(userId: string): Promise<ActionResult> {
  await requireAdmin();

  const [target] = await db.select().from(userTable).where(eq(userTable.id, userId));
  if (!target) {
    return { ok: false, error: "User not found." };
  }

  try {
    const token = await createInvite(userId);
    const url = new URL("/api/auth/invite/verify", env.BETTER_AUTH_URL);
    url.searchParams.set("token", token);
    await sendInviteEmail(target.email, url.toString());
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidateUsers();
  return { ok: true, data: undefined };
}

/** Non-banned admins other than `excludingUserId` — `banned` is nullable, so NULL counts as not-banned. */
async function countOtherActiveAdmins(excludingUserId: string): Promise<number> {
  const [{ value }] = await db
    .select({ value: count() })
    .from(userTable)
    .where(
      and(
        eq(userTable.role, "admin"),
        or(isNull(userTable.banned), eq(userTable.banned, false)),
        ne(userTable.id, excludingUserId),
      ),
    );
  return value;
}

export async function setUserRole(
  userId: string,
  role: "learner" | "admin",
): Promise<ActionResult> {
  await requireAdmin();

  if (role === "learner") {
    const remaining = await countOtherActiveAdmins(userId);
    if (remaining === 0) {
      return { ok: false, error: "Can't remove the last admin." };
    }
  }

  try {
    // setRole's endpoint config requires headers at the type level (unlike
    // createUser/banUser/unbanUser, which onboard-user.ts already calls
    // without them) — pass the current request's through.
    await auth.api.setRole({ body: { userId, role }, headers: await headers() });
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidateUsers();
  return { ok: true, data: undefined };
}

export async function setUserActive(userId: string, active: boolean): Promise<ActionResult> {
  const session = await requireAdmin();

  // Implemented here rather than relied on from Better Auth's own
  // self-ban check — that check reads the caller's session from request
  // context, which this call doesn't provide (see NOTES.md Phase 10).
  if (!active && userId === session.user.id) {
    return { ok: false, error: "You can't deactivate your own account." };
  }

  const requestHeaders = await headers();
  try {
    if (active) {
      await auth.api.unbanUser({ body: { userId }, headers: requestHeaders });
    } else {
      await auth.api.banUser({ body: { userId }, headers: requestHeaders });
    }
  } catch (error) {
    return { ok: false, error: errorMessage(error) };
  }

  revalidateUsers();
  return { ok: true, data: undefined };
}
