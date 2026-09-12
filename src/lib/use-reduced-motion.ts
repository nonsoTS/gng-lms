"use client";

import { useEffect, useState } from "react";

export function usePrefersReducedMotion() {
  // Starts false — matchMedia isn't available during SSR, and this avoids a
  // hydration mismatch (server always renders "not yet decided" as false).
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    // Reading matchMedia on mount is the legitimate "external source, not
    // computable during render" case the "no setState in effect" lint rule's
    // own docs carve out — see donation-prompt.tsx for the same pattern.
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}
