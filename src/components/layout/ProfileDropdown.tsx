"use client";

/**
 * ProfileDropdown — PORTABLE_AUTH_UI_GUIDE §2.2
 * Positions like shadcn DropdownMenuContent (side=bottom, align=end):
 * `top-full` + `right-0` under the trigger — no manual flow/mt hacks.
 * Kept as custom panel (not Radix) so sticky Navbar does not scroll-lock.
 * Order: name+email → separator → utility links → separator → Logout.
 * REQ-BASE-001: Logout closes the menu immediately while server confirmation
 * remains authoritative before clearing authenticated client state.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useToast } from "@/components/ui/Toaster";
import { UTILITY_NAVIGATION_ITEMS } from "@/constants/auth";
import { displayNameFromEmail } from "@/lib/robohash";
import { queueAuthToast } from "@/lib/auth-toast";
import { setWasAuthedHintClient } from "@/lib/was-authed";

export type ProfileDropdownProps = {
  email: string;
  /** Optional display name; defaults to email local-part */
  fullName?: string;
  image?: string | null;
  /** Preserve Navbar import-guard navigation */
  onNavigate?: (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string,
  ) => void;
};

export function ProfileDropdown({
  email,
  fullName,
  image,
  onNavigate,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [isLogoutSlow, setIsLogoutSlow] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const logoutInFlightRef = useRef(false);
  const slowLogoutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const name = fullName || displayNameFromEmail(email);

  useEffect(() => {
    if (!open) return;
    const onDoc = (event: MouseEvent) => {
      if (
        rootRef.current &&
        !rootRef.current.contains(event.target as Node)
      ) {
        setOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    return () => {
      if (slowLogoutTimerRef.current) {
        clearTimeout(slowLogoutTimerRef.current);
      }
    };
  }, []);

  const clearSlowLogoutTimer = () => {
    if (slowLogoutTimerRef.current) {
      clearTimeout(slowLogoutTimerRef.current);
      slowLogoutTimerRef.current = null;
    }
  };

  const handleLogout = async () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;
    setOpen(false);
    slowLogoutTimerRef.current = setTimeout(() => {
      setIsLogoutSlow(true);
    }, 1200);

    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
      });

      if (!response.ok) {
        throw new Error("Failed to sign out");
      }

      clearSlowLogoutTimer();
      setIsLogoutSlow(false);
      queueAuthToast({ kind: "goodbye", name });
      await queryClient.cancelQueries();
      queryClient.clear();
      if (typeof window !== "undefined") {
        setWasAuthedHintClient(false);
        Object.keys(localStorage).forEach((key) => {
          if (key.startsWith("react-query:")) {
            localStorage.removeItem(key);
          }
        });
        // A server-confirmed hard replacement prevents an authenticated RSC race
        // and removes the previous protected page from browser history.
        window.location.replace("/");
      }
    } catch {
      clearSlowLogoutTimer();
      setIsLogoutSlow(false);
      logoutInFlightRef.current = false;
      toast({
        title: "Logout Failed",
        description: "Please try again.",
        variant: "error",
      });
    }
  };

  return (
    // Relative trigger box — menu uses top-full (below) + right-0 (align end)
    <div className="relative size-10 shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 p-0 leading-none appearance-none transition hover:border-white/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/50 focus-visible:ring-offset-0"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <UserAvatar
          seed={email}
          src={image}
          size={40}
          alt={name}
          className="border-0 bg-transparent size-full"
        />
      </button>

      {isLogoutSlow && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-4 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-blue-500/30 bg-blue-500/20 px-4 py-3 text-sm text-blue-100 shadow-lg backdrop-blur-md sm:left-auto sm:right-4 sm:translate-x-0"
        >
          Signing out…
        </div>
      )}

      {open && (
        <div
          role="menu"
          // shadcn-equivalent: side=bottom → top-full; align=end → right-0; sideOffset ≈ gap-1.5
          className="absolute right-0 top-full z-[100] mt-1.5 w-56 origin-top-right rounded-xl border border-white/20 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-1 shadow-2xl backdrop-blur-md sm:w-64 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
        >
          <div className="px-3 pt-2 pb-1">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs text-white/60">{email}</p>
          </div>
          <div className="my-1 h-px bg-white/10" />

          {UTILITY_NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon === "activity" ? Activity : FileText;
            return (
              <Link
                key={item.href}
                href={item.href}
                role="menuitem"
                onClick={(e) => {
                  setOpen(false);
                  onNavigate?.(e, item.href);
                }}
                className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
              >
                <Icon className="h-4 w-4 shrink-0" aria-hidden />
                {item.label}
              </Link>
            );
          })}

          <div className="my-1 h-px bg-white/10" />

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              void handleLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Logout
          </button>
        </div>
      )}
    </div>
  );
}
