"use client";

import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import React from "react";

interface UrlAddFormProps {
  newUrl: string;
  setNewUrl: (v: string) => void;
  newTags: string;
  setNewTags: (v: string) => void;
  newNotes: string;
  setNewNotes: (v: string) => void;
  newReminder: string;
  setNewReminder: (v: string) => void;
  error?: string;
  isLoading: boolean;
  onAdd: (e: React.FormEvent) => void;
}

export function UrlAddForm({
  newUrl,
  setNewUrl,
  newTags,
  setNewTags,
  newNotes,
  setNewNotes,
  newReminder,
  setNewReminder,
  error,
  isLoading,
  onAdd,
}: UrlAddFormProps) {
  return (
    <form onSubmit={onAdd} className="flex flex-col md:flex-row gap-3">
      <Input
        type="url"
        value={newUrl}
        onChange={(e) => setNewUrl(e.target.value)}
        placeholder="Enter a URL to add to your list..."
        error={error}
        className="flex-1 text-lg shadow-sm font-delicious bg-transparent"
      />
      <Input
        type="text"
        value={newTags}
        onChange={(e) => setNewTags(e.target.value)}
        placeholder="Tags (comma separated)"
        className="flex-1 text-lg shadow-sm font-delicious bg-transparent"
      />
      <Input
        type="text"
        value={newNotes}
        onChange={(e) => setNewNotes(e.target.value)}
        placeholder="Notes (optional)"
        className="flex-1 text-lg shadow-sm font-delicious bg-transparent"
      />
      <Input
        type="date"
        value={newReminder}
        onChange={(e) => setNewReminder(e.target.value)}
        placeholder="Reminder (optional)"
        className="flex-1 text-lg shadow-sm font-delicious bg-transparent"
      />
      <Button
        type="submit"
        isLoading={isLoading}
        className="bg-blue-600 hover:bg-blue-700 text-white text-lg font-semibold px-8 py-2.5 rounded-xl shadow-md hover:shadow-xl transition-all duration-200 whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer font-delicious"
      >
        Add URL
      </Button>
    </form>
  );
}
