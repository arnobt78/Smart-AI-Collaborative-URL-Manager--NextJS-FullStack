"use client";

import Link from "next/link";
import { UI_CHROME_ROW } from "@/lib/ui/control-styles";

/** REQ-0015: compact chrome grows safely when its content stacks on narrow viewports. */
export default function Footer() {
  return (
    <footer className="mt-auto min-h-14 bg-transparent">
      <div className="mx-auto max-w-7xl px-2 sm:px-0">
        <div
          className={`${UI_CHROME_ROW} min-h-14 flex-col gap-2 py-2 sm:h-14 sm:flex-row sm:gap-0 sm:py-0`}
        >
          <div className="flex items-center gap-2">
            <span className="text-sm sm:text-base text-white/80 font-mono">
              &copy; {new Date().getFullYear()}. All rights reserved.
            </span>
          </div>
          <div className="flex items-center gap-4 sm:gap-6">
            <Link
              href="/about"
              className="text-sm sm:text-base text-white/80 hover:text-white transition-colors font-mono"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-sm sm:text-base text-white/80 hover:text-white transition-colors font-mono"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-sm sm:text-base text-white/80 hover:text-white transition-colors font-mono"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
