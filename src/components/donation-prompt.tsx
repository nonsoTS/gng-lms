"use client";

import { useEffect, useState } from "react";

const DISMISS_KEY = "gng-donation-dismissed-at";
const COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000; // ~14 days, per SPEC.md §6

export function DonationPrompt({ donationUrl }: { donationUrl: string }) {
  // Starts hidden — localStorage isn't available during SSR, and this avoids
  // a hydration mismatch (server always renders "not yet decided" as hidden).
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // localStorage only exists client-side, so this can't be computed during
    // render without a server/client mismatch — an effect reading an
    // external-to-React source on mount is the legitimate case the "no
    // setState in effect" lint rule's own docs carve out.
    try {
      const dismissedAt = window.localStorage.getItem(DISMISS_KEY);
      const withinCooldown = dismissedAt !== null && Date.now() - Number(dismissedAt) < COOLDOWN_MS;
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisible(!withinCooldown);
    } catch {
      // localStorage can throw (private browsing, blocked site data) — fail
      // open and just show the banner rather than crash the page over it.
      setVisible(true);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      window.localStorage.setItem(DISMISS_KEY, String(Date.now()));
    } catch {
      // Nothing to do if storage is unavailable — it'll just show again next time.
    }
  }

  if (!visible) return null;

  return (
    <div className="flex items-center justify-between gap-4 border-b border-neutral-200 bg-neutral-50 px-4 py-2 text-sm">
      <p>
        Enjoying Growth and Giggles? It&apos;s free and always will be — consider
        supporting us with a donation.
      </p>
      <div className="flex shrink-0 items-center gap-3">
        <a
          href={donationUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded bg-neutral-900 px-3 py-1 font-medium text-white"
        >
          Donate
        </a>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss"
          className="text-neutral-500 hover:text-neutral-800"
        >
          ×
        </button>
      </div>
    </div>
  );
}
