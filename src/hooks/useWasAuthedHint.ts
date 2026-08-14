"use client";

/**
 * useWasAuthedHint — SSR cookie/session seed + session sync.
 * initialWasAuthed from cookies() avoids Auth flash / empty profile on refresh.
 * Also migrates legacy localStorage-only hint → cookie on mount.
 */
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { WAS_AUTHED_KEY } from "@/constants/auth";
import { setWasAuthedHintClient } from "@/lib/was-authed";

/**
 * @param initialWasAuthed — from server cookies() (urlist_was_authed or session_token)
 * @returns current hint boolean for HomePage / Navbar gates
 */
export function useWasAuthedHint(initialWasAuthed: boolean): boolean {
  const [hint, setHint] = useState(initialWasAuthed);
  const { user, isLoading, isAuthenticated } = useSession();

  // One-shot: promote legacy LS hint to cookie when SSR had neither
  useEffect(() => {
    if (initialWasAuthed) return;
    try {
      if (localStorage.getItem(WAS_AUTHED_KEY) === "1") {
        setWasAuthedHintClient(true);
        setHint(true);
      }
    } catch {
      // ignore
    }
  }, [initialWasAuthed]);

  // Keep cookie + LS aligned when session resolves
  useEffect(() => {
    if (isAuthenticated && user?.email) {
      setWasAuthedHintClient(true);
      setHint(true);
    } else if (!isLoading && !isAuthenticated) {
      setWasAuthedHintClient(false);
      setHint(false);
    }
  }, [isAuthenticated, isLoading, user?.email]);

  return hint;
}
