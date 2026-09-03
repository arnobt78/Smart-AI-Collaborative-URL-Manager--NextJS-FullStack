"use client";

import { useState } from "react";
import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
import { Dialog } from "@/components/ui/Dialog";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: "default" | "destructive";
  pending?: boolean;
  closeOnConfirm?: boolean;
  pendingText?: string;
  ensurePendingPaint?: boolean;
}

export function AlertDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  pending = false,
  closeOnConfirm = true,
  pendingText,
  ensurePendingPaint = false,
}: AlertDialogProps) {
  const [localPending, setLocalPending] = useState(false);
  const isPending = pending || localPending;

  const waitForNextFrame = () =>
    new Promise<void>((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });

  const handleConfirm = async () => {
    if (isPending) return;

    if (ensurePendingPaint && !pending) {
      setLocalPending(true);
      // Two frames ensures pending controls are visually committed before async work starts.
      await waitForNextFrame();
      await waitForNextFrame();
    }

    try {
      await onConfirm();
      if (closeOnConfirm) onOpenChange(false);
    } finally {
      if (ensurePendingPaint) {
        setLocalPending(false);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} pending={isPending} headerMode="scroll">
      <div className="flex justify-end gap-2">
        <CancelButton onClick={() => onOpenChange(false)} disabled={isPending}>{cancelText}</CancelButton>
        <Button
          type="button"
          variant={variant === "destructive" ? "destructive" : "primary"}
          onClick={() => void handleConfirm()}
          isLoading={isPending}
          loadingText={pendingText ?? `${confirmText}…`}
        >
          {variant === "destructive" ? (
            <Trash2 className={UI_ICON_CONTROL} aria-hidden />
          ) : (
            <Check className={UI_ICON_CONTROL} aria-hidden />
          )}
          {confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
