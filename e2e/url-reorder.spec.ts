// C7.21 Wave 2: reorder payload must strip commentCount (Zod .strict) and return 200
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

test("reorder with commentCount is rejected; stripped payload succeeds", async ({
  page,
}) => {
  const { slug, listId } = await fixture();
  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("E2E URL A").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByRole("button", { name: /add url/i })).toBeEnabled({
    timeout: 20_000,
  });

  const result = await page.evaluate(async ({ listId: id, slug: s }) => {
    const unified = await fetch(
      `/api/lists/${encodeURIComponent(s)}/updates?activityLimit=20`,
    ).then((r) => r.json());
    const rawUrls = (unified.list?.urls || []) as Record<string, unknown>[];
    if (rawUrls.length < 2) {
      return { error: "need-2-urls", rawLen: rawUrls.length };
    }

    // Simulate pre-fix bug: full UrlItems including commentCount
    const withComment = rawUrls.map((u, i) => ({
      ...u,
      commentCount: typeof u.commentCount === "number" ? u.commentCount : i,
    }));
    const swappedWithComment = [withComment[1], withComment[0], ...withComment.slice(2)];
    const bad = await fetch(`/api/lists/${id}/urls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: swappedWithComment, action: "reorder" }),
    });

    // Client fix: strip unknown keys (mirrors toReorderUrlItems allowlist)
    const allowed = new Set([
      "id",
      "url",
      "title",
      "description",
      "createdAt",
      "updatedAt",
      "isFavorite",
      "isPinned",
      "tags",
      "category",
      "notes",
      "reminder",
      "clickCount",
      "position",
      "healthStatus",
      "healthCheckedAt",
      "healthLastStatus",
      "healthResponseTime",
    ]);
    // Mirror toReorderUrlItems: omit null/undefined, healthLastStatus 0, bad datetimes
    const isZodDatetime = (v: unknown) =>
      typeof v === "string" && /^\d{4}-\d{2}-\d{2}T.+Z$/.test(v);
    const stripped = swappedWithComment.map((u) => {
      const next: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(u)) {
        if (!allowed.has(k) || v === undefined || v === null) continue;
        if (
          (k === "createdAt" || k === "updatedAt" || k === "healthCheckedAt") &&
          !isZodDatetime(v)
        ) {
          continue;
        }
        if (
          k === "healthLastStatus" &&
          !(
            typeof v === "number" &&
            Number.isInteger(v) &&
            v >= 100 &&
            v <= 599
          )
        ) {
          continue;
        }
        next[k] = v;
      }
      return next;
    });
    const good = await fetch(`/api/lists/${id}/urls`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urls: stripped, action: "reorder" }),
    });
    const goodBody = good.ok ? null : await good.text().catch(() => "");

    return {
      badStatus: bad.status,
      goodStatus: good.status,
      goodBody,
      strippedHasCommentCount: JSON.stringify(stripped).includes("commentCount"),
    };
  }, { listId, slug });

  expect(result, JSON.stringify(result)).not.toHaveProperty("error");
  expect(result.badStatus, JSON.stringify(result)).toBe(400);
  expect(result.goodStatus, JSON.stringify(result)).toBe(200);
  expect(result.strippedHasCommentCount).toBe(false);

  await page.reload();
  await expect(page.getByText("E2E URL A").first()).toBeVisible({
    timeout: 20_000,
  });
  await expect(page.getByText("E2E URL B").first()).toBeVisible();
});
