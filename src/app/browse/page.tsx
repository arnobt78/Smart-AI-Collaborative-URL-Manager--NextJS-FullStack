import { Suspense } from "react";
import BrowsePage from "@/components/pages/BrowsePage";
import { Globe, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PAGE_STACK } from "@/lib/ui-spacing";

function BrowsePageShell() {
  return (
    <main className={`min-h-screen w-full ${PAGE_STACK}`}>
      <PageHeader icon={Globe} title="Discover Public Lists" description="Browse and explore curated URL collections from the community" />
      <div className="flex flex-col gap-2 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" aria-hidden />
          <Input disabled placeholder="Search lists by title or description..." className="pl-9" />
        </div>
        <Button disabled variant="primary"><Search className="h-4 w-4" aria-hidden />Search</Button>
      </div>
    </main>
  );
}

export default function Browse() {
  return (
    <Suspense fallback={<BrowsePageShell />}>
      <BrowsePage />
    </Suspense>
  );
}
