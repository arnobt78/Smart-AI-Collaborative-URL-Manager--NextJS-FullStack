"use client";

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
}: AlertDialogProps) {
  const handleConfirm = () => {
    if (pending) return;
    void onConfirm();
    if (closeOnConfirm) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} pending={pending} headerMode="scroll">
      <div className="flex justify-end gap-2">
        <CancelButton onClick={() => onOpenChange(false)} disabled={pending}>{cancelText}</CancelButton>
        <Button
          type="button"
          variant={variant === "destructive" ? "destructive" : "primary"}
          onClick={handleConfirm}
          isLoading={pending}
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
