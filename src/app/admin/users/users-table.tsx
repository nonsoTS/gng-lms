"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { resendInvite, setUserActive, setUserRole } from "@/lib/actions/users";

export type UserRow = {
  id: string;
  name: string;
  email: string;
  role: "learner" | "admin";
  status: "active" | "invited" | "expired" | "deactivated";
  createdAtLabel: string;
};

const STATUS_LABEL: Record<UserRow["status"], string> = {
  active: "Active",
  invited: "Invited",
  expired: "Invite expired",
  deactivated: "Deactivated",
};

const STATUS_CLASS: Record<UserRow["status"], string> = {
  active: "bg-success text-white",
  invited: "bg-accent text-ink",
  expired: "bg-accent text-ink",
  deactivated: "bg-line text-muted",
};

export function UsersTable({ initialUsers }: { initialUsers: UserRow[] }) {
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return initialUsers;
    return initialUsers.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    );
  }, [initialUsers, query]);

  return (
    <div className="space-y-3">
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by name or email"
        className="w-full rounded-control border border-line bg-paper px-3 py-2 text-step-0 text-ink"
      />

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full text-left text-step-0">
          <thead className="sticky top-0 border-b border-line bg-surface text-step-n1 text-muted">
            <tr>
              <th className="px-3 py-2 font-medium">Name</th>
              <th className="px-3 py-2 font-medium">Email</th>
              <th className="px-3 py-2 font-medium">Role</th>
              <th className="px-3 py-2 font-medium">Status</th>
              <th className="px-3 py-2 font-medium">Created</th>
              <th className="px-3 py-2 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <UserRowView key={u.id} user={u} />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="px-3 py-4 text-center text-muted">
                  No users match.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UserRowView({ user }: { user: UserRow }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string>();

  function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setError(undefined);
    startTransition(async () => {
      const result = await action();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleToggleRole() {
    run(() => setUserRole(user.id, user.role === "admin" ? "learner" : "admin"));
  }

  function handleResend() {
    run(() => resendInvite(user.id));
  }

  function handleToggleActive() {
    if (user.status !== "deactivated") {
      if (!confirm(`Deactivate ${user.name}? They won't be able to sign in until reactivated.`)) {
        return;
      }
    }
    run(() => setUserActive(user.id, user.status === "deactivated"));
  }

  return (
    <tr className="border-b border-line last:border-0">
      <td className="px-3 py-2">{user.name}</td>
      <td className="px-3 py-2 text-muted">{user.email}</td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className="text-step-n1">{user.role === "admin" ? "Admin" : "Learner"}</span>
          <button
            type="button"
            onClick={handleToggleRole}
            disabled={pending}
            className="rounded-control border border-line px-2 py-0.5 text-step-n1 disabled:opacity-50"
          >
            {user.role === "admin" ? "Demote to learner" : "Promote to admin"}
          </button>
        </div>
      </td>
      <td className="px-3 py-2">
        <div className="flex items-center gap-2">
          <span className={`rounded-control px-2 py-0.5 text-step-n1 font-medium ${STATUS_CLASS[user.status]}`}>
            {STATUS_LABEL[user.status]}
          </span>
          {(user.status === "invited" || user.status === "expired") && (
            <button
              type="button"
              onClick={handleResend}
              disabled={pending}
              className="rounded-control border border-line px-2 py-0.5 text-step-n1 disabled:opacity-50"
            >
              Resend invite
            </button>
          )}
        </div>
      </td>
      <td className="px-3 py-2 text-muted">{user.createdAtLabel}</td>
      <td className="px-3 py-2">
        <button
          type="button"
          onClick={handleToggleActive}
          disabled={pending}
          className="rounded-control border border-line px-2 py-0.5 text-step-n1 disabled:opacity-50"
        >
          {user.status === "deactivated" ? "Reactivate" : "Deactivate"}
        </button>
        {error && <p className="mt-1 text-step-n1 text-red-600">{error}</p>}
      </td>
    </tr>
  );
}
