"use client";

import { useState, type FormEvent } from "react";
import { authClient } from "@/lib/auth-client";

export function SignInForm({ initialError }: { initialError?: string }) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");

    const { error } = await authClient.signIn.magicLink({
      email,
      callbackURL: "/",
      errorCallbackURL: "/sign-in",
    });

    setStatus(error ? "error" : "sent");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-paper p-6 sm:p-8">
      <div className="w-full max-w-sm">
        <h1 className="text-step-3 font-serif font-semibold text-ink">Sign in</h1>

        {initialError && status !== "sent" && (
          <div className="mt-4 rounded-card border border-line bg-surface p-3">
            <p className="text-step-n1 text-red-600">{initialError}</p>
          </div>
        )}

        {status === "sent" ? (
          <p className="mt-6 text-step-0 text-ink">
            Check your email for a sign-in link.
          </p>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-1">
            <label htmlFor="email" className="text-step-n1 font-medium text-ink">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="block min-h-11 w-full rounded-control border border-line bg-paper px-3 text-step-0 text-ink placeholder:text-muted focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            />
            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-3 min-h-11 w-full rounded-control bg-primary text-step-0 font-medium text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-50"
            >
              {status === "sending" ? "Sending…" : "Send sign-in link"}
            </button>
            {status === "error" && (
              <p className="mt-2 text-step-n1 text-red-600">
                Something went wrong. Try again.
              </p>
            )}
          </form>
        )}
      </div>
    </main>
  );
}
