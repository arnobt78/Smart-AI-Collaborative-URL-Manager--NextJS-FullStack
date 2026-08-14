/**
 * CreateNewListButton — glass-glow CTA with FolderPlus icon (Lists + Home).
 */
import { FolderPlus } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CreateNewListButtonProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
};

export function CreateNewListButton({
  className,
  label = "Create New List",
  size = "md",
}: CreateNewListButtonProps) {
  return (
    <Button
      href="/new"
      variant="glassPurple"
      size={size}
      className={cn("w-full sm:w-auto", className)}
    >
      <FolderPlus className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}
