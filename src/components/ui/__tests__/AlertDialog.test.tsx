// REQ-0030 / REQ-0053: Parent-controlled dialogs retain pending confirmation state.
import { act, fireEvent, render, screen } from "@testing-library/react";
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

  it("ensures pending paint before confirm when enabled", async () => {
    const onOpenChange = jest.fn();
    const onConfirm = jest.fn().mockResolvedValue(undefined);
    const frameQueue: Array<FrameRequestCallback> = [];
    const requestFrame = jest
      .spyOn(window, "requestAnimationFrame")
      .mockImplementation((callback) => {
        frameQueue.push(callback);
        return 1;
      });

    render(
      <AlertDialog
        open
        onOpenChange={onOpenChange}
        title="Create Collection"
        description="Create this collection now."
        confirmText="Create Collection"
        pendingText="Creating…"
        ensurePendingPaint
        closeOnConfirm={false}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Create Collection" }));
    expect(screen.getByRole("button", { name: "Creating…" })).toBeDisabled();
    expect(onConfirm).not.toHaveBeenCalled();

    await act(async () => {
      frameQueue.shift()?.(0);
      await Promise.resolve();
      frameQueue.shift()?.(0);
      await Promise.resolve();
    });

    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(onOpenChange).not.toHaveBeenCalled();
    requestFrame.mockRestore();
  });

});
