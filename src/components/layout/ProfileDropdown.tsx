"use client";

/**
 * ProfileDropdown — PORTABLE_AUTH_UI_GUIDE §2.2
 * Custom absolute menu (no Radix modal) so sticky Navbar does not scroll-lock / jump.
 * Order: name+email → separator → utility links → separator → Logout.
 */
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  UTILITY_NAVIGATION_ITEMS,
  WAS_AUTHED_KEY,
} from "@/constants/auth";
import { displayNameFromEmail } from "@/lib/robohash";
import { queueAuthToast } from "@/lib/auth-toast";

export type ProfileDropdownProps = {
  email: string;
  /** Optional display name; defaults to email local-part */
  fullName?: string;
  image?: string | null;
  /** Preserve Navbar import-guard navigation */
  onNavigate?: (
    e: React.MouseEvent<HTMLAnchorElement>,
    href: string
  ) => void;
};

export function ProfileDropdown({
  email,
  fullName,
  image,
  onNavigate,
}: ProfileDropdownProps) {
  const [open, setOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const queryClient = useQueryClient();
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

  const handleLogout = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      const response = await fetch("/api/auth/signout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (response.ok) {
        // Queue goodbye for Auth page after hard redirect
        queueAuthToast({ kind: "goodbye", name });
        // Densify: clear all React Query + session hint before hard redirect
        queryClient.clear();
        if (typeof window !== "undefined") {
          localStorage.removeItem(WAS_AUTHED_KEY);
          Object.keys(localStorage).forEach((key) => {
            if (key.startsWith("react-query:")) {
              localStorage.removeItem(key);
            }
          });
        }
        window.location.href = "/";
      } else {
        setIsLoggingOut(false);
      }
    } catch {
      setIsLoggingOut(false);
    }
  };

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="size-10 overflow-hidden rounded-full border border-white/20 bg-white/10 p-0 transition hover:border-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Open profile menu"
      >
        <UserAvatar seed={email} src={image} size={40} alt={name} />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-56 origin-top-right rounded-xl border border-white/20 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 p-1 shadow-2xl backdrop-blur-md sm:w-64 animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-150"
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
            disabled={isLoggingOut}
            onClick={() => {
              void handleLogout();
            }}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
          >
            <LogOut
              className={`h-4 w-4 shrink-0 ${isLoggingOut ? "animate-pulse" : ""}`}
              aria-hidden
            />
            {isLoggingOut ? "Logging out…" : "Logout"}
          </button>
        </div>
      )}
    </div>
  );
}
