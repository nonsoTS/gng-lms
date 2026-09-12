import { auth } from "@/lib/auth";
import { createInvite } from "@/lib/invites";
import { sendInviteEmail } from "@/lib/email";
import { env } from "@/env";

/**
 * Shared "create user -> create invite -> send email" sequence, used by both
 * scripts/create-invite.ts and the access-request approval action. Lives
 * here (not in src/lib/invites.ts) to avoid a circular import: auth.ts pulls
 * in invite-plugin.ts, which pulls in invites.ts for hashInviteToken — a
 * function in invites.ts that itself imported auth.ts would close that loop.
 */
export async function createUserAndInvite(
  email: string,
  name: string,
  role: "learner" | "admin",
) {
  const { user } = await auth.api.createUser({
    body: { email, name, role },
  });

  const token = await createInvite(user.id);
  const url = new URL("/api/auth/invite/verify", env.BETTER_AUTH_URL);
  url.searchParams.set("token", token);

  await sendInviteEmail(email, url.toString());

  return { user, inviteUrl: url.toString() };
}
