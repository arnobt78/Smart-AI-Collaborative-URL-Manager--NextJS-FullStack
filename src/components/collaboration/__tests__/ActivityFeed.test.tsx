import { fireEvent, render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ActivityFeed } from "@/components/collaboration/ActivityFeed";

jest.mock("next/navigation", () => ({ useParams: () => ({ slug: "list-slug" }) }));

describe("REQ-0028 Activity Feed disclosure", () => {
  it("is collapsed by default and expands on request", () => {
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(
      <QueryClientProvider client={queryClient}>
        <ActivityFeed listId="list-id" />
      </QueryClientProvider>,
    );

    const trigger = screen.getByRole("button", { name: /activity feed/i });
    expect(trigger).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByText(/no activity yet/i)).not.toBeInTheDocument();

    fireEvent.click(trigger);
    expect(trigger).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText(/no activity yet/i)).toBeInTheDocument();
  });
});
