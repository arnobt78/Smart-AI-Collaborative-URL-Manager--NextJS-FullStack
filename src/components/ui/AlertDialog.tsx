"use client";

import { Check, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Dialog } from "@/components/ui/Dialog";

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
}: AlertDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} title={title} description={description} pending={pending}>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={pending}>{cancelText}</Button>
        <Button type="button" variant={variant === "destructive" ? "destructive" : "primary"} onClick={() => { void onConfirm(); onOpenChange(false); }} isLoading={pending}>
          {variant === "destructive" ? <Trash2 className="h-4 w-4 shrink-0" aria-hidden /> : <Check className="h-4 w-4 shrink-0" aria-hidden />}
          {pending ? `${confirmText}…` : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
