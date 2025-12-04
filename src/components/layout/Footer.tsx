"use client";

import Link from "next/link";
// import { LinkIcon } from "@heroicons/react/24/outline";

export default function Footer() {
  return (
    <footer className="bg-transparent backdrop-blur-md mt-auto">
      <div className="mx-auto max-w-7xl px-2 sm:px-0 py-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {/* <div className="bg-gradient-to-r from-blue-100 to-purple-100 rounded-lg p-2">
              <LinkIcon className="h-5 w-5 text-blue-600" />
            </div> */}
            <span className="text-white/80 font-mono">
              {new Date().getFullYear()} The Daily Urlist
            </span>
          </div>
          <div className="flex items-center gap-6">
            <Link
              href="/about"
              className="text-white/80 hover:text-white transition-colors font-mono"
            >
              About
            </Link>
            <Link
              href="/privacy"
              className="text-white/80 hover:text-white transition-colors font-mono"
            >
              Privacy
            </Link>
            <Link
              href="/terms"
              className="text-white/80 hover:text-white transition-colors font-mono"
            >
              Terms
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
