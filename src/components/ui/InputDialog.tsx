"use client";

import React, { useState, useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Input } from "./Input";
import { Button } from "./Button";

interface InputDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  label: string;
  placeholder?: string;
  type?: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: (value: string) => void | Promise<void>;
  variant?: "default" | "destructive";
  defaultValue?: string;
  validate?: (value: string) => string | null; // Return error message or null if valid
}

export function InputDialog({
  open,
  onOpenChange,
  title,
  description,
  label,
  placeholder = "",
  type = "text",
  confirmText = "Confirm",
  cancelText = "Cancel",
  onConfirm,
  variant = "default",
  defaultValue = "",
  validate,
}: InputDialogProps) {
  const [value, setValue] = useState(defaultValue);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setValue(defaultValue);
      setError(null);
      setIsLoading(false);
      // Auto-focus input when dialog opens
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [open, defaultValue]);

  if (!open) return null;

  const handleConfirm = async () => {
    // Don't allow multiple submissions
    if (isLoading) return;

    // Validate if validator provided
    if (validate) {
      const validationError = validate(value);
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      await onConfirm(value);
      // Note: onConfirm is responsible for closing the dialog and showing toast
      // We don't close it here to allow the parent to handle success/error flow
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    if (isLoading) return; // Prevent canceling while loading
    onOpenChange(false);
    setValue("");
    setError(null);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleConfirm();
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onClick={handleCancel}
    >
      <div
        className="relative w-full max-w-md mx-4 bg-gradient-to-br from-zinc-900 to-zinc-800 rounded-2xl shadow-2xl border border-white/20 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="pr-8">
          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>
          {description && <p className="text-white/70 mb-6">{description}</p>}
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {label}
            </label>
            <Input
              ref={inputRef}
              type={type}
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError(null); // Clear error when user types
              }}
              onKeyDown={handleKeyDown}
              placeholder={placeholder}
              error={error || undefined}
              className="w-full"
              disabled={isLoading}
            />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              onClick={handleCancel}
              disabled={isLoading}
              className="px-4 py-2 text-white/80 hover:text-white hover:bg-white/10 rounded-lg transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {cancelText}
            </Button>
            <Button
              type="button"
              onClick={handleConfirm}
              disabled={isLoading}
              isLoading={isLoading}
              className={`px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-70 disabled:cursor-not-allowed ${
                variant === "destructive"
                  ? "bg-red-600 hover:bg-red-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              {isLoading ? "Sending..." : confirmText}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
