"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import Auth from "@/components/Auth";
import { Textarea } from "@/components/ui/Textarea";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";
import { useToast } from "@/components/ui/Toaster";
import {
  LinkIcon,
  ArrowTopRightOnSquareIcon,
} from "@heroicons/react/24/outline";

interface SessionUser {
  id: string;
  email: string;
}

export default function NewListPageClient() {
  const router = useRouter();
  const { user: session, isLoading: sessionLoading } = useSession();
  const { toast } = useToast();
  const loading = sessionLoading;
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    slug: "",
    url: "",
    description: "",
    is_public: false,
  });

  // Session is now provided by useSession hook

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!formData.title) {
      setError("Title is required");
      return;
    }

    try {
      // Generate a slug if not provided
      const slug =
        formData.slug ||
        formData.title
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/(^-|-$)/g, "");

      const urls = formData.url
        ? [{ id: crypto.randomUUID(), url: formData.url }]
        : [];

      const response = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: formData.title,
          slug,
          description: formData.description || null,
          urls,
          isPublic: formData.is_public,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to create list");
      }

      const { list } = await response.json();

      // Show success toast notification
      toast({
        title: "List Created! 🎉",
        description: "Your new list has been successfully created.",
        variant: "success",
      });

      // Navigate after a brief delay to show toast
      setTimeout(() => {
        router.push(`/list/${list.slug}`);
      }, 500);
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create list";
      setError(errorMessage);

      // Show error toast notification
      toast({
        title: "Creation Failed",
        description: errorMessage,
        variant: "error",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-lg">
        Loading...
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <main className="container mx-auto px-2 sm:px-0">
      <div className="max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="text-left mb-4">
          {/* <div className="inline-flex items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-gradient-to-br from-blue-500/20 via-purple-500/20 to-indigo-500/20 border border-blue-400/30 mb-4 shadow-lg">
            <LinkIcon className="h-8 w-8 sm:h-10 sm:w-10 text-blue-400" />
          </div> */}
          <h1 className="text-xl sm:text-2xl md:text-3xl font-semibold bg-gradient-to-r from-blue-300 via-purple-300 to-indigo-300 bg-clip-text text-transparent">
            Create a New List
          </h1>
          <p className="text-white/70 text-base sm:text-lg max-w-7xl mx-auto">
            Organize your favorite URLs into beautiful, shareable collections
          </p>
        </div>

        {/* Form Card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-white/10 via-white/5 to-white/3 backdrop-blur-md border border-white/20 rounded-2xl shadow-2xl p-6 sm:p-8 md:p-10">
          {/* Animated background effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0 animate-pulse pointer-events-none" />

          <div className="relative z-10">
            <form onSubmit={handleSubmit} className="space-y-6 sm:space-y-8">
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                  Title <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-400/50 transition-all duration-200 shadow-inner"
                  placeholder="e.g., My Favorite Resources"
                  required
                />
                <p className="text-xs sm:text-sm text-white/50">
                  Give your list a memorable name
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-purple-400"></span>
                  Custom Slug{" "}
                  <span className="text-xs font-normal text-white/50">
                    (optional)
                  </span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50 text-sm">
                    /list/
                  </span>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                    className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 pl-20 py-3 sm:py-3.5 text-base sm:text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-400/50 transition-all duration-200 shadow-inner"
                    placeholder="custom-slug"
                  />
                </div>
                <p className="text-xs sm:text-sm text-white/50">
                  Custom URL slug (auto-generated from title if left empty)
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
                  First URL{" "}
                  <span className="text-xs font-normal text-white/50">
                    (optional)
                  </span>
                </label>
                <div className="space-y-3">
                  <input
                    type="url"
                    value={formData.url}
                    onChange={(e) =>
                      setFormData({ ...formData, url: e.target.value })
                    }
                    className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-xl px-4 sm:px-5 py-3 sm:py-3.5 text-base sm:text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-400/50 transition-all duration-200 shadow-inner"
                    placeholder="https://example.com"
                  />
                  {formData.url && (
                    <div className="bg-blue-500/10 border border-blue-400/20 rounded-xl p-3">
                      <UrlEnhancer
                        url={formData.url}
                        onEnhance={(result) => {
                          // Auto-fill description with AI summary if available
                          if (
                            result.success &&
                            result.summary &&
                            !formData.description
                          ) {
                            setFormData({
                              ...formData,
                              description: result.summary,
                            });
                          }
                        }}
                        compact={true}
                      />
                    </div>
                  )}
                </div>
                <p className="text-xs sm:text-sm text-white/50">
                  Add the first URL to get started (you can add more later)
                </p>
              </div>
              <div className="space-y-2">
                <label className="flex text-base sm:text-lg font-semibold text-white mb-2 items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-pink-400"></span>
                  Description{" "}
                  <span className="text-xs font-normal text-white/50">
                    (optional)
                  </span>
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  className="text-base sm:text-lg shadow-inner font-delicious rounded-xl border border-white/20 bg-white/10 backdrop-blur-sm focus:ring-2 focus:ring-pink-500 focus:border-pink-400/50 transition-all duration-200"
                  placeholder="Describe what this list is about..."
                  rows={4}
                />
                <p className="text-xs sm:text-sm text-white/50">
                  Help others understand what this list contains
                </p>
              </div>
              <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) =>
                      setFormData({ ...formData, is_public: e.target.checked })
                    }
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
                      Public lists can be viewed by anyone with the link.
                      Private lists are only visible to you and collaborators.
                    </p>
                  </div>
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-400/30 rounded-xl p-4 text-red-300 text-sm sm:text-base flex items-start gap-2">
                  <span className="text-red-400 font-bold">⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                className="group relative w-fit bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 hover:from-blue-700 hover:via-purple-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg hover:shadow-2xl transition-all duration-300 text-base sm:text-lg overflow-hidden"
              >
                {/* Shine effect */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000" />
                <span className="relative z-10 flex items-center justify-center gap-2">
                  <span>Create List</span>
                  <ArrowTopRightOnSquareIcon className="h-5 w-5 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
