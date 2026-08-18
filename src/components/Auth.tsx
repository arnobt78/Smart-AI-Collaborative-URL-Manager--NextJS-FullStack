"use client";

/**
 * Auth — split viewport (Stockly-style columns, Daily Urlist dark glass).
 * Left: Welcome typewriter + about-process (always visible).
 * Right: Sign In form with labels + guest dropdown (always interactive).
 * No 8s blocking overlay — form usable immediately on mobile + desktop.
 */
import { useState, useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useToast } from "@/components/ui/Toaster";
import { useQueryClient } from "@tanstack/react-query";
import {
  ChevronDown,
  Users,
  Loader2,
  Link2,
  Share2,
  ImageIcon,
  UsersRound,
  Sparkles,
  Eraser,
} from "lucide-react";
import { TEST_ACCOUNTS } from "@/constants/auth";
import { displayNameFromEmail, robohashUrl } from "@/lib/robohash";
import { queueAuthToast } from "@/lib/auth-toast";
import { setWasAuthedHintClient } from "@/lib/was-authed";
import { cn } from "@/lib/utils";
import { CARD_PAD, FORM_STACK, HEADING_STACK, MARKETING_STACK } from "@/lib/ui-spacing";
import { glassPrimaryButtonClass } from "@/lib/ui/glass-button-styles";
import { UI_FORM_CONTROL } from "@/lib/ui/control-styles";

/** Left-panel process blurb — mirrors Home marketing features */
const ABOUT_PROCESS = [
  {
    icon: Link2,
    title: "Create lists",
    description: "Spin up URL collections in seconds with a memorable name.",
  },
  {
    icon: ImageIcon,
    title: "Add URLs",
    description: "Save links with rich previews, notes, and tags.",
  },
  {
    icon: Share2,
    title: "Share instantly",
    description: "Publish or invite collaborators with a simple URL.",
  },
  {
    icon: UsersRound,
    title: "Collaborate",
    description: "Work together on lists with real-time updates.",
  },
] as const;

