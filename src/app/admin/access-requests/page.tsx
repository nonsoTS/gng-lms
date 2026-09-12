import { asc, desc, eq, isNotNull } from "drizzle-orm";
import { db } from "@/db";
import { accessRequests } from "@/db/schema";
import { RequestQueue } from "./request-queue";

export default async function AccessRequestsPage() {
  const pending = await db
    .select()
    .from(accessRequests)
    .where(eq(accessRequests.status, "pending"))
    .orderBy(asc(accessRequests.createdAt));

  const recentlyReviewed = await db
    .select()
    .from(accessRequests)
    .where(isNotNull(accessRequests.reviewedAt))
    .orderBy(desc(accessRequests.reviewedAt))
    .limit(10);

  return (
    <div className="space-y-4">
      <h1 className="text-step-2 font-semibold text-ink">Access requests</h1>
      <RequestQueue initialPending={pending} recentlyReviewed={recentlyReviewed} />
    </div>
  );
}
