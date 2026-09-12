import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { admin, magicLink } from "better-auth/plugins";
import { adminAc, userAc } from "better-auth/plugins/admin/access";
import { db } from "@/db";
import { env } from "@/env";
import { sendMagicLinkEmail } from "@/lib/email";
import { invitePlugin } from "@/lib/invite-plugin";

export const auth = betterAuth({
  baseURL: env.BETTER_AUTH_URL,
  secret: env.BETTER_AUTH_SECRET,
  database: drizzleAdapter(db, { provider: "pg" }),
  emailAndPassword: { enabled: false },
  rateLimit: {
    enabled: true,
    storage: "database",
  },
  user: {
    additionalFields: {
      preferredFormat: {
        type: ["video", "slides", "text"],
        required: false,
        input: false,
      },
      lastSeenAt: {
        type: "date",
        required: false,
        input: false,
      },
    },
  },
  plugins: [
    magicLink({
      disableSignUp: true,
      sendMagicLink: async ({ email, url }) => {
        await sendMagicLinkEmail(email, url);
      },
    }),
    admin({
      defaultRole: "learner",
      adminRoles: ["admin"],
      // Rename Better Auth's built-in "user"/"admin" roles to match
      // SPEC.md §4's `role` enum (`learner` | `admin`); permissions unchanged.
      roles: { admin: adminAc, learner: userAc },
    }),
    invitePlugin(),
  ],
});
