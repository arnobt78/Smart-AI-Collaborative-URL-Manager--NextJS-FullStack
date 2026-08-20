// REQ-0032: Keep hydrated Create List launchers local while sharing one confirmed dialog lifecycle.
"use client";

import { useState } from "react";
import { Dialog } from "@/components/ui/Dialog";
import NewListPageClient from "@/components/pages/NewListPage";

interface CreateListDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/**
 * Shared Create List overlay for every hydrated launcher. The form owns its
 * mutation lifecycle, while this wrapper prevents dismissal until it reports
 * that the confirmed create transition has completed or failed.
 */
export function CreateListDialog({ open, onOpenChange }: CreateListDialogProps) {
  const [pending, setPending] = useState(false);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Create a New List"
      description="Organize your favorite URLs into beautiful, shareable collections."
      size="wide"
      headerMode="scroll"
      pending={pending}
    >
      <NewListPageClient
        onClose={() => onOpenChange(false)}
        onPendingChange={setPending}
      />
    </Dialog>
  );
}
