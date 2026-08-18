// REQ-0021: Shared list-form visual primitives prevent create/edit layout drift.
"use client";

import { type ChangeEvent } from "react";

export function ListFormCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative overflow-hidden rounded-xl border border-white/20 bg-gradient-to-br from-white/10 via-white/5 to-white/3 p-3 shadow-xl backdrop-blur-md sm:p-4">
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-blue-500/0 via-purple-500/5 to-indigo-500/0" />
      <div className="relative z-10">{children}</div>
    </div>
  );
}

interface ListVisibilityFieldProps {
  checked: boolean;
  id: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
}

export function ListVisibilityField({ checked, id, onChange }: ListVisibilityFieldProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4">
      <label htmlFor={id} className="flex cursor-pointer items-center gap-2 text-sm font-medium text-white sm:text-base">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={onChange}
          className="h-4 w-4 shrink-0 rounded border-white/30 bg-white/10 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0 focus:ring-offset-transparent"
        />
        <span>Make this list public</span>
      </label>
      <p className="pl-6 text-xs text-white/60 sm:text-sm">
        Public lists can be viewed by anyone with the link. Private lists are only visible to you and collaborators.
      </p>
    </div>
  );
}
