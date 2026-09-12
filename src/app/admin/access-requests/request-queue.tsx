"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { approveAccessRequest, rejectAccessRequest } from "@/lib/actions/access-requests";
import type { accessRequests } from "@/db/schema";

type AccessRequest = typeof accessRequests.$inferSelect;

export function RequestQueue({
  initialPending,
  recentlyReviewed,
}: {
  initialPending: AccessRequest[];
  recentlyReviewed: AccessRequest[];
}) {
  const [pending, setPending] = useState(initialPending);
  // Re-sync when the server list changes (after approve/reject triggers a
  // refresh) — "adjust state during render", see course-list.tsx for why.
  const [prevInitialPending, setPrevInitialPending] = useState(initialPending);
  if (initialPending !== prevInitialPending) {
    setPrevInitialPending(initialPending);
    setPending(initialPending);
  }

  const [, startTransition] = useTransition();
  const router = useRouter();

  function handleApprove(id: string) {
    setPending((current) => current.filter((r) => r.id !== id));
    startTransition(async () => {
      await approveAccessRequest(id);
      router.refresh();
    });
  }

  function handleReject(id: string) {
    if (!confirm("Reject this request? The applicant won't be notified.")) return;
    setPending((current) => current.filter((r) => r.id !== id));
    startTransition(async () => {
      await rejectAccessRequest(id);
      router.refresh();
    });
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-2 text-step-1 font-semibold text-ink">Pending</h2>
        {pending.length === 0 ? (
          <p className="text-step-0 text-muted">No pending requests.</p>
        ) : (
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-step-0">
              <thead className="sticky top-0 border-b border-line bg-surface text-step-n1 text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Message</th>
                  <th className="px-3 py-2 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((request) => (
                  <tr key={request.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{request.name}</td>
                    <td className="px-3 py-2 text-muted">{request.email}</td>
                    <td className="px-3 py-2 text-muted">{request.message}</td>
                    <td className="px-3 py-2">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => handleApprove(request.id)}
                          className="min-h-11 rounded-control bg-primary px-3 text-step-n1 font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => handleReject(request.id)}
                          className="min-h-11 rounded-control border border-line px-3 text-step-n1 text-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {recentlyReviewed.length > 0 && (
        <section>
          <h2 className="mb-2 text-step-1 font-semibold text-ink">Recently reviewed</h2>
          <div className="overflow-x-auto rounded-card border border-line">
            <table className="w-full text-left text-step-0">
              <thead className="sticky top-0 border-b border-line bg-surface text-step-n1 text-muted">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Email</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentlyReviewed.map((request) => (
                  <tr key={request.id} className="border-b border-line last:border-0">
                    <td className="px-3 py-2 text-ink">{request.name}</td>
                    <td className="px-3 py-2 text-muted">{request.email}</td>
                    <td className="px-3 py-2 text-muted">{request.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
