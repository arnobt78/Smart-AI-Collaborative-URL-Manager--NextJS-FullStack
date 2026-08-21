"use client";

/**
 * useWasAuthedHint — SSR cookie/session seed + session sync.
 * initialWasAuthed from cookies() avoids Auth flash / empty profile on refresh.
 * C7.7: force-guest (optimistic logout) wins over SSR session_token seed.
 * Keep forceGuest until login — clearing it when session briefly looks empty
 * caused Auth → Marketing → Auth flicker.
 */
import { useEffect, useState } from "react";
import { useSession } from "@/hooks/useSession";
import { WAS_AUTHED_KEY } from "@/constants/auth";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { isForceGuest } from "@/lib/logout-client";

/**
 * @param initialWasAuthed — from server cookies() (urlist_was_authed or session_token)
 * @returns current hint boolean for HomePage / Navbar gates
 */
export function useWasAuthedHint(initialWasAuthed: boolean): boolean {
  const [hint, setHint] = useState(() =>
    isForceGuest() ? false : initialWasAuthed,
  );
  const { user, isLoading, isAuthenticated } = useSession();

  // One-shot: promote legacy LS hint to cookie when SSR had neither
  useEffect(() => {
    if (initialWasAuthed || isForceGuest()) return;
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
    if (isForceGuest()) {
      setHint(false);
      return;
    }
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
