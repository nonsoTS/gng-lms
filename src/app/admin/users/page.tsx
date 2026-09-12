import { headers } from "next/headers";
import { desc } from "drizzle-orm";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { auth } from "@/lib/auth";
import { formatDate } from "@/lib/format-date";
import { InviteUserForm } from "./invite-user-form";
import { UsersTable, type UserRow } from "./users-table";

const LIST_LIMIT = 500;

type Status = "active" | "invited" | "expired" | "deactivated";

/**
 * `everConsumed` must be computed across *all* of a user's invites, not just
 * the latest — resending creates a new row without touching older ones, so
 * a user who already signed in via an earlier invite (before it was
 * resent) still has an unconsumed *latest* row. Checking only the latest
 * row's `consumedAt` would wrongly show them as still "Invited".
 */
function deriveStatus(
  banned: boolean | null,
  everConsumed: boolean,
  latestInvite: { expiresAt: Date } | undefined,
): Status {
  if (banned) return "deactivated";
  if (everConsumed || !latestInvite) return "active";
  if (latestInvite.expiresAt.getTime() < Date.now()) return "expired";
  return "invited";
}

export default async function UsersPage() {
  const { users } = await auth.api.listUsers({
    query: { limit: LIST_LIMIT, sortBy: "createdAt", sortDirection: "desc" },
    headers: await headers(),
  });

  // All invites per user, reduced in JS — the invites table is small at
  // this app's scale, not worth a window-function query for.
  const allInvites = await db
    .select({
      userId: invites.userId,
      consumedAt: invites.consumedAt,
      expiresAt: invites.expiresAt,
      createdAt: invites.createdAt,
    })
    .from(invites)
    .orderBy(desc(invites.createdAt));

  const latestInviteByUser = new Map<string, { expiresAt: Date }>();
  const everConsumedByUser = new Set<string>();
  for (const invite of allInvites) {
    if (!latestInviteByUser.has(invite.userId)) {
      latestInviteByUser.set(invite.userId, invite);
    }
    if (invite.consumedAt) {
      everConsumedByUser.add(invite.userId);
    }
  }

  const rows: UserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    role: u.role === "admin" ? "admin" : "learner",
    status: deriveStatus(u.banned ?? false, everConsumedByUser.has(u.id), latestInviteByUser.get(u.id)),
    createdAtLabel: formatDate(u.createdAt),
  }));

  return (
    <div>
      <h1 className="text-step-2 font-semibold text-ink">Users</h1>
      <p className="mt-1 text-step-0 text-muted">
        Invite learners and admins, resend invites, and manage access.
      </p>

      <div className="mt-4 rounded-card border border-line bg-surface p-4">
        <InviteUserForm />
      </div>

      <div className="mt-4">
        <UsersTable initialUsers={rows} />
      </div>
    </div>
  );
}
