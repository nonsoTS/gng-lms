"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { accessRequests } from "@/db/schema";
import { requireAdmin } from "@/lib/require-admin";
import { createUserAndInvite } from "@/lib/onboard-user";

export async function approveAccessRequest(id: string) {
  const session = await requireAdmin();

  const [request] = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.id, id));

  if (!request || request.status !== "pending") {
    throw new Error("Access request not found or already reviewed");
  }

  await createUserAndInvite(request.email, request.name, "learner");

  await db
    .update(accessRequests)
    .set({ status: "approved", reviewedBy: session.user.id, reviewedAt: new Date() })
    .where(eq(accessRequests.id, id));

  revalidatePath("/admin/access-requests");
}

export async function rejectAccessRequest(id: string) {
  const session = await requireAdmin();

  await db
    .update(accessRequests)
    .set({ status: "rejected", reviewedBy: session.user.id, reviewedAt: new Date() })
    .where(eq(accessRequests.id, id));

  revalidatePath("/admin/access-requests");
}
