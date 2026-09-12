import type { BetterAuthPlugin } from "better-auth";
import { createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { and, eq, gt, isNull, TransactionRollbackError } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/db";
import { invites } from "@/db/schema";
import { hashInviteToken } from "@/lib/invites";

/**
 * Consumes a Phase-1 invite (SPEC.md §3-4): a bespoke, single-use, 7-day link
 * distinct from Better Auth's own `magicLink` plugin — see the invite
 * architecture decision in the Phase 1 plan. On success it creates a real
 * Better Auth session via the internal adapter, exactly like magic-link
 * verification does, so the two are indistinguishable to the rest of the app.
 */
export function invitePlugin(): BetterAuthPlugin {
  return {
    id: "invites",
    endpoints: {
      inviteVerify: createAuthEndpoint(
        "/invite/verify",
        {
          method: "GET",
          query: z.object({ token: z.string() }),
          requireHeaders: true,
        },
        async (ctx) => {
          const { token } = ctx.query;
          const tokenHash = hashInviteToken(token);

          // The consumption, the user lookup, and the session creation all
          // happen in one transaction so a failure anywhere rolls back the
          // consumption too — otherwise a session-creation failure (e.g. a
          // banned user; the admin plugin's session.create.before hook
          // throws rather than returning falsy) burns the invite on an
          // attempt that never actually signed anyone in. See NOTES.md
          // Phase 10. `ctx.redirect(...)` must NOT be thrown from inside
          // this callback — any throw here rolls back, including on
          // success — so the callback only returns a plain result or calls
          // `tx.rollback()`, and the actual redirects happen after.
          const outcome = await db
            .transaction(async (tx) => {
              const [invite] = await tx
                .update(invites)
                .set({ consumedAt: new Date() })
                .where(
                  and(
                    eq(invites.tokenHash, tokenHash),
                    isNull(invites.consumedAt),
                    gt(invites.expiresAt, new Date()),
                  ),
                )
                .returning();

              if (!invite) return tx.rollback();

              const user = await ctx.context.internalAdapter.findUserById(invite.userId);
              if (!user) return tx.rollback();

              let session;
              try {
                session = await ctx.context.internalAdapter.createSession(user.id);
              } catch {
                return tx.rollback();
              }
              if (!session) return tx.rollback();

              return { user, session };
            })
            .catch((error) => {
              if (error instanceof TransactionRollbackError) return null;
              throw error;
            });

          if (!outcome) {
            throw ctx.redirect("/sign-in?error=invalid_invite");
          }

          await setSessionCookie(ctx, outcome);

          throw ctx.redirect("/");
        },
      ),
    },
  };
}
