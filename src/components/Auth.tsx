"use client";

import { useState, useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useToast } from "@/components/ui/Toaster";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, Users, Sparkles, Loader2 } from "lucide-react";
import { TEST_ACCOUNTS } from "@/constants/auth";
import { displayNameFromEmail, robohashUrl } from "@/lib/robohash";
import { queueAuthToast } from "@/lib/auth-toast";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { cn } from "@/lib/utils";
import {
  CARD_PAD,
  FORM_STACK,
  MARKETING_STACK,
  SECTION_STACK,
} from "@/lib/ui-spacing";

export default function Auth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  /** Which CTA is in flight — drives Signing in… / Signing up… label */
  const [authAction, setAuthAction] = useState<"signin" | "signup" | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
  /** Selected demo account id — PORTABLE_AUTH_UI_GUIDE §2.1 */
  const [selectedGuestId, setSelectedGuestId] = useState<string | null>(null);
  const guestDropdownRef = useRef<HTMLDivElement>(null);

  // Get redirect URL from sessionStorage (set when user tries to access protected resource)
  const getRedirectUrl = () => {
    if (typeof window !== "undefined") {
      const redirect = sessionStorage.getItem("authRedirect");
      if (redirect) {
        sessionStorage.removeItem("authRedirect"); // Clear after reading
        return redirect;
      }
    }
    return null;
  };

  const { displayText: typewriterText, isComplete: isMainComplete } =
    useTypewriter({
      text: "> INITIALIZING URL COLLECTOR SYSTEM...",
      speed: 70,
      delay: 500,
    });

  const { displayText: subtitleText } = useTypewriter({
    text: "Welcome to The Urlist - Your Ultimate Link Manager",
    speed: 50,
    delay: 3500,
  });

  // CRITICAL: Reset welcome animation when component becomes visible
  // This ensures the welcome animation always plays when Auth component is shown,
  // even if component was prefetched by Next.js (prevents skipped animation)
  useEffect(() => {
    setMounted(true);
    // Reset welcome state when component mounts/becomes visible
    setShowWelcome(true);
    setShowSubtitle(false);

    // Prefetch Robohash for demo accounts so Select rows paint without delay
    TEST_ACCOUNTS.forEach((account) => {
      const img = new Image();
      img.src = robohashUrl(account.email, 72);
    });
  }, []);

  useEffect(() => {
    if (isMainComplete) {
      setShowSubtitle(true);
    }
  }, [isMainComplete]);

  // CRITICAL: Only start welcome animation timer after component is mounted and visible
  // This ensures animation plays from start even if component was prefetched
  useEffect(() => {
    if (!mounted) return;

    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, [mounted]);

  // Close guest dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        guestDropdownRef.current &&
        !guestDropdownRef.current.contains(event.target as Node)
      ) {
        setIsGuestDropdownOpen(false);
      }
    };

    if (isGuestDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isGuestDropdownOpen]);

  /** Kept for future signup UI — not shown (no dedicated signup page). */
  const _handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setAuthAction("signup");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to sign up";
        toast({
          title: "Sign Up Failed",
          description: errorMsg,
          variant: "error",
        });
        setLoading(false);
        setAuthAction(null);
      } else {
        // Queue welcome for homepage — hard redirect wipes in-memory toasts
        queueAuthToast({
          kind: "welcomeSignup",
          name: displayNameFromEmail(email),
        });

        // CRITICAL: Clear all old user data cache before new signup
        // This ensures no data from previous user remains cached
        queryClient.clear(); // Remove all queries from cache

        // Clear localStorage cache as well (if used)
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.startsWith("react-query:")) {
              localStorage.removeItem(key);
            }
          });

          // Dispatch event for components that listen to session updates
          window.dispatchEvent(new CustomEvent("session-updated"));
          // Guide §3 — LS + cookie so SSR paints Marketing / profile skeleton
          setWasAuthedHintClient(true);

          // Wait a moment for the session cookie to be set on the server
          // Then invalidate and refetch the session to ensure it's properly loaded
          setTimeout(async () => {
            try {
              // Invalidate session cache to trigger refetch with new cookie
              await queryClient.invalidateQueries({ queryKey: ["session"] });
              // Refetch session to ensure it's updated with new cookie
              await queryClient.refetchQueries({ queryKey: ["session"] });
            } catch (error) {
              // Non-critical - session will be refetched on next page load
              if (process.env.NODE_ENV === "development") {
                console.error("Session refetch error (non-critical):", error);
              }
            }

            // Check if there's a redirect URL (user was trying to access a protected resource)
            const redirectUrl = getRedirectUrl();
            const finalRedirectUrl = redirectUrl || "/"; // Default to homepage if no redirect URL

            // Redirect to the destination after successful signup
            // Use full page reload to ensure session is properly recognized by HomePage
            // This ensures the session cookie is included in the request
            window.location.href = finalRedirectUrl;
          }, 1500); // Give time for cookie to be set and session to be ready
        }
        // Keep loading until hard nav — do not re-enable CTA
      }
    } catch {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "error",
      });
      setLoading(false);
      setAuthAction(null);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    setAuthAction("signin");

    // Create AbortController for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Invalid email or password";
        toast({
          title: "Sign In Failed",
          description: errorMsg,
          variant: "error",
        });
        setLoading(false);
        setAuthAction(null);
      } else {
        // Queue welcome for homepage — hard redirect wipes in-memory toasts
        queueAuthToast({
          kind: "welcome",
          name: displayNameFromEmail(email),
        });

        // CRITICAL: Clear all old user data cache before new login
        // This ensures no data from previous user remains cached
        queryClient.clear(); // Remove all queries from cache

        // Clear localStorage cache as well (if used)
        if (typeof window !== "undefined") {
          const keys = Object.keys(localStorage);
          keys.forEach((key) => {
            if (key.startsWith("react-query:")) {
              localStorage.removeItem(key);
            }
          });

          // Dispatch event for components that listen to session updates
          window.dispatchEvent(new CustomEvent("session-updated"));
          // Guide §3 — LS + cookie so SSR paints Marketing / profile skeleton
          setWasAuthedHintClient(true);

          // Wait a moment for the session cookie to be set on the server
          // Then invalidate and refetch the session to ensure it's properly loaded
          setTimeout(async () => {
            try {
              // Invalidate session cache to trigger refetch with new cookie
              await queryClient.invalidateQueries({ queryKey: ["session"] });
              // Refetch session to ensure it's updated with new cookie
              await queryClient.refetchQueries({ queryKey: ["session"] });
            } catch (error) {
              // Non-critical - session will be refetched on next page load
              if (process.env.NODE_ENV === "development") {
                console.error("Session refetch error (non-critical):", error);
              }
            }

            // Check if there's a redirect URL (user was trying to access a protected resource)
            const redirectUrl = getRedirectUrl();
            const finalRedirectUrl = redirectUrl || "/"; // Default to homepage if no redirect URL

            // Redirect to the destination after successful login
            // Use full page reload to ensure session is properly recognized by HomePage
            // This ensures the session cookie is included in the request
            window.location.href = finalRedirectUrl;
          }, 1200); // Give time for cookie to be set and session to be ready
        }
        // Keep loading until hard nav — do not re-enable CTA
      }
    } catch (error: unknown) {
      clearTimeout(timeoutId);
      let errorMsg = "An unexpected error occurred";

      if (error instanceof DOMException && error.name === "AbortError") {
        errorMsg = "Request timed out. Please try again.";
      } else if (error instanceof Error) {
        if (error.name === "AbortError") {
          errorMsg = "Request timed out. Please try again.";
        } else {
          errorMsg = error.message || errorMsg;
        }
      }

      if (process.env.NODE_ENV === "development") {
        console.error("Sign in error:", error);
      }
      toast({
        title: "Error",
        description: errorMsg,
        variant: "error",
      });
      setLoading(false);
      setAuthAction(null);
    }
  };

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 z-50">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <OptimizedImage
          src="/global.svg"
          alt="Decorative background"
          fill
          className="object-cover"
          priority
          publicAsset
        />
      </div>

      {/* Welcome Overlay */}
      {showWelcome && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          {/* Single MARKETING_STACK: Welcome → logo → typewriter (even gaps) */}
          <div
            className={cn(
              "relative z-[2] w-full max-w-2xl items-center px-2 sm:px-3",
              MARKETING_STACK,
            )}
          >
            <div className="text-center animate-fade-in">
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-medium text-[#00ff99] drop-shadow-[0_0_15px_rgba(0,255,153,0.6)]">
                Welcome!
              </h1>
            </div>
            <div className="w-24 h-24 sm:w-32 sm:h-32">
              <OptimizedImage
                src="/favicon.ico"
                alt="Urlist Logo"
                width={128}
                height={128}
                priority
                className="w-full h-full"
                publicAsset
              />
            </div>

            {/* Typewriter Container */}
            <div className="flex flex-col items-center gap-2 sm:gap-4 w-full">
              <div className="bg-[rgba(20,20,30,0.8)] border-2 border-[#7b8ebc] rounded-xl sm:rounded-2xl px-4 sm:px-6 py-3 sm:py-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md w-full">
                <pre className="font-mono text-base sm:text-lg lg:text-xl xl:text-2xl text-[#00ff99] drop-shadow-[0_0_10px_rgba(0,255,153,0.5)] whitespace-pre-wrap leading-tight">
                  {typewriterText}
                  {isMainComplete && (
                    <span className="inline-block text-[#00ff99] font-medium text-lg sm:text-xl lg:text-2xl animate-cursor-blink">
                      _
                    </span>
                  )}
                </pre>
              </div>
              {showSubtitle && (
                <div className="font-sans text-sm sm:text-base lg:text-lg xl:text-xl text-[#7b8ebc] text-center animate-slide-up px-2">
                  {subtitleText}
                  <span className="inline-block text-[#7b8ebc] font-medium text-base sm:text-lg lg:text-xl animate-cursor-blink">
                    _
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Auth Form */}
      <div
        className={`relative z-10 w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 lg:py-8 transition-opacity duration-1000 ${
          showWelcome ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div
          className={cn(
            "bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl shadow-2xl",
            CARD_PAD,
            SECTION_STACK,
          )}
        >
          <div className={cn("text-center items-center", SECTION_STACK)}>
            <div className="flex justify-center">
              <OptimizedImage
                src="/favicon.ico"
                alt="Logo"
                width={64}
                height={64}
                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full"
                publicAsset
              />
            </div>
            <h2 className="text-2xl sm:text-3xl font-medium text-white">
              Sign In
            </h2>
            <p className="text-sm sm:text-base text-gray-300">
              Enter your credentials to continue
            </p>
          </div>

          <form className={FORM_STACK}>
            {/* Guest Select — fixed lead slot + always-visible Clear (no layout shift) */}
            <div className="relative" ref={guestDropdownRef}>
              <button
                type="button"
                onClick={() => setIsGuestDropdownOpen(!isGuestDropdownOpen)}
                className="w-full rounded-lg sm:rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-colors min-h-[48px] flex items-center justify-between cursor-pointer gap-2"
              >
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  {/* Fixed 28px lead — Users or avatar share the same footprint */}
                  <span className="size-7 shrink-0 flex items-center justify-center">
                    {selectedGuestId ? (
                      <UserAvatar
                        seed={
                          TEST_ACCOUNTS.find((a) => a.id === selectedGuestId)
                            ?.email ?? email
                        }
                        src={
                          TEST_ACCOUNTS.find((a) => a.id === selectedGuestId)
                            ?.image
                        }
                        size={28}
                        className="shrink-0"
                      />
                    ) : (
                      <Users className="h-4 w-4 text-white/70" aria-hidden />
                    )}
                  </span>
                  <span className="truncate text-white leading-none min-h-[1.25em] inline-flex items-center">
                    {selectedGuestId
                      ? (TEST_ACCOUNTS.find((a) => a.id === selectedGuestId)
                          ?.label ?? "Select as Guest User")
                      : "Select as Guest User"}
                  </span>
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-white/60 transition-transform duration-200 flex-shrink-0 ${
                    isGuestDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {isGuestDropdownOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 z-50 bg-gradient-to-br from-zinc-900/95 to-zinc-800/95 backdrop-blur-md border border-white/20 rounded-xl shadow-2xl animate-in fade-in-0 duration-150">
                  {TEST_ACCOUNTS.map((account) => (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => {
                        setEmail(account.email);
                        setPassword(account.password);
                        setSelectedGuestId(account.id);
                        setIsGuestDropdownOpen(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors duration-150 text-left cursor-pointer"
                    >
                      <UserAvatar
                        seed={account.email}
                        src={account.image}
                        size={36}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-white">
                          {account.label}
                        </p>
                        <p className="truncate text-xs text-white/60">
                          {account.email}
                        </p>
                      </div>
                    </button>
                  ))}

                  {/* Always mounted Clear row — stable menu height */}
                  <button
                    type="button"
                    disabled={!selectedGuestId}
                    onClick={() => {
                      if (!selectedGuestId) return;
                      setEmail("");
                      setPassword("");
                      setSelectedGuestId(null);
                      setIsGuestDropdownOpen(false);
                    }}
                    className={`w-full flex items-center gap-2 px-4 py-3 text-sm font-medium text-left border-t border-white/10 transition-colors duration-150 ${
                      selectedGuestId
                        ? "text-white/80 hover:bg-white/10 hover:text-white cursor-pointer"
                        : "text-white/30 cursor-not-allowed"
                    }`}
                  >
                    <span>Clear Selection</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  setSelectedGuestId(null);
                }}
                className="w-full min-h-[48px] rounded-lg sm:rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-colors box-border"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setSelectedGuestId(null);
                }}
                className="w-full min-h-[48px] rounded-lg sm:rounded-xl border border-white/20 bg-white/10 backdrop-blur-md px-2 sm:px-3 py-2 sm:py-3 text-sm sm:text-base text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-colors box-border"
                placeholder="Password"
              />
            </div>

            <div className="space-y-2 sm:space-y-3">
              <button
                type="submit"
                onClick={handleSignIn}
                disabled={loading}
                className="w-full min-h-[48px] bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white text-sm sm:text-base font-medium py-2 sm:py-3 rounded-lg sm:rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2
                      className="h-4 w-4 shrink-0 animate-spin"
                      aria-hidden
                    />
                    <span>
                      {authAction === "signup" ? "Signing up…" : "Signing in…"}
                    </span>
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                    <span>Sign in</span>
                  </>
                )}
              </button>
              {/* Sign up footer hidden — no dedicated signup page (_handleSignUp retained) */}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
