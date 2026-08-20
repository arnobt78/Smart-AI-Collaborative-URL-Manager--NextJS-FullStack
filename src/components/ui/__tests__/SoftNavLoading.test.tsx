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
import { ListsSoftNavLoading } from "@/components/ui/SoftNavLoading";

jest.mock("next/navigation", () => ({
  useParams: () => ({}),
  useSearchParams: () => new URLSearchParams(),
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
}));

describe("C6.9 SoftNavLoading", () => {
  beforeEach(() => {
    resetWarmSoftNavForTests();
  });

  it("paints optimistic lists surface when warm and RQ has data", () => {
    const client = new QueryClient();
    client.setQueryData(listQueryKeys.allLists(), {
      lists: [
        {
          id: "1",
          slug: "demo",
          title: "Demo List",
          isPublic: true,
          urls: [],
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
