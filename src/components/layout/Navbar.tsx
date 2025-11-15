"use client";

import Link from "next/link";
import { LinkIcon } from "@heroicons/react/24/outline";
import { useTypewriter } from "@/hooks/useTypewriter";

export default function Navbar() {
  const { displayText, isComplete } = useTypewriter({
    text: "The Daily Urlist",
    speed: 200,
    delay: 2500,
  });

  return (
    <nav className="bg-transparent backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-6 py-3">
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2 text-xl font-bold text-white hover:text-blue-400 transition-colors font-mono"
          >
            <div className="bg-transparent">
              <LinkIcon className="h-8 w-8 text-blue-600 stroke-[2.5px]" />
            </div>
            <div className="animate-ease-in-out" suppressHydrationWarning>
              <span className="gradient-color">
                {displayText}
                {!isComplete && <span className="typewriter-cursor" />}
              </span>
            </div>
          </Link>
          <div className="flex items-center gap-4 flex-wrap">
            <a
              href="/browse"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-lg"
            >
              🌐 Browse
            </a>
            <a
              href="/business-insights"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-lg"
            >
              📊 Insights
            </a>
            <a
              href="/api-status"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-lg"
            >
              🔍 Status
            </a>
            <a
              href="/api-docs"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-lg"
            >
              📚 Docs
            </a>
            <a
              href="/lists"
              className="text-white/80 hover:text-white font-medium transition-colors font-mono text-lg"
            >
              My Lists
            </a>
            <a
              href="/new"
              className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-medium px-4 py-2 rounded-lg shadow-sm hover:shadow-md transition-all duration-200 font-mono text-lg"
            >
              Create New List
            </a>
          </div>
        </div>
      </div>
    </nav>
  );
}
