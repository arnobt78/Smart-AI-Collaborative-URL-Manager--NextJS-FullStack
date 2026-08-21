/**
 * @jest-environment jsdom
 */
import React from "react";
import { render, screen } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { listQueryKeys } from "@/lib/query-keys";
import {
  markWarmSoftNav,
  resetWarmSoftNavForTests,
} from "@/lib/soft-nav-cache";
import {
  ApiStatusSoftNavLoading,
  ListsSoftNavLoading,
} from "@/components/ui/SoftNavLoading";

jest.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("C7.0 SoftNavLoading", () => {
  beforeEach(() => {
    resetWarmSoftNavForTests();
  });

  it("paints full lists chrome when warm and RQ has data", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.allLists(), {
      lists: [
        {
          id: "1",
          slug: "demo",
          title: "Demo List",
          isPublic: true,
          description: "Demo description",
          urls: [],
          createdAt: "2026-08-20T00:00:00.000Z",
        },
      ],
    });
    markWarmSoftNav();

    render(
      <QueryClientProvider client={client}>
        <ListsSoftNavLoading />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Demo List")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Create New List/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/View Demo List/i)).toBeInTheDocument();
    expect(screen.getByText("Demo description")).toBeInTheDocument();
    expect(screen.queryByText("Preparing your lists")).not.toBeInTheDocument();
  });

  it("shows lists skeleton when cold", () => {
    const client = new QueryClient();
    render(
      <QueryClientProvider client={client}>
        <ListsSoftNavLoading />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Preparing your lists")).toBeInTheDocument();
  });

  it("falls back to skeleton when warm but RQ empty", () => {
    const client = new QueryClient();
    markWarmSoftNav();

    render(
      <QueryClientProvider client={client}>
        <ListsSoftNavLoading />
      </QueryClientProvider>,
    );

    expect(screen.getByText("Preparing your lists")).toBeInTheDocument();
  });
});

describe("C7.5 ApiStatusSoftNavLoading", () => {
  it("paints chrome shell with value pulses (not center spinner)", () => {
    render(<ApiStatusSoftNavLoading />);
    expect(screen.getByText("API Status")).toBeInTheDocument();
    expect(screen.getByText("System Status")).toBeInTheDocument();
    expect(screen.getByText("Lists API")).toBeInTheDocument();
    expect(screen.getByLabelText("Loading status")).toBeInTheDocument();
    expect(screen.queryByText("Checking API status")).not.toBeInTheDocument();
  });
});
