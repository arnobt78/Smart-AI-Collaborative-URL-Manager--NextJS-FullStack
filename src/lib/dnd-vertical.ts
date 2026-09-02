import type { Transform } from "@dnd-kit/utilities";

/**
 * Force sortable item transforms to the Y axis only.
 * Prevents horizontal page scroll while reordering vertical lists.
 */
export function verticalOnlyTransform(
  transform: Transform | null | undefined,
): Transform | null {
  if (!transform) return null;
  return { ...transform, x: 0 };
}
