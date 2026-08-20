/**
 * CreateNewListButton — glass-glow CTA with FolderPlus icon (Lists + Home).
 * REQ-0034: hydrated launchers must supply a local onClick; never fall back to an RSC link.
 */
import { FolderPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CreateNewListButtonProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
  onClick: () => void;
};

export function CreateNewListButton({
  className,
  label = "Create New List",
  size = "md",
  icon: Icon = FolderPlus,
  onClick,
}: CreateNewListButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      variant="glassPurple"
      size={size}
      className={cn("w-full sm:w-auto", className)}
    >
      <Icon className="h-4 w-4  shrink-0" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}