export default function Auth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  /** Which CTA is in flight — drives Signing in… / Signing up… label */
  const [authAction, setAuthAction] = useState<"signin" | "signup" | null>(
    null,
  );
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  /** Stagger “How it works” after typewriter completes */
  const [showAbout, setShowAbout] = useState(false);
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

  // Prefetch Robohash + remount-safe subtitle / about gates
  useEffect(() => {
    setShowSubtitle(false);
    setShowAbout(false);
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

  // About chips: stagger in after typewriter line completes (synced with welcome)
  useEffect(() => {
    if (!isMainComplete) return;
    const t = setTimeout(() => setShowAbout(true), 180);
    return () => clearTimeout(t);
  }, [isMainComplete]);

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

  const handleSignUp = async (e: React.SyntheticEvent) => {
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

  const inputClass = `${UI_FORM_CONTROL} box-border placeholder:text-gray-400 focus:ring-[#00ff99] focus:border-transparent`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 md:overflow-hidden">
      {/* Background Image — full bleed */}
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

      {/* Content shell matches app max-w-7xl (Auth is fixed so layout main does not apply) */}
      <div className="relative z-10 mx-auto flex min-h-full w-full max-w-7xl flex-col px-2 sm:px-4 md:h-full md:min-h-0">
        <div className="grid min-h-full w-full flex-1 md:h-full md:grid-cols-2 md:min-h-0">
          {/* LEFT — Welcome typewriter + about (no divider, no logo) */}
          <aside
            className={cn(
              "relative flex flex-col justify-center p-6 sm:p-8 lg:p-10 md:overflow-y-auto",
              MARKETING_STACK,
            )}
          >
            <div className="flex max-w-lg flex-col items-start gap-4 sm:gap-6">
              <h1 className="text-lg sm:text-xl lg:text-5xl font-medium text-[#00ff99] drop-shadow-[0_0_15px_rgba(0,255,153,0.6)] animate-fade-in">
                Welcome!
              </h1>

              {/* Reserved heights — no border box; no layout shift as text types */}
              <div className="flex w-full flex-col gap-2 sm:gap-3">
                <pre className="min-h-[2.5rem] sm:min-h-[2.75rem] font-mono text-sm sm:text-base lg:text-lg text-[#00ff99] drop-shadow-[0_0_10px_rgba(0,255,153,0.5)] whitespace-pre-wrap leading-tight">
                  {typewriterText}
                  {isMainComplete && (
                    <span className="inline-block text-[#00ff99] font-medium animate-cursor-blink">
                      _
                    </span>
                  )}
                </pre>
                <p
                  className={cn(
                    "min-h-[1.5rem] sm:min-h-[1.75rem] font-sans text-sm sm:text-base text-[#7b8ebc]",
                    showSubtitle && "animate-slide-up",
                  )}
                  aria-hidden={!showSubtitle}
                >
                  {showSubtitle ? (
                    <>
                      {subtitleText}
                      <span className="inline-block text-[#7b8ebc] font-medium animate-cursor-blink">
                        _
                      </span>
                    </>
                  ) : (
                    "\u00A0"
                  )}
                </p>
              </div>
            </div>

            {/* Title+blurb stay tight (gap-1.5); larger gap before feature cards */}
            <div className="flex max-w-lg flex-col gap-4 sm:gap-6">
              <div className="flex flex-col gap-1.5">
                <div
                  className={cn(showAbout ? "animate-slide-up" : "opacity-0")}
                  style={
                    showAbout
                      ? {
                          animationDuration: "0.45s",
                          animationTimingFunction:
                            "cubic-bezier(0.22, 1, 0.36, 1)",
                          animationFillMode: "both",
                          animationDelay: "0ms",
                        }
                      : undefined
                  }
                >
                  <h2 className="text-lg sm:text-xl font-medium text-white">
                    How The Daily Urlist works
                  </h2>
                </div>
                <div
                  className={cn(showAbout ? "animate-slide-up" : "opacity-0")}
                  style={
                    showAbout
                      ? {
                          animationDuration: "0.45s",
                          animationTimingFunction:
                            "cubic-bezier(0.22, 1, 0.36, 1)",
                          animationFillMode: "both",
                          animationDelay: "120ms",
                        }
                      : undefined
                  }
                >
                  <p className="text-sm text-white/60">
                    Create, enrich, and share URL collections with your team.
                  </p>
                </div>
              </div>
              <ul className="flex flex-col gap-3 sm:gap-4">
                {ABOUT_PROCESS.map((item, index) => {
                  const Icon = item.icon;
                  const delayMs = 240 + index * 150;
                  return (
                    <li
                      key={item.title}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border border-white/15 bg-white/5 backdrop-blur-md p-3 sm:p-4",
                        showAbout ? "animate-slide-up" : "opacity-0",
                      )}
                      style={
                        showAbout
                          ? {
                              animationDuration: "0.5s",
                              animationTimingFunction:
                                "cubic-bezier(0.22, 1, 0.36, 1)",
                              animationFillMode: "both",
                              animationDelay: `${delayMs}ms`,
                            }
                          : undefined
                      }
                    >
                      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/20 text-blue-300">
                        <Icon className="h-4 w-4" aria-hidden />
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-white">
                          {item.title}
                        </span>
                        <span className="block text-xs sm:text-sm text-white/60 leading-relaxed">
                          {item.description}
                        </span>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* RIGHT — Sign In form (always interactive) */}
          <section className="relative flex items-center justify-center p-4 sm:p-6 lg:p-10 md:overflow-y-auto">
            <div
              className={cn(
                "w-full max-w-md bg-white/10 backdrop-blur-md border border-white/20 rounded-xl sm:rounded-2xl shadow-2xl",
                CARD_PAD,
                FORM_STACK,
              )}
            >
              <div className="auth-reveal auth-reveal-delay-0 flex flex-col items-center gap-2 text-center">
                <OptimizedImage
                  src="/favicon.ico"
                  alt="The Daily Urlist logo"
                  width={64}
                  height={64}
                  className="h-14 w-14 sm:h-16 sm:w-16 object-contain"
                  publicAsset
                />
                <div className={HEADING_STACK}>
                  <h2 className="text-lg sm:text-xl font-medium text-white">
                    Welcome back
                  </h2>
                  <p className="text-sm sm:text-base text-gray-300">
                    Pick a test account below, or sign in with your email
                  </p>
                </div>
              </div>

              <form className={FORM_STACK} onSubmit={handleSignIn}>
                {/* Guest Select — labeled; menu top-full like ProfileDropdown */}
                <div
                  className={cn(
                    "auth-reveal auth-reveal-delay-1 relative space-y-1.5",
                    // auth-reveal transforms create sibling stacking contexts; lift the whole field while its menu is open.
                    isGuestDropdownOpen && "z-30",
                  )}
                  ref={guestDropdownRef}
                >
                  <label
                    htmlFor="auth-guest"
                    className="block text-xs sm:text-sm font-medium text-white/80"
                  >
                    Test Accounts To Login With
                  </label>
                  <button
                    id="auth-guest"
                    type="button"
                    onClick={() => setIsGuestDropdownOpen(!isGuestDropdownOpen)}
                    aria-expanded={isGuestDropdownOpen}
                    aria-controls="auth-guest-menu"
                    className={`${UI_FORM_CONTROL} flex items-center justify-between gap-2 text-left focus:ring-[#00ff99] focus:border-transparent`}
                  >
                    <span className="flex min-w-0 flex-1 items-center gap-2">
                      <span className="size-7 shrink-0 flex items-center justify-center">
                        {selectedGuestId ? (
                          <UserAvatar
                            seed={
                              TEST_ACCOUNTS.find(
                                (a) => a.id === selectedGuestId,
                              )?.email ?? email
                            }
                            src={
                              TEST_ACCOUNTS.find(
                                (a) => a.id === selectedGuestId,
                              )?.image
                            }
                            size={28}
                            className="shrink-0"
                          />
                        ) : (
                          <Users
                            className="h-4 w-4 text-white/70"
                            aria-hidden
                          />
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
                    <div
                      id="auth-guest-menu"
                      className="absolute left-0 right-0 top-full z-50 mt-1.5 overflow-hidden rounded-xl border border-white/25 bg-zinc-950 shadow-2xl ring-1 ring-black/40 animate-in fade-in-0 duration-150"
                    >
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
                        <Eraser className="h-4 w-4" aria-hidden />
                        <span>Clear Selection</span>
                      </button>
                    </div>
                  )}
                </div>

                <div className="auth-reveal auth-reveal-delay-2 space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="block text-xs sm:text-sm font-medium text-white/80"
                  >
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setSelectedGuestId(null);
                    }}
                    className={inputClass}
                    placeholder="you@example.com"
                  />
                </div>

                <div className="auth-reveal auth-reveal-delay-3 space-y-1.5">
                  <label
                    htmlFor="auth-password"
                    className="block text-xs sm:text-sm font-medium text-white/80"
                  >
                    Password
                  </label>
                  <input
                    id="auth-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setSelectedGuestId(null);
                    }}
                    className={inputClass}
                    placeholder="Enter your password"
                  />
                </div>

                {/* Extra space above Sign in + Sign up footer */}
                <div className="auth-reveal auth-reveal-delay-4 space-y-3 sm:space-y-4 pt-4 sm:pt-6">
                  <button
                    type="submit"
                    disabled={loading}
                    className={glassPrimaryButtonClass(
                      "blue",
                      "w-full h-12 text-sm sm:text-base",
                    )}
                  >
                    {loading && authAction === "signin" ? (
                      <>
                        <Loader2
                          className="h-4 w-4 shrink-0 animate-spin"
                          aria-hidden
                        />
                        <span>Signing in…</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4 shrink-0" aria-hidden />
                        <span>Sign in</span>
                      </>
                    )}
                  </button>

                  <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-sm text-gray-300">
                    <span>Don&apos;t have an account yet?</span>
                    <button
                      type="button"
                      onClick={handleSignUp}
                      disabled={loading}
                      className="font-medium text-[#00ff99] hover:underline disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-1.5"
                    >
                      {loading && authAction === "signup" ? (
                        <>
                          <Loader2
                            className="h-3.5 w-3.5 shrink-0 animate-spin"
                            aria-hidden
                          />
                          <span>Signing up…</span>
                        </>
                      ) : (
                        <span>Sign up</span>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
