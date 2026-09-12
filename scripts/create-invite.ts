/**
 * Phase 1 bootstrap tool: the admin console (SPEC.md build order step 2) and
 * access-request intake (step 7) don't exist yet, so this is the only way to
 * get a user + invite into the system right now.
 *
 * Usage: npx tsx scripts/create-invite.ts <email> <name> [--admin]
 */
// Loaded before the dynamic imports below so `@/env` sees it at module-evaluation
// time — static imports are hoisted in ESM and would run before this line does.
process.loadEnvFile(".env.local");

// Forces this file to be treated as a module rather than a global script —
// without any top-level static import/export, TS would otherwise let `main`
// collide with the same-named function in other bootstrap scripts.
export {};

async function main() {
  const [email, name, ...rest] = process.argv.slice(2);
  const isAdmin = rest.includes("--admin");

  if (!email || !name) {
    console.error("Usage: npx tsx scripts/create-invite.ts <email> <name> [--admin]");
    process.exit(1);
  }

  const { createUserAndInvite } = await import("@/lib/onboard-user");

  const { inviteUrl } = await createUserAndInvite(email, name, isAdmin ? "admin" : "learner");

  console.log(`Created ${isAdmin ? "admin" : "learner"} user ${email}`);
  console.log(`Invite URL: ${inviteUrl}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
