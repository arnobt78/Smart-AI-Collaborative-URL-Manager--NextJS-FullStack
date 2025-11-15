"use client";

import { useState, useEffect } from "react";
import { OptimizedImage } from "@/components/ui/OptimizedImage";
import { useTypewriter } from "@/hooks/useTypewriter";
import { useToast } from "@/components/ui/Toaster";

export default function Auth() {
  const { toast } = useToast();
  const [showWelcome, setShowWelcome] = useState(true);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [showSubtitle, setShowSubtitle] = useState(false);

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

  useEffect(() => {
    if (isMainComplete) {
      setShowSubtitle(true);
    }
  }, [isMainComplete]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowWelcome(false);
    }, 8000);
    return () => clearTimeout(timer);
  }, []);

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
        setTimeout(() => window.location.reload(), 1500);
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
        setTimeout(() => window.location.reload(), 1000);
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
