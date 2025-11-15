"use client";

import React, { useEffect } from "react";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Toast {
  id: string;
  title?: string;
  description: string;
  variant?: "default" | "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastProps {
  toast: Toast;
  onClose: (id: string) => void;
}

export function ToastComponent({ toast, onClose }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose(toast.id);
    }, toast.duration || 5000);

    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onClose]);

  const variantStyles = {
    default: "bg-white/10 border-white/20 text-white",
    success: "bg-green-500/20 border-green-500/30 text-green-100",
    error: "bg-red-500/20 border-red-500/30 text-red-100",
    warning: "bg-yellow-500/20 border-yellow-500/30 text-yellow-100",
    info: "bg-blue-500/20 border-blue-500/30 text-blue-100",
  };

  return (
    <div
      className={cn(
        "group relative w-full max-w-md bg-white/5 backdrop-blur-md border rounded-lg shadow-lg p-4 transition-all duration-300 animate-slide-up",
        variantStyles[toast.variant || "default"]
      )}
    >
      <button
        onClick={() => onClose(toast.id)}
        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-white/10"
        aria-label="Close"
      >
        <X className="h-4 w-4" />
      </button>

      {toast.title && (
        <div className="font-semibold text-sm mb-1 pr-6">{toast.title}</div>
      )}
      <div className="text-sm pr-6">{toast.description}</div>
    </div>
  );
}
