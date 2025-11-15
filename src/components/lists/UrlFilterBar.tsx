"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import React from "react";

interface UrlFilterBarProps {
  search: string;
  setSearch: (v: string) => void;
  sortOption: "latest" | "oldest" | "az" | "za" | "favorite";
  setSortOption: (v: "latest" | "oldest" | "az" | "za" | "favorite") => void;
  allTags: string[];
  tagFilter: string | null;
  setTagFilter: (v: string | null) => void;
}

export function UrlFilterBar({
  search,
  setSearch,
  sortOption,
  setSortOption,
  allTags,
  tagFilter,
  setTagFilter,
}: UrlFilterBarProps) {
  return (
    <>
      {/* Tag filter bar */}
      {allTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          <span className="font-semibold text-gray-700 mr-2">
            Filter by tag:
          </span>
          <button
            className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              !tagFilter
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }`}
            onClick={() => setTagFilter(null)}
          >
            All
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`px-3 py-1 rounded-full text-xs font-semibold border ${
                tagFilter === tag
                  ? "bg-blue-600 text-white"
                  : "bg-gray-100 text-gray-700"
              }`}
              onClick={() => setTagFilter(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}
      {/* Search and sort bar */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
        <Input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search URLs, titles, or descriptions..."
          className="flex-1 text-lg shadow-sm font-delicious bg-transparent"
        />
        <div className="flex gap-2 flex-wrap">
          <Button
            type="button"
            className={
              sortOption === "latest"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }
            onClick={() => setSortOption("latest")}
          >
            Recently Added
          </Button>
          <Button
            type="button"
            className={
              sortOption === "oldest"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }
            onClick={() => setSortOption("oldest")}
          >
            Oldest
          </Button>
          <Button
            type="button"
            className={
              sortOption === "az"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }
            onClick={() => setSortOption("az")}
          >
            A-Z
          </Button>
          <Button
            type="button"
            className={
              sortOption === "za"
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700"
            }
            onClick={() => setSortOption("za")}
          >
            Z-A
          </Button>
          <Button
            type="button"
            className={
              sortOption === "favorite"
                ? "bg-yellow-400 text-white"
                : "bg-gray-100 text-gray-700"
            }
            onClick={() => setSortOption("favorite")}
          >
            favorites
          </Button>
        </div>
      </div>
    </>
  );
}
