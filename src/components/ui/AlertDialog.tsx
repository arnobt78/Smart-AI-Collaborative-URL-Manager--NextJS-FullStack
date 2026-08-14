"use client";

import React, { useEffect } from "react";
import ReactDOM from "react-dom";
import { Check, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/Button";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: "default" | "destructive";
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
}: AlertDialogProps) {
  useEffect(() => {
    if (open) {
      const scrollY = window.scrollY;
      document.body.style.position = "fixed";
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = "100%";
      document.body.style.overflow = "hidden";

      return () => {
        document.body.style.position = "";
        document.body.style.top = "";
        document.body.style.width = "";
        document.body.style.overflow = "";
        window.scrollTo(0, scrollY);
      };
    }
  }, [open]);

  if (!open) return null;

  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  const dialogContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-md p-4"
      onClick={handleCancel}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <div
        className="relative w-full max-w-md mx-3 sm:mx-4 flex flex-col gap-4 sm:gap-6 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-xl sm:rounded-2xl shadow-2xl border border-white/20 p-4 sm:p-6 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          className="absolute top-3 right-3 sm:top-4 sm:right-4 text-white/60 hover:text-white transition-colors z-10"
          aria-label="Close"
        >
          <X className="h-4 w-4 sm:h-5 sm:w-5" />
        </button>

        <div className="pr-6 sm:pr-8 flex flex-col gap-1">
          <h3 className="text-lg sm:text-xl font-medium text-white leading-tight">
            {title}
          </h3>
          <p className="text-sm sm:text-base text-white/70 leading-snug">
            {description}
          </p>
        </div>

        <div className="flex justify-end gap-2 sm:gap-3">
          <Button type="button" variant="ghost" onClick={handleCancel}>
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={variant === "destructive" ? "destructive" : "primary"}
            onClick={handleConfirm}
          >
            {variant === "destructive" ? (
              <Trash2 className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <Check className="h-4 w-4 shrink-0" aria-hidden />
            )}
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );

  if (typeof window === "undefined") {
    return null;
  }

  return ReactDOM.createPortal(dialogContent, document.body);
}
