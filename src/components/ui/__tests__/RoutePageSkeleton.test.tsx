import { render } from "@testing-library/react";
import {
  BrowseRouteSkeleton,
  InsightsRouteSkeleton,
  ListDetailRouteSkeleton,
  ListsRouteSkeleton,
} from "@/components/ui/RoutePageSkeleton";

describe("C6.6 RoutePageSkeleton presets", () => {
  it("renders Lists shell with local data slot", () => {
    const { container } = render(<ListsRouteSkeleton />);
    expect(container.textContent).toMatch(/My Lists/);
    expect(container.textContent).toMatch(/Preparing your lists/);
  });

  it("renders Browse shell with local data slot", () => {
    const { container } = render(<BrowseRouteSkeleton />);
    expect(container.textContent).toMatch(/Discover Public Lists/);
    expect(container.textContent).toMatch(/Preparing public lists/);
  });

  it("renders Insights shell with local data slot", () => {
    const { container } = render(<InsightsRouteSkeleton />);
    expect(container.textContent).toMatch(/Business Insights/);
    expect(container.textContent).toMatch(/Preparing insights/);
  });

  it("renders list detail shell with local data slot", () => {
    const { container } = render(<ListDetailRouteSkeleton />);
    expect(container.textContent).toMatch(/Opening list/);
    expect(container.textContent).toMatch(/Preparing list/);
  });
});
