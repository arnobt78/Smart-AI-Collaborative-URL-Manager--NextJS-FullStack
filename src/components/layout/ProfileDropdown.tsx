"use client";

/**
 * ProfileDropdown — PORTABLE_AUTH_UI_GUIDE §2.2
 * Radix DropdownMenu modal={false} — sticky Navbar does not scroll-lock.
 * Order: name+email → separator → utility links → separator → Logout.
 * C7.7: Optimistic logout — queue goodbye, force-guest, keepalive signout,
 * immediate replace("/login"). Do not clear RQ before nav (avoids avatar flash).
 */
import { useRef } from "react";
import Link from "next/link";
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
import { UI_GLASS_MENU_TRIGGER_FOCUS, UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { markForceGuest, hardNavigateToLogin } from "@/lib/logout-client";

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
  const name = fullName || displayNameFromEmail(email);

  const handleLogout = () => {
    if (logoutInFlightRef.current) return;
    logoutInFlightRef.current = true;

    if (typeof window === "undefined") return;

    // Toast first — survives hard nav via sessionStorage + AuthToastBridge
    queueAuthToast({ kind: "goodbye", name });
    // Force-guest before replace so /login SSR sees guest immediately
    markForceGuest();

    // Background: clear httpOnly session_token + DB session (do not await)
    void fetch("/api/auth/signout", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
    });

    // Navigate immediately — do not clear RQ first (avoids profile-gone / page-stays flash)
    hardNavigateToLogin();
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
                  <Icon className={UI_ICON_CONTROL} aria-hidden />
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
            <LogOut className={UI_ICON_CONTROL} aria-hidden />
            Logout
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
