"use client";

/**
 * AuthToastBridge — fires queued welcome/goodbye toasts after hard redirect.
 * Must sit inside ToastProvider (see app/layout.tsx).
 */
import { useEffect, useRef } from "react";
import { useToast } from "@/components/ui/Toaster";
import {
  consumeAuthToast,
  resolveAuthToastCopy,
} from "@/lib/auth-toast";

export function AuthToastBridge() {
  const { toast } = useToast();
  const didConsume = useRef(false);

  useEffect(() => {
    if (didConsume.current) return;
    didConsume.current = true;
    const pending = consumeAuthToast();
    if (!pending) return;
    const copy = resolveAuthToastCopy(pending);
    toast({
      title: copy.title,
      description: copy.description,
      variant: copy.variant,
    });
  }, [toast]);

  return null;
}
