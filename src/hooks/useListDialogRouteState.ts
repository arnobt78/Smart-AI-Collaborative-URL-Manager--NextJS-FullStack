"use client";

import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";

type ListDialog = "create" | "edit" | null;

interface ListDialogState {
  dialog: ListDialog;
  listSlug: string | null;
}

type SearchParamsLike = Pick<URLSearchParams, "get"> | null;

function parseListDialogState(searchParams: SearchParamsLike): ListDialogState {
  // Next may expose nullable search params during an initial client render.
  // Native history remains the canonical fallback for local dialog state.
  const params = searchParams ?? new URLSearchParams(
    typeof window === "undefined" ? "" : window.location.search,
  );
  const dialog = params.get("dialog");
  const listSlug = params.get("list");

  if (dialog === "create") return { dialog, listSlug: null };
  if (dialog === "edit" && listSlug) return { dialog, listSlug };
  return { dialog: null, listSlug: null };
}

function currentListDialogState(): ListDialogState {
  return parseListDialogState(new URLSearchParams(window.location.search));
}

function writeListDialogUrl(nextState: ListDialogState, mode: "push" | "replace"): void {
  const url = new URL(window.location.href);

  if (nextState.dialog === "create") {
    url.searchParams.set("dialog", "create");
    url.searchParams.delete("list");
  } else if (nextState.dialog === "edit" && nextState.listSlug) {
    url.searchParams.set("dialog", "edit");
    url.searchParams.set("list", nextState.listSlug);
  } else {
    url.searchParams.delete("dialog");
    url.searchParams.delete("list");
  }

  window.history[`${mode}State`](window.history.state, "", url);
}

/**
 * REQ-0030: List dialogs are local UI state. Native history preserves direct
 * links and browser navigation without waiting for a Next RSC navigation.
 */
export function useListDialogRouteState() {
  const searchParams = useSearchParams();
  const [state, setState] = useState<ListDialogState>(() => parseListDialogState(searchParams));

  useEffect(() => {
    const syncFromHistory = () => setState(currentListDialogState());
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, []);

  const openCreateDialog = useCallback(() => {
    const nextState: ListDialogState = { dialog: "create", listSlug: null };
    setState(nextState);
    writeListDialogUrl(nextState, "push");
  }, []);

  const openEditDialog = useCallback((listSlug: string) => {
    const nextState: ListDialogState = { dialog: "edit", listSlug };
    setState(nextState);
    writeListDialogUrl(nextState, "push");
  }, []);

  const closeDialog = useCallback(() => {
    const nextState: ListDialogState = { dialog: null, listSlug: null };
    setState(nextState);
    writeListDialogUrl(nextState, "replace");
  }, []);

  return {
    createDialogOpen: state.dialog === "create",
    editDialogSlug: state.dialog === "edit" ? state.listSlug : null,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  };
}
