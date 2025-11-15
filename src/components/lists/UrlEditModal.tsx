"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { PencilIcon } from "@heroicons/react/24/outline";
import React from "react";
import type { UrlItem } from "@/stores/urlListStore";
import { UrlEnhancer } from "@/components/ai/UrlEnhancer";

interface UrlEditModalProps {
  editingUrl: UrlItem | null;
  setEditingUrl: (v: UrlItem | null) => void;
  editingTags: string;
  setEditingTags: (v: string) => void;
  editingNotes: string;
  setEditingNotes: (v: string) => void;
  editingReminder: string;
  setEditingReminder: (v: string) => void;
  isEditing?: boolean;
  handleEditUrl: (
    id: string,
    title: string,
    url: string,
    tags?: string[],
    notes?: string,
    reminder?: string
  ) => void;
}

export function UrlEditModal({
  editingUrl,
  setEditingUrl,
  editingTags,
  setEditingTags,
  editingNotes,
  setEditingNotes,
  editingReminder,
  setEditingReminder,
  isEditing = false,
  handleEditUrl,
}: UrlEditModalProps) {
  if (!editingUrl) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="w-full max-w-xl max-h-[90vh] my-8 rounded-2xl bg-gradient-to-br from-zinc-900 to-zinc-800 p-8 shadow-2xl border border-white/20 overflow-y-auto">
        <h2 className="text-2xl font-bold text-white flex items-center gap-2">
          <PencilIcon className="h-6 w-6 text-blue-400" />
          Edit URL
        </h2>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const tagsArray = editingTags
              .split(",")
              .map((tag) => tag.trim())
              .filter((tag) => tag.length > 0);
            handleEditUrl(
              editingUrl.id,
              editingUrl.title || "",
              editingUrl.url,
              tagsArray.length > 0 ? tagsArray : undefined,
              editingNotes || undefined,
              editingReminder || undefined
            );
          }}
          className="mt-8 space-y-6"
        >
          <div>
            <label className="block text-base font-medium text-white">
              Title
            </label>
            <Input
              type="text"
              value={editingUrl.title}
              onChange={(e) =>
                setEditingUrl({ ...editingUrl, title: e.target.value })
              }
              placeholder="URL Title"
              className="mt-2 text-lg shadow-sm"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-white">
              URL
            </label>
            <Input
              type="url"
              value={editingUrl.url}
              onChange={(e) =>
                setEditingUrl({ ...editingUrl, url: e.target.value })
              }
              placeholder="https://example.com"
              className="mt-2 text-lg shadow-sm"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-white">
              Tags (comma separated)
            </label>
            <Input
              type="text"
              value={editingTags}
              onChange={(e) => setEditingTags(e.target.value)}
              placeholder="e.g. work, reading, ai"
              className="mt-2 text-lg shadow-sm"
            />
            {editingUrl?.url && (
              <div className="mt-3">
                <UrlEnhancer
                  url={editingUrl.url}
                  title={editingUrl.title}
                  description={editingUrl.description}
                  onEnhance={(result) => {
                    // Apply AI suggestions
                    if (result.tags && result.tags.length > 0) {
                      const existingTags = editingTags
                        .split(",")
                        .map((t) => t.trim())
                        .filter((t) => t.length > 0);
                      const newTags = [...existingTags, ...result.tags].filter(
                        (tag, index, self) => self.indexOf(tag) === index
                      );
                      setEditingTags(newTags.join(", "));
                    }
                    if (result.summary) {
                      setEditingNotes(result.summary);
                    }
                  }}
                  compact={true}
                />
              </div>
            )}
          </div>
          <div>
            <label className="block text-base font-medium text-white">
              Notes (optional)
            </label>
            <Input
              type="text"
              value={editingNotes}
              onChange={(e) => setEditingNotes(e.target.value)}
              placeholder="Add a note..."
              className="mt-2 text-lg shadow-sm"
            />
          </div>
          <div>
            <label className="block text-base font-medium text-white">
              Reminder (optional)
            </label>
            <Input
              type="date"
              value={editingReminder}
              onChange={(e) => setEditingReminder(e.target.value)}
              className="mt-2 text-lg shadow-sm"
            />
          </div>
          <div className="flex justify-end gap-3 mt-8">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingUrl(null)}
              className="text-white border-white/30 hover:bg-white/10 text-lg px-6 py-2.5 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isEditing}
              className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-6 py-2.5 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isEditing ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
