"use client";

import { OptimizedImage } from "@/components/ui/OptimizedImage";

export default function FloatingBackground() {
  return (
    <div
      className="fixed inset-0 -z-10 overflow-hidden pointer-events-none"
      suppressHydrationWarning
    >
      <div className="absolute top-0 left-0 w-full h-full opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <OptimizedImage
            src="/global.svg"
            alt="Decorative background"
            fill
            className="object-cover animate-float"
            priority
            publicAsset
          />
        </div>
      </div>
      <div className="absolute top-0 right-0 w-full h-full opacity-40 pointer-events-none">
        <div className="relative w-full h-full">
          <OptimizedImage
            src="/explore.svg"
            alt="Decorative background"
            fill
            className="object-cover animate-float"
            priority
            publicAsset
          />
        </div>
      </div>
    </div>
  );
}
