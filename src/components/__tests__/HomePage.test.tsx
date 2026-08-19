import { render, screen } from "@testing-library/react";
import HomePage from "@/components/HomePage";
import { useSession } from "@/hooks/useSession";
import { useWasAuthedHint } from "@/hooks/useWasAuthedHint";

jest.mock("@/hooks/useSession", () => ({
  useSession: jest.fn(),
}));

jest.mock("@/hooks/useWasAuthedHint", () => ({
  useWasAuthedHint: jest.fn(),
}));

jest.mock("@/components/ui/ScrollReveal", () => ({
  ScrollReveal: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

const mockedUseSession = jest.mocked(useSession);
const mockedUseWasAuthedHint = jest.mocked(useWasAuthedHint);

describe("HomePage", () => {
  beforeEach(() => {
    mockedUseSession.mockReturnValue({
      user: { id: "user-1", email: "user@example.com" },
      isLoading: false,
      isFetching: false,
      isAuthenticated: true,
      error: null,
      refetch: jest.fn(),
    } as ReturnType<typeof useSession>);
    mockedUseWasAuthedHint.mockReturnValue(true);
  });

  it("uses the login-form stagger for authenticated hero rows", () => {
    render(<HomePage />);

    expect(screen.getByAltText("Explore").closest(".auth-reveal-delay-0")).not.toBeNull();
    expect(screen.getByRole("heading", { name: "The Daily Urlist" }).closest(".auth-reveal-delay-1")).not.toBeNull();
    expect(screen.getByText("Create and share lists of URLs easily.").closest(".auth-reveal-delay-2")).not.toBeNull();
    expect(screen.getByText("Perfect for sharing resources, bookmarks, and collections with others.").closest(".auth-reveal-delay-3")).not.toBeNull();

    const createLink = screen.getByRole("link", { name: /Create New List/i });
    const listsLink = screen.getByRole("link", { name: /View My Lists/i });
    const ctaRow = createLink.closest(".auth-reveal-delay-4");

    expect(ctaRow).toContainElement(listsLink);
    expect(createLink).toHaveAttribute("href", "/lists?dialog=create");
    expect(listsLink).toHaveAttribute("href", "/lists");
  });
});
