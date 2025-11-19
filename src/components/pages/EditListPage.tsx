"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Textarea";
import { useToast } from "@/components/ui/Toaster";
import { PencilIcon } from "@heroicons/react/24/outline";

export default function EditListPageClient() {
  const { slug } = useParams();
  const router = useRouter();
  const { toast } = useToast();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isPublic, setIsPublic] = useState(false);
  const [listId, setListId] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string>();

  useEffect(() => {
    async function fetchList() {
      if (typeof slug !== "string") return;

      try {
        const response = await fetch(`/api/lists/${slug}`);
        if (!response.ok) throw new Error("Failed to fetch list");

        const { list } = await response.json();
        setTitle(list.title || "");
        setDescription(list.description || "");
        setIsPublic(list.isPublic ?? false);
        setListId(list.id);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load list");
      } finally {
        setIsLoading(false);
      }
    }

    fetchList();
  }, [slug]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (typeof slug !== "string") return;

    setError("");
    setIsSaving(true);
    try {
      const response = await fetch(`/api/lists/${listId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description || null,
          isPublic,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to update list");
      }

      // Show success toast notification
      toast({
        title: "List Updated! ✅",
        description: "Your list has been successfully updated.",
        variant: "success",
      });

      // Navigate after a brief delay to show toast
      setTimeout(() => {
        router.push(`/list/${slug}`);
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update list";
      setError(errorMessage);

      // Show error toast notification
      toast({
        title: "Update Failed",
        description: errorMessage,
        variant: "error",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen w-full">
        {/* Header Skeleton */}
        <div className="text-left mb-4">
          <div className="h-8 bg-white/10 rounded w-48 mb-2 animate-pulse" />
          <div className="h-5 bg-white/10 rounded w-96 animate-pulse" />
        </div>

        {/* Form Card Skeleton */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-white/3 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
          <div className="relative z-10">
            <div className="space-y-6 sm:space-y-8 animate-pulse">
              {/* Title Field Skeleton */}
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold mb-2 items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="h-5 bg-white/10 rounded w-16" />
                  <div className="h-5 w-2 bg-white/10 rounded" />
                </label>
                <div className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 h-12" />
                <div className="h-4 bg-white/10 rounded w-40" />
              </div>

              {/* Description Field Skeleton */}
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold mb-2 items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-white/10" />
                  <div className="h-5 bg-white/10 rounded w-24" />
                  <div className="h-4 bg-white/10 rounded w-16" />
                </label>
                <div className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 h-24" />
                <div className="h-4 bg-white/10 rounded w-56" />
              </div>

              {/* Visibility Toggle Skeleton */}
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 mt-0.5 border border-white/30 rounded bg-white/10" />
                  <div className="flex-1">
                    <div className="h-5 bg-white/10 rounded w-40 mb-1" />
                    <div className="h-4 bg-white/10 rounded w-full" />
                  </div>
                </div>
              </div>

              {/* Action Buttons Skeleton */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4">
                <div className="h-12 bg-white/10 rounded border border-white/30 w-full sm:w-auto order-2 sm:order-1" />
                <div className="h-12 bg-white/10 rounded w-full sm:w-auto order-1 sm:order-2" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full">
      {/* Header Section */}
      <div className="text-left mb-4">
        {/* <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20 border border-blue-400/30 mb-4 shadow-lg">
            <PencilIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
          </div> */}
        <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
          Edit List
        </h1>
        <p className="text-white/70 text-base sm:text-lg max-w-7xl mx-auto">
          Update your list details and settings
        </p>
      </div>

      {/* Form Card */}
      <div className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-white/3 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
        {/* Animated background effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0 animate-pulse pointer-events-none" />

        <div className="relative z-10">
          <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
            {/* Title Field */}
            <div className="space-y-2">
              <label
                htmlFor="title"
                className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                Title <span className="text-red-400">*</span>
              </label>
              <Input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., My Favorite Resources"
                required
                className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400/50 transition-all duration-200 shadow-inner"
              />
              <p className="text-xs sm:text-sm text-white/50">
                Give your list a memorable name
              </p>
            </div>

            {/* Description Field */}
            <div className="space-y-2">
              <label
                htmlFor="description"
                className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                Description{" "}
                <span className="text-xs font-normal text-white/50">
                  (optional)
                </span>
              </label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="text-base sm:text-lg shadow-inner font-delicious rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-400/50 transition-all duration-200"
                placeholder="Describe what this list is about..."
                rows={4}
              />
              <p className="text-xs sm:text-sm text-white/50">
                Help others understand what this list contains
              </p>
            </div>

            {/* Visibility Toggle */}
            <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="h-5 w-5 mt-0.5 text-blue-600 border-white/30 rounded bg-white/10 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-transparent cursor-pointer"
                  id="is_public"
                />
                <div className="flex-1">
                  <label
                    htmlFor="is_public"
                    className="text-white font-medium text-base sm:text-lg cursor-pointer mb-1"
                  >
                    Make this list public
                  </label>
                  <p className="text-xs sm:text-sm text-white/60">
                    Public lists can be viewed by anyone with the link. Private
                    lists are only visible to you and collaborators.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm sm:text-base flex items-start gap-2">
                <span className="text-red-400 font-bold">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3 sm:gap-4 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                className="text-white border-white/30 hover:bg-white/10 transition-all duration-200 order-2 sm:order-1"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                isLoading={isSaving}
                className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-4 sm:py-4.5 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 text-base sm:text-lg order-1 sm:order-2"
              >
                {isSaving ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
