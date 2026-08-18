import BrowsePage from "@/components/pages/BrowsePage";

// Query parameters are owned by the client search form. Dynamic rendering avoids
// a route-level Suspense fallback that used to remount the entire browse shell.
export const dynamic = "force-dynamic";

export default function Browse() {
  return <BrowsePage />;
}
