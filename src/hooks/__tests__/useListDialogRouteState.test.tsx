// REQ-0033 / Wave 4: Hydrated dialog history stays local; deep-link close must not strip search.
import { act, renderHook } from "@testing-library/react";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";

describe("useListDialogRouteState", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/lists");
  });

  it("opens and closes create locally without writing search params", () => {
    const { result } = renderHook(() => useListDialogRouteState());

    act(() => result.current.openCreateDialog());
    expect(result.current.createDialogOpen).toBe(true);
    expect(window.location.search).toBe("");
    expect(window.location.pathname).toBe("/lists");

    act(() => result.current.closeDialog());
    expect(result.current.createDialogOpen).toBe(false);
    expect(window.location.search).toBe("");
  });

  it("closes a deep-link edit without stripping the query (no RSC href change)", () => {
    window.history.replaceState({}, "", "/lists?dialog=edit&list=cached-list");
    const { result } = renderHook(() => useListDialogRouteState());

    expect(result.current.editDialogSlug).toBe("cached-list");

    act(() => result.current.closeDialog());
    expect(result.current.editDialogSlug).toBeNull();
    expect(window.location.search).toBe("?dialog=edit&list=cached-list");
  });

  it("synchronizes browser back transitions via history.state", () => {
    window.history.replaceState({}, "", "/lists?dialog=edit&list=cached-list");
    const { result } = renderHook(() => useListDialogRouteState());
    expect(result.current.editDialogSlug).toBe("cached-list");

    act(() => {
      window.history.pushState({}, "", "/lists");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.editDialogSlug).toBeNull();
  });

  it("treats list-detail ?dialog=edit as the current slug", () => {
    window.history.replaceState({}, "", "/list/daily?dialog=edit");
    const { result } = renderHook(() =>
      useListDialogRouteState({ defaultEditSlug: "daily" }),
    );

    expect(result.current.editDialogSlug).toBe("daily");
    expect(result.current.createDialogOpen).toBe(false);
  });
});
