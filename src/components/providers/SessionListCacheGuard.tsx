"use client";

/**
 * C7.34: Drop My Lists cache when the signed-in user changes so the previous
 * account's cards cannot paint for one frame (3→2 soft-nav flicker).
 */
import { useLayoutEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSession } from "@/hooks/useSession";
import { listQueryKeys } from "@/lib/query-keys";
import { currentList } from "@/stores/urlListStore";

export function SessionListCacheGuard({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = useSession();
  const queryClient = useQueryClient();
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // useLayoutEffect: clear before paint so prior account cards never flash
  useLayoutEffect(() => {
    const nextId = user?.id ?? null;
    if (prevUserIdRef.current === undefined) {
      prevUserIdRef.current = nextId;
      return;
    }
    if (prevUserIdRef.current === nextId) return;

    prevUserIdRef.current = nextId;
    queryClient.removeQueries({ queryKey: listQueryKeys.allLists() });
    // Avoid painting prior account's detail store on My Lists soft-nav
    currentList.set({});
  }, [user?.id, queryClient]);

  return <>{children}</>;
}
