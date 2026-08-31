"use client";

/**
 * ProfileDropdown — PORTABLE_AUTH_UI_GUIDE §2.2
 * Radix DropdownMenu modal={false} — sticky Navbar does not scroll-lock.
 * Order: name+email → separator → utility links → separator → Logout.
 * C7.7: Optimistic logout — queue goodbye, force-guest, clear caches, keepalive
 * signout in background, immediate replace("/login") → chrome-free Auth.
 */
import { useRef } from "react";
import Link from "next/link";
import { useQueryClient } from "@tanstack/react-query";
import { Activity, FileText, LogOut } from "lucide-react";
import { UserAvatar } from "@/components/ui/UserAvatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UTILITY_NAVIGATION_ITEMS } from "@/constants/auth";
import { displayNameFromEmail } from "@/lib/robohash";
import { queueAuthToast } from "@/lib/auth-toast";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { UI_GLASS_MENU_TRIGGER_FOCUS } from "@/lib/ui/control-styles";
import { markForceGuest } from "@/lib/logout-client";

export type ProfileDropdownProps = {
  email: string;
  /** Optional display name; defaults to email local-part */
  fullName?: string;
  image?: string | null;
  /** Preserve Navbar import-guard navigation */
  onNavigate?: (e: React.MouseEvent<HTMLAnchorElement>, href: string) => void;
};

export function ProfileDropdown({
  email,
  fullName,
  image,
  onNavigate,
}: ProfileDropdownProps) {
  const logoutInFlightRef = useRef(false);
  const queryClient = useQueryClient();
  const name = fullName || displayNameFromEmail(email);

  const handleLogout = () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;

    // Toast first — survives hard nav via sessionStorage + AuthToastBridge
    queueAuthToast({ kind: "goodbye", name });
    setWasAuthedHintClient(false);

    void queryClient.cancelQueries();
    queryClient.setQueryData(["session"], { user: null });
    queryClient.clear();

    if (typeof window === "undefined") return;

    Object.keys(localStorage).forEach((key) => {
      if (key.startsWith("react-query:")) {
        localStorage.removeItem(key);
      }
    });

    // Mark force-guest LAST so cookie is on the next document request
    markForceGuest();

    // Background: clear httpOnly session_token + DB session (do not await)
    void fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });

    // Chrome-free Auth lives on /login (one document scrollbar; no overlay)
    window.location.replace("/login");
  };

  return (
    <div className="relative size-10 shrink-0">
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            className={`flex size-10 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/10 p-0 leading-none appearance-none transition hover:border-white/40 focus:outline-none ${UI_GLASS_MENU_TRIGGER_FOCUS}`}
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
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56 sm:w-64">
          <DropdownMenuLabel className="px-3 pt-2 pb-1 font-normal">
            <p className="truncate text-sm font-medium text-white">{name}</p>
            <p className="truncate text-xs font-normal text-white/60">
              {email}
            </p>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {/* C7.2: api-docs / api-status rarely visited — no Link _rsc prefetch */}
          {UTILITY_NAVIGATION_ITEMS.map((item) => {
            const Icon = item.icon === "activity" ? Activity : FileText;
            return (
              <DropdownMenuItem key={item.href} asChild>
                <Link
                  href={item.href}
                  prefetch={false}
                  onClick={(e) => {
                    onNavigate?.(e, item.href);
                  }}
                  className="cursor-pointer"
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden />
                  {item.label}
                </Link>
              </DropdownMenuItem>
            );
          })}

          <DropdownMenuSeparator />

          <DropdownMenuItem
            onSelect={() => {
              handleLogout();
            }}
            className="cursor-pointer"
          >
            <LogOut className="h-4 w-4 shrink-0" aria-hidden />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
