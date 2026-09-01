"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { ToastComponent, type Toast } from "./Toast";

export type ToastInput = Omit<Toast, "id">;

interface ToastContextType {
  toast: (toast: ToastInput) => string;
  updateToast: (id: string, updates: Partial<ToastInput>) => void;
  dismissToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((newToast: ToastInput) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { ...newToast, id }]);
    return id;
  }, []);

  const updateToast = useCallback((id: string, updates: Partial<ToastInput>) => {
    setToasts((prev) =>
      prev.map((toast) => (toast.id === id ? { ...toast, ...updates } : toast)),
    );
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  return (
    <ToastContext.Provider
      value={{ toast: addToast, updateToast, dismissToast: removeToast }}
    >
      {children}
      {/* Bottom-right stack — enter via toast-slide-in (globals.css) */}
      <div
        className="fixed bottom-4 right-4 z-[9999] flex w-[min(100%-2rem,28rem)] max-w-md flex-col items-end gap-2 pointer-events-none"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto w-full">
            <ToastComponent toast={toast} onClose={removeToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
