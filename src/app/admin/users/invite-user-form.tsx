"use client";

import { useActionState, useRef } from "react";
import { useRouter } from "next/navigation";
import { inviteUser } from "@/lib/actions/users";

type InviteState = { error?: string; success?: boolean };

export function InviteUserForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);

  const [state, formAction, pending] = useActionState<InviteState, FormData>(
    async (_prev, formData) => {
      const name = String(formData.get("name") ?? "");
      const email = String(formData.get("email") ?? "");
      const role = formData.get("admin") === "on" ? "admin" : "learner";

      const result = await inviteUser(email, name, role);
      if (!result.ok) return { error: result.error };

      formRef.current?.reset();
      router.refresh();
      return { success: true };
    },
    {},
  );

  return (
    <form ref={formRef} action={formAction} className="space-y-3">
      <h2 className="text-step-1 font-semibold text-ink">Invite a user</h2>
      <div className="flex flex-wrap gap-2">
        <input
          name="name"
          required
          placeholder="Name"
          className="flex-1 rounded-control border border-line bg-paper px-3 py-2 text-step-0 text-ink"
        />
        <input
          name="email"
          type="email"
          required
          placeholder="Email"
          className="flex-1 rounded-control border border-line bg-paper px-3 py-2 text-step-0 text-ink"
        />
        <label className="flex items-center gap-1.5 text-step-0 text-ink">
          <input name="admin" type="checkbox" />
          Make admin
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-control bg-primary px-3 py-2 text-step-0 font-medium text-white disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>
      {state.error && <p className="text-step-n1 text-red-600">{state.error}</p>}
      {state.success && <p className="text-step-n1 text-success">Invite sent.</p>}
    </form>
  );
}
