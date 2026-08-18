/**
 * CreateNewListButton — glass-glow CTA with FolderPlus icon (Lists + Home).
 */
import { FolderPlus, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

type CreateNewListButtonProps = {
  className?: string;
  label?: string;
  size?: "sm" | "md" | "lg";
  icon?: LucideIcon;
};

export function CreateNewListButton({
  className,
  label = "Create New List",
  size = "md",
  icon: Icon = FolderPlus,
}: CreateNewListButtonProps) {
  return (
    <Button
      href="/lists?dialog=create"
      variant="glassPurple"
      size={size}
      className={cn("w-full sm:w-auto", className)}
    >
      <Icon className="h-4 w-4 sm:h-5 sm:w-5 shrink-0" aria-hidden />
      <span>{label}</span>
    </Button>
  );
}
