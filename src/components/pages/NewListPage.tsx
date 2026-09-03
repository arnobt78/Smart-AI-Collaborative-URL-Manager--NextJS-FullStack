// REQ-0021: Cache-aware create-list form is rendered directly inside the shared dialog.
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ListPlus } from "lucide-react";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { ListFormCard, ListVisibilityField } from "@/components/lists/ListFormPrimitives";
import { useToast } from "@/components/ui/Toaster";
import { useCreateList } from "@/hooks/useListQueries";
import { useWarmSoftNav } from "@/hooks/useWarmSoftNav";
import { FORM_STACK } from "@/lib/ui-spacing";
import { UI_FORM_CONTROL, UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
} from "@/lib/ui/form-limits";

interface NewListPageClientProps {
  onClose?: () => void;
  onPendingChange?: (pending: boolean) => void;
}

export default function NewListPageClient({ onClose, onPendingChange }: NewListPageClientProps) {
  const router = useRouter();
  const { warmRouterReplace } = useWarmSoftNav();
  const { toast } = useToast();
  const createListMutation = useCreateList();
  const [error, setError] = useState("");
  const [isNavigating, setIsNavigating] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    url: "",
    description: "",
    isPublic: false,
  });

  const isPending = createListMutation.isPending || isNavigating;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const close = () => {
    if (isPending) return;
    if (onClose) {
      onClose();
      return;
    }
    router.replace("/lists", { scroll: false });
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!formData.title.trim()) {
      setError("Title is required");
      return;
    }

    const slug =
      formData.slug.trim() ||
      formData.title
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");

    try {
      const { list } = await createListMutation.mutateAsync({
        title: formData.title.trim(),
        slug,
        description: formData.description.trim() || null,
        urls: formData.url.trim()
          ? [{ id: crypto.randomUUID(), url: formData.url.trim() }]
          : [],
        isPublic: formData.isPublic,
      });

      toast({
        title: "List created",
        description: `"${list.title || list.slug}" is ready in My Lists.`,
        variant: "success",
      });
      // C6.9: warm replace so seeded unified cache paints OptimisticSoftNavSurface
      setIsNavigating(true);
      warmRouterReplace(`/list/${list.slug}`, { scroll: false });
    } catch (caughtError) {
      setIsNavigating(false);
      const message = caughtError instanceof Error ? caughtError.message : "Failed to create list";
      setError(message);
      toast({
        title: "Could not create list",
        description: message,
        variant: "error",
      });
    }
  };

  return (
    <ListFormCard>
      <form onSubmit={handleSubmit} className={FORM_STACK}>
        <div className="space-y-2">
          <label className="flex items-center justify-between gap-2 text-sm font-medium text-white sm:text-base">
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Title <span className="text-red-400">*</span>
            </span>
            <CharacterCounter current={formData.title.length} max={LIST_TITLE_MAX} />
          </label>
          <input
            type="text"
            value={formData.title}
            onChange={(event) => setFormData((current) => ({ ...current, title: event.target.value }))}
            className={UI_FORM_CONTROL}
            placeholder="e.g., My Favorite Resources"
            maxLength={LIST_TITLE_MAX}
            required
          />
          <p className="text-xs text-white/50 sm:text-sm">Give your list a memorable name</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white sm:text-base">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
            Custom Slug <span className="text-xs font-normal text-white/50">(optional)</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/50 sm:text-sm">/list/</span>
            <input
              type="text"
              value={formData.slug}
              onChange={(event) => setFormData((current) => ({ ...current, slug: event.target.value }))}
              className={`${UI_FORM_CONTROL} pl-16`}
              placeholder="custom-slug"
            />
          </div>
          <p className="text-xs text-white/50 sm:text-sm">Custom URL slug (auto-generated from title if left empty)</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white sm:text-base">
            <span className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
            First URL <span className="text-xs font-normal text-white/50">(optional)</span>
          </label>
          <input
            type="url"
            value={formData.url}
            onChange={(event) => setFormData((current) => ({ ...current, url: event.target.value }))}
            className={UI_FORM_CONTROL}
            placeholder="https://example.com"
          />
          {formData.url ? (
            <div className="rounded-xl border border-blue-400/20 bg-blue-500/10 p-3">
              <UrlEnhancer
                url={formData.url}
                compact
                onEnhance={(result) => {
                  if (result.success && result.summary) {
                    setFormData((current) => current.description ? current : { ...current, description: result.summary ?? "" });
                  }
                }}
              />
            </div>
          ) : null}
          <p className="text-xs text-white/50 sm:text-sm">Add the first URL to get started (you can add more later)</p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm font-medium text-white sm:text-base">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            Description <span className="text-xs font-normal text-white/50">(optional)</span>
          </label>
          <div className="relative">
            <Textarea
              value={formData.description}
              onChange={(event) => setFormData((current) => ({ ...current, description: event.target.value }))}
              className="min-h-28 rounded-xl border-white/20 bg-white/10 px-3 py-2 pb-8 text-sm shadow-inner placeholder:text-sm focus:border-pink-400/50 focus:ring-2 focus:ring-pink-500 sm:text-sm"
              placeholder="Describe what this list is about..."
              rows={4}
              maxLength={LIST_DESCRIPTION_MAX}
            />
            <CharacterCounter
              current={formData.description.length}
              max={LIST_DESCRIPTION_MAX}
              className="absolute bottom-2 right-3 pointer-events-none"
            />
          </div>
          <p className="text-xs text-white/50 sm:text-sm">Help others understand what this list contains</p>
        </div>

        <ListVisibilityField
          id="create-list-is-public"
          checked={formData.isPublic}
          onChange={(event) => setFormData((current) => ({ ...current, isPublic: event.target.checked }))}
        />

        {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300 sm:text-sm">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton onClick={close} disabled={isPending}>Cancel</CancelButton>
          <Button type="submit" variant="glassPurple" isLoading={isPending} loadingText="Creating…">
            <ListPlus className={UI_ICON_CONTROL} aria-hidden />
            Create List
          </Button>
        </div>
      </form>
    </ListFormCard>
  );
}
