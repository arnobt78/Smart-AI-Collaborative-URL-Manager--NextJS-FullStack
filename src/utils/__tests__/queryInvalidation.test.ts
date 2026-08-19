import { QueryClient } from "@tanstack/react-query";
import { invalidateMutationImpact } from "@/utils/queryInvalidation";

describe("REQ-0025 mutation impact gateway", () => {
  it.each(["list", "visibility", "url", "archive", "import", "collaborator", "comment", "collection", "metadata", "action", "analytics"] as const)(
    "maps %s through one centralized invalidation path",
    (impact) => {
      const client = new QueryClient();
      const invalidate = jest.spyOn(client, "invalidateQueries");

      invalidateMutationImpact(client, impact, "test-list", "list-1");

      expect(invalidate).toHaveBeenCalled();
    },
  );
});
