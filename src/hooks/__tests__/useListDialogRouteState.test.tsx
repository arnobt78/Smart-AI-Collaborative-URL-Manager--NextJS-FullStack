// REQ-0030: Dialog URL state must remain local and never require router navigation.
import { act, renderHook } from "@testing-library/react";
import { useListDialogRouteState } from "@/hooks/useListDialogRouteState";

jest.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

describe("useListDialogRouteState", () => {
  beforeEach(() => {
    window.history.replaceState({}, "", "/lists");
  });

  it("opens and closes create locally while mirroring the deep-link URL", () => {
    const { result } = renderHook(() => useListDialogRouteState());

    act(() => result.current.openCreateDialog());
    expect(result.current.createDialogOpen).toBe(true);
    expect(window.location.search).toBe("?dialog=create");

    act(() => result.current.closeDialog());
    expect(result.current.createDialogOpen).toBe(false);
    expect(window.location.search).toBe("");
  });

  it("initializes direct edit links and synchronizes browser back transitions", () => {
    window.history.replaceState({}, "", "/lists?dialog=edit&list=cached-list");
    const { result } = renderHook(() => useListDialogRouteState());

    expect(result.current.editDialogSlug).toBe("cached-list");

    act(() => {
      window.history.pushState({}, "", "/lists");
      window.dispatchEvent(new PopStateEvent("popstate"));
    });
    expect(result.current.editDialogSlug).toBeNull();
  });
});
