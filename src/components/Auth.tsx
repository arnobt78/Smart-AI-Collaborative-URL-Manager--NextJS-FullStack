"use client";

import { useState, useEffect, useRef } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useToast } from "@/components/ui/Toaster";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";

export default function Auth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isGuestDropdownOpen, setIsGuestDropdownOpen] = useState(false);
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

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Failed to sign up";
        setMessage(errorMsg);
        toast({
          title: "Sign Up Failed",
          description: errorMsg,
          variant: "error",
        });
      } else {
        setMessage("Account created successfully!");
        toast({
          title: "Welcome! 🎉",
          description:
            "Account created successfully! Check your email for a welcome message.",
          variant: "success",
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
      }
    } catch {
      const errorMsg = "An unexpected error occurred";
      setMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        const errorMsg = data.error || "Invalid email or password";
        setMessage(errorMsg);
        toast({
          title: "Sign In Failed",
          description: errorMsg,
          variant: "error",
        });
      } else {
        setMessage("Signed in successfully!");
        toast({
          title: "Welcome Back! 👋",
          description: "Signed in successfully!",
          variant: "success",
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
      }
    } catch {
      const errorMsg = "An unexpected error occurred";
      setMessage(errorMsg);
      toast({
        title: "Error",
        description: errorMsg,
        variant: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen flex flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 z-50">
      {/* Background Image */}
      <div className="absolute inset-0 w-full h-full opacity-20 pointer-events-none">
        <OptimizedImage
          src="/global.svg"
          alt="Decorative background"
          fill
          className="object-cover animate-float"
          priority
          publicAsset
        />
      </div>

      {/* Welcome Overlay */}
      {showWelcome && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center">
          <div className="relative z-[2] flex flex-col items-center justify-center w-full">
            {/* Welcome Content */}
            <div className="flex flex-col items-center mb-8">
              <div className="text-center mb-6 animate-fade-in">
                <h1 className="text-4xl sm:text-5xl font-bold text-[#00ff99] drop-shadow-[0_0_15px_rgba(0,255,153,0.6)]">
                  Welcome!
                </h1>
              </div>
              <div className="w-32 h-32 mb-6">
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
            </div>

            {/* Typewriter Container */}
            <div className="flex flex-col items-center gap-4 px-4">
              <div className="bg-[rgba(20,20,30,0.8)] border-2 border-[#7b8ebc] rounded-2xl px-6 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.3)] backdrop-blur-md max-w-2xl">
                <pre className="font-mono text-xl sm:text-2xl text-[#00ff99] drop-shadow-[0_0_10px_rgba(0,255,153,0.5)] whitespace-pre-wrap leading-tight">
                  {typewriterText}
                  {isMainComplete && (
                    <span className="inline-block text-[#00ff99] font-bold text-2xl animate-cursor-blink">
                      _
                    </span>
                  )}
                </pre>
              </div>
              {showSubtitle && (
                <div className="font-sans text-lg sm:text-xl text-[#7b8ebc] text-center animate-slide-up">
                  {subtitleText}
                  <span className="inline-block text-[#7b8ebc] font-bold text-xl animate-cursor-blink">
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
        className={`relative z-10 w-full max-w-md mx-auto p-8 transition-opacity duration-1000 ${
          showWelcome ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-8 shadow-2xl">
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <OptimizedImage
                src="/favicon.ico"
                alt="Logo"
                width={64}
                height={64}
                className="rounded-full"
                publicAsset
              />
            </div>
            <h2 className="text-3xl font-bold text-white mb-2">Sign In</h2>
            <p className="text-gray-300">Enter your credentials to continue</p>
          </div>

          <form className="space-y-6">
            {/* Guest User Selection Dropdown - Demo Feature */}
            {/* Allows recruiters/reviewers to quickly test the application with pre-filled credentials */}
            {/* Button always displays "Select as Guest User" regardless of selection */}
            <div className="relative" ref={guestDropdownRef}>
              <button
                type="button"
                onClick={() => setIsGuestDropdownOpen(!isGuestDropdownOpen)}
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-all min-h-[48px] flex items-center justify-between cursor-pointer"
              >
                <span className="text-white">Select as Guest User</span>
                <ChevronDown
                  className={`w-4 h-4 text-white/60 transition-transform duration-200 flex-shrink-0 ${
                    isGuestDropdownOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Dropdown Menu */}
              {isGuestDropdownOpen && (
                <div
                  className={`
                    absolute top-full left-0 right-0 mt-2
                    bg-gradient-to-br from-zinc-900/95 to-zinc-800/95
                    backdrop-blur-md border border-white/20 rounded-xl shadow-2xl
                    z-50
                    animate-in fade-in-0 zoom-in-95 slide-in-from-top-2 duration-200
                  `}
                >
                  {/* CRITICAL: Remove py-padding, make entire div clickable */}
                  <button
                    type="button"
                    onClick={() => {
                      // CRITICAL: Auto-fill guest user credentials for demo purposes
                      // This allows recruiters/reviewers to quickly test the application
                      setEmail("test@example.com");
                      setPassword("12345678");
                      setIsGuestDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150 text-left cursor-pointer"
                  >
                    <span>Guest User</span>
                  </button>
                  
                  {/* Clear Input Option - Clears guest user credentials */}
                  <button
                    type="button"
                    onClick={() => {
                      // CRITICAL: Clear guest user credentials
                      // This allows users to reset and enter their own credentials
                      setEmail("");
                      setPassword("");
                      setIsGuestDropdownOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-all duration-150 text-left cursor-pointer border-t border-white/10"
                  >
                    <span>Clear Input</span>
                  </button>
                </div>
              )}
            </div>

            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-all"
                placeholder="Email address"
              />
            </div>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm px-4 py-3 text-white placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#00ff99] focus:border-transparent transition-all"
                placeholder="Password"
              />
            </div>

            {message && (
              <div className="text-center font-medium text-[#00ff99] animate-fade-in">
                {message}
              </div>
            )}

            <div className="space-y-4">
              <button
                type="submit"
                onClick={handleSignIn}
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Loading..." : "Sign in"}
              </button>

              <div className="text-center text-sm">
                <span className="text-gray-300">
                  Don&apos;t have an account?{" "}
                </span>
                <button
                  type="button"
                  onClick={handleSignUp}
                  disabled={loading}
                  className="font-semibold text-[#00ff99] hover:text-[#00cc77] transition-colors disabled:opacity-50"
                >
                  Sign up
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
