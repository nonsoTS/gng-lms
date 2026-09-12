import { headers } from "next/headers";
import { auth } from "@/lib/auth";

/**
 * Server Actions are directly callable regardless of which page rendered the
 * form — src/app/admin/layout.tsx's redirect doesn't protect them. Every
 * course/module/lesson action calls this first.
 */
export async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session || session.user.role !== "admin") {
    throw new Error("Forbidden");
  }

  return session;
}
