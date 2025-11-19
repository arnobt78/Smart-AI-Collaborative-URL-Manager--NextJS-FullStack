import { Suspense } from "react";
import BrowsePage from "@/components/pages/BrowsePage";

function BrowsePageSkeleton() {
  return (
    <main className="min-h-screen">
      <div className="mb-8">
        <div className="h-12 bg-white/10 rounded mb-2 animate-pulse" />
        <div className="h-6 bg-white/10 rounded w-2/3 animate-pulse" />
      </div>
    </main>
  );
}

export default function Browse() {
  return (
    <Suspense fallback={<BrowsePageSkeleton />}>
      <BrowsePage />
    </Suspense>
  );
}
