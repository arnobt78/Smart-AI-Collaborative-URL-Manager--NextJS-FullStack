// REQ-0030: Destructive dialogs may be parent-controlled through async completion.
import { fireEvent, render, screen } from "@testing-library/react";
import { AlertDialog } from "@/components/ui/AlertDialog";

describe("AlertDialog", () => {
  it("stays open while a parent-controlled confirmation is pending", () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();

    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Delete List"
        description="Delete this list permanently."
        confirmText="Delete"
        pendingText="Deleting…"
        pending
        closeOnConfirm={false}
        onConfirm={onConfirm}
        variant="destructive"
      />,
    );

    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Close dialog" }));
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("defers dismissal to the parent after confirmation when requested", () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn();

    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Delete List"
        description="Delete this list permanently."
        closeOnConfirm={false}
        onConfirm={onConfirm}
        variant="destructive"
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
  });
});
