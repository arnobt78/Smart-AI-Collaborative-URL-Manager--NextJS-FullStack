"use client";

import { useCallback, useEffect, useState } from "react";

type ListDialog = "create" | "edit" | null;

interface ListDialogState {
  dialog: ListDialog;
  listSlug: string | null;
}

interface UseListDialogRouteStateOptions {
  /** When `?dialog=edit` has no `list` param, treat the current list-detail slug as the target. */
  defaultEditSlug?: string | null;
}

const URLIST_DIALOG_HISTORY_KEY = "__urlistDialog";

type HistoryStateBag = Record<string, unknown> & {
  [URLIST_DIALOG_HISTORY_KEY]?: ListDialogState;
};

function closedDialogState(): ListDialogState {
  return { dialog: null, listSlug: null };
}

function asHistoryBag(state: unknown): HistoryStateBag {
  if (state && typeof state === "object" && !Array.isArray(state)) {
    return state as HistoryStateBag;
  }
  return {};
}

function parseListDialogState(
  search: string,
  defaultEditSlug?: string | null,
): ListDialogState {
  const params = new URLSearchParams(
    search.startsWith("?") ? search.slice(1) : search,
  );
  const dialog = params.get("dialog");
  const listSlug =
    params.get("list") ?? (dialog === "edit" ? defaultEditSlug ?? null : null);

  if (dialog === "create") return { dialog, listSlug: null };
  if (dialog === "edit" && listSlug) return { dialog, listSlug };
  return closedDialogState();
}

function dialogStateFromHistory(historyState: unknown): ListDialogState | null {
  const stored = asHistoryBag(historyState)[URLIST_DIALOG_HISTORY_KEY];
  if (!stored || typeof stored !== "object") return null;
  if (stored.dialog === "create") return { dialog: "create", listSlug: null };
  if (stored.dialog === "edit" && stored.listSlug) {
    return { dialog: "edit", listSlug: stored.listSlug };
  }
  if (stored.dialog === null) return closedDialogState();
  return null;
}

function currentHref(): string {
  return `${window.location.pathname}${window.location.search}${window.location.hash}`;
}

/**
 * REQ-0033 / Wave 4: Never change the visible href for dialog open/close.
 * Next 15 patches History API; stripping `?dialog=` on close still schedules RSC.
 * Deep-link query is mount-only; closed state lives in history.state (preferred on read).
 */
function writeListDialogHistory(
  nextState: ListDialogState,
  mode: "push" | "replace",
): void {
  const nextHistoryState: HistoryStateBag = {
    ...asHistoryBag(window.history.state),
    [URLIST_DIALOG_HISTORY_KEY]: nextState,
  };
  window.history[`${mode}State`](nextHistoryState, "", currentHref());
}

function readDialogState(defaultEditSlug?: string | null): ListDialogState {
  return (
    dialogStateFromHistory(window.history.state) ??
    parseListDialogState(window.location.search, defaultEditSlug)
  );
}

/**
 * List create/edit overlays are local UI. Browser back uses history.state on the
 * same href so Next does not schedule an `_rsc` flight.
 */
export function useListDialogRouteState(
  options?: UseListDialogRouteStateOptions,
) {
  const defaultEditSlug = options?.defaultEditSlug ?? null;
  const [state, setState] = useState<ListDialogState>(() =>
    typeof window === "undefined"
      ? closedDialogState()
      : readDialogState(defaultEditSlug),
  );

  useEffect(() => {
    const syncFromHistory = () => setState(readDialogState(defaultEditSlug));
    window.addEventListener("popstate", syncFromHistory);
    return () => window.removeEventListener("popstate", syncFromHistory);
  }, [defaultEditSlug]);

  const openCreateDialog = useCallback(() => {
    const nextState: ListDialogState = { dialog: "create", listSlug: null };
    setState(nextState);
    writeListDialogHistory(nextState, "push");
  }, []);

  const openEditDialog = useCallback(
    (listSlug?: string) => {
      const slug = listSlug ?? defaultEditSlug;
      if (!slug) return;
      const nextState: ListDialogState = { dialog: "edit", listSlug: slug };
      setState(nextState);
      writeListDialogHistory(nextState, "push");
    },
    [defaultEditSlug],
  );

  const closeDialog = useCallback(() => {
    const nextState = closedDialogState();
    setState(nextState);
    writeListDialogHistory(nextState, "replace");
  }, []);

  return {
    createDialogOpen: state.dialog === "create",
    editDialogSlug: state.dialog === "edit" ? state.listSlug : null,
    openCreateDialog,
    openEditDialog,
    closeDialog,
  };
}
