// REQ-0021: Cache-seeded editor avoids loading/remount chrome when a dialog opens.
"use client";

import { useEffect, useState } from "react";
import { Save } from "lucide-react";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CancelButton } from "@/components/ui/ActionButtons";
import { CharacterCounter } from "@/components/ui/CharacterCounter";
import { ListFormCard, ListVisibilityField } from "@/components/lists/ListFormPrimitives";
import { useToast } from "@/components/ui/Toaster";
import { type EditableList, useUpdateList } from "@/hooks/useListQueries";
import { FORM_STACK } from "@/lib/ui-spacing";
import {
  LIST_DESCRIPTION_MAX,
  LIST_TITLE_MAX,
} from "@/lib/ui/form-limits";

interface EditListPageClientProps {
  list: EditableList;
  onClose: () => void;
  onPendingChange?: (pending: boolean) => void;
}

export default function EditListPageClient({ list, onClose, onPendingChange }: EditListPageClientProps) {
  const { toast } = useToast();
  const updateListMutation = useUpdateList();
  const [title, setTitle] = useState(list.title ?? "");
  const [description, setDescription] = useState(list.description ?? "");
  const [isPublic, setIsPublic] = useState(list.isPublic ?? false);
  const [error, setError] = useState("");
  const [isCompleting, setIsCompleting] = useState(false);
  const isPending = updateListMutation.isPending || isCompleting;

  useEffect(() => {
    onPendingChange?.(isPending);
  }, [isPending, onPendingChange]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!title.trim()) {
      setError("Title is required");
      return;
    }

    try {
      await updateListMutation.mutateAsync({
        id: list.id,
        slug: list.slug,
        title: title.trim(),
        description: description.trim() || null,
        isPublic,
      });
      toast({
        title: "List Updated! ✅",
        description: "Your list has been successfully updated.",
        variant: "success",
      });
      // Cache commits are synchronous; close on the next frame so the edited
      // card/detail surface paints before this confirmed dialog disappears.
      setIsCompleting(true);
      requestAnimationFrame(onClose);
    } catch (caughtError) {
      setIsCompleting(false);
      const message = caughtError instanceof Error ? caughtError.message : "Failed to update list";
      setError(message);
      toast({ title: "Update Failed", description: message, variant: "error" });
    }
  };

  return (
    <ListFormCard>
      <form onSubmit={handleSubmit} className={FORM_STACK}>
        <div className="space-y-2">
          <label
            htmlFor="edit-list-title"
            className="flex items-center justify-between gap-2 text-sm font-medium text-white sm:text-base"
          >
            <span className="flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              Title <span className="text-red-400">*</span>
            </span>
            <CharacterCounter current={title.length} max={LIST_TITLE_MAX} />
          </label>
          <Input
            id="edit-list-title"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g., My Favorite Resources"
            maxLength={LIST_TITLE_MAX}
            required
          />
          <p className="text-xs text-white/50 sm:text-sm">Give your list a memorable name</p>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-list-description" className="flex items-center gap-2 text-sm font-medium text-white sm:text-base">
            <span className="h-1.5 w-1.5 rounded-full bg-pink-400" />
            Description <span className="text-xs font-normal text-white/50">(optional)</span>
          </label>
          <div className="relative">
            <Textarea
              id="edit-list-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              className="min-h-28 rounded-xl border-white/20 bg-white/10 px-3 py-2 pb-8 text-sm shadow-inner placeholder:text-sm focus:border-pink-400/50 focus:ring-2 focus:ring-pink-500 sm:text-sm"
              placeholder="Describe what this list is about..."
              rows={4}
              maxLength={LIST_DESCRIPTION_MAX}
            />
            <CharacterCounter
              current={description.length}
              max={LIST_DESCRIPTION_MAX}
              className="absolute bottom-2 right-3 pointer-events-none"
            />
          </div>
          <p className="text-xs text-white/50 sm:text-sm">Help others understand what this list contains</p>
        </div>

        <ListVisibilityField
          id="edit-list-is-public"
          checked={isPublic}
          onChange={(event) => setIsPublic(event.target.checked)}
        />

        {error ? <p role="alert" className="rounded-xl border border-red-400/30 bg-red-500/10 p-3 text-xs text-red-300 sm:text-sm">{error}</p> : null}

        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <CancelButton onClick={onClose} disabled={isPending}>Cancel</CancelButton>
          <Button type="submit" variant="primary" isLoading={isPending}>
            <Save className="h-4 w-4 shrink-0" aria-hidden />
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </form>
    </ListFormCard>
  );
}
