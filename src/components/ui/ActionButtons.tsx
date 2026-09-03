// REQ-0021: Reusable labelled secondary actions keep Cancel and Clear iconography consistent.
"use client";

import { Eraser, StickyNote, X } from "lucide-react";
import { Button, type ButtonProps } from "@/components/ui/Button";
import { UI_ICON_CONTROL } from "@/lib/ui/control-styles";
import { cn } from "@/lib/utils";

export function CancelButton({ children = "Cancel", ...props }: ButtonProps) {
  return (
    <Button type="button" variant="glassNeutral" {...props}>
      <StickyNoteX aria-hidden />
      {children}
    </Button>
  );
}

/** Lucide 0.552 has StickyNote and X but no composite export, so compose the requested glyph locally. */
function StickyNoteX({ "aria-hidden": ariaHidden }: { "aria-hidden"?: boolean }) {
  return (
    <span className={cn("relative", UI_ICON_CONTROL)} aria-hidden={ariaHidden}>
      <StickyNote className={UI_ICON_CONTROL} />
      <X className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-zinc-900" strokeWidth={3} />
    </span>
  );
}

export function ClearButton({ children = "Clear", ...props }: ButtonProps) {
  return (
    <Button type="button" variant="glassNeutral" {...props}>
      <Eraser className={UI_ICON_CONTROL} aria-hidden />
      {children}
    </Button>
  );
}
