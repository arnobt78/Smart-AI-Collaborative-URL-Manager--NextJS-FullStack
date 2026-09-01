import {
  isGenericCollectionName,
  resolveCollectionName,
} from "@/lib/ai/collection-naming";

describe("collection naming helpers", () => {
  it("detects generic AI placeholder names", () => {
    expect(isGenericCollectionName("Related URLs")).toBe(true);
    expect(isGenericCollectionName("Untitled Collection")).toBe(true);
    expect(isGenericCollectionName("")).toBe(true);
    expect(isGenericCollectionName("React Dev Tools")).toBe(false);
  });

  it("falls back to heuristic name for generic AI output", () => {
    expect(resolveCollectionName("Related URLs", "Api Console Tools")).toBe(
      "Api Console Tools",
    );
    expect(resolveCollectionName("React Dev Tools", "Fallback")).toBe(
      "React Dev Tools",
    );
  });
});
