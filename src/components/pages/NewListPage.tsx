"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "@/hooks/useSession";
import Auth from "@/components/Auth";
import { Textarea } from "@/components/ui/Textarea";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";

interface SessionUser {
  id: string;
  email: string;
}

export default function NewListPageClient() {
  const router = useRouter();
  const { user: session, isLoading: sessionLoading } = useSession();
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
      router.push(`/list/${list.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create list");
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
    <main className="container mx-auto">
      <div className="min-h-screen flex items-center justify-center max-w-lg bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl shadow-xl p-6 sm:p-10">
        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-6 text-center">
          Create a New List
        </h1>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-base font-medium text-white mb-1">
              Title
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="List Title"
              required
            />
          </div>
          <div>
            <label className="block text-base font-medium text-white mb-1">
              Custom Slug (optional)
            </label>
            <input
              type="text"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="custom-slug"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-white mb-1">
              First URL (optional)
            </label>
            <div className="space-y-2">
              <input
                type="url"
                value={formData.url}
                onChange={(e) =>
                  setFormData({ ...formData, url: e.target.value })
                }
                className="w-full border border-white/20 bg-white/10 backdrop-blur-sm rounded-lg px-4 py-2 text-lg text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="https://example.com"
              />
              {formData.url && (
                <UrlEnhancer
                  url={formData.url}
                  onEnhance={(result) => {
                    // Auto-fill description with AI summary if available
                    if (
                      result.success &&
                      result.summary &&
                      !formData.description
                    ) {
                      setFormData({ ...formData, description: result.summary });
                    }
                  }}
                  compact={true}
                />
              )}
            </div>
          </div>
          <div>
            <label className="block text-base font-medium text-white mb-1">
              Description (optional)
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              className="text-lg shadow-md font-delicious rounded-xl"
              placeholder="Describe your list..."
              rows={3}
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={formData.is_public}
              onChange={(e) =>
                setFormData({ ...formData, is_public: e.target.checked })
              }
              className="h-4 w-4 text-blue-600 border-white/20 rounded bg-white/10"
              id="is_public"
            />
            <label htmlFor="is_public" className="text-white/80 text-base">
              Make this list public
            </label>
          </div>
          {error && <div className="text-red-400 text-sm">{error}</div>}
          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 text-lg"
          >
            Create List
          </button>
        </form>
      </div>
    </main>
  );
}
