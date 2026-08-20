// REQ-0021: Guard the scrollable single-header dialog contract and action icon labels.
import { fireEvent, render, screen } from "@testing-library/react";
import { CancelButton, ClearButton } from "@/components/ui/ActionButtons";
import { Dialog } from "@/components/ui/Dialog";

describe("Dialog", () => {
  it("renders exactly one accessible header inside the scroll surface", () => {
    const onOpenChange = jest.fn();

    render(
      <Dialog
        open
        onOpenChange={onOpenChange}
        title="Create a New List"
        description="Organize URLs into a shareable collection."
        headerMode="scroll"
      >
        <form aria-label="create list form">Form content</form>
      </Dialog>,
    );

    expect(screen.getAllByRole("heading", { name: "Create a New List" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("uses the compact divider-free header rhythm for fixed dialogs", () => {
    render(
      <Dialog
        open
        onOpenChange={jest.fn()}
        title="Delete List"
        description="This action cannot be undone."
      >
        <p>Confirmation content</p>
      </Dialog>,
    );

    const header = screen.getByRole("heading", { name: "Delete List" }).closest("header");
    expect(header).toHaveClass("pb-2", "sm:pb-4");
    expect(header).not.toHaveClass("border-b");
  });

  it("uses the shared labelled action buttons", () => {
    render(
      <>
        <CancelButton>Cancel</CancelButton>
        <ClearButton>Clear</ClearButton>
      </>,
    );

    expect(screen.getByRole("button", { name: /cancel/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /clear/i })).toBeInTheDocument();
  });
});
