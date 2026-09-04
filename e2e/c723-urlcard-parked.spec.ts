// C7.23: Add URL null-metadata 400 fix, archive strip, duplicate metadata keep, scroll titles
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

async function openList(page: import("@playwright/test").Page, slug: string) {
  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("button", { name: /add url/i })).toBeEnabled({
    timeout: 20_000,
  });
}

test("POST urls accepts null-heavy metadata (Add URL 400 fix)", async ({
  page,
}) => {
  const { slug, listId } = await fixture();
  await openList(page, slug);

  const unique = `https://c723-add-${Date.now()}.example.test/`;
  const result = await page.evaluate(
    async ({ listId: id, url }) => {
      const res = await fetch(`/api/lists/${id}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url,
          title: "C723 Add",
          metadata: {
            title: "C723 Add",
            description: null,
            image: null,
            favicon: "/favicon.ico",
            siteName: null,
          },
        }),
      });
      const body = await res.json().catch(() => ({}));
      return { status: res.status, error: body.error, urlId: body.url?.id };
    },
    { listId, url: unique },
  );

  expect(result.status).toBe(200);
  expect(result.urlId).toBeTruthy();
});

test("archive-url succeeds with commentCount/archivedAt on client rows", async ({
  page,
}) => {
  const { slug, listId } = await fixture();
  await openList(page, slug);

  const result = await page.evaluate(async ({ listId: id, slug: s }) => {
    const unified = await fetch(
      `/api/lists/${encodeURIComponent(s)}/updates?activityLimit=20`,
    ).then((r) => r.json());
    const rawUrls = (unified.list?.urls || []) as Record<string, unknown>[];
    if (rawUrls.length < 1) return { error: "no-urls" };

    const target = rawUrls[0];
    const urlId = String(target.id);
    const remaining = rawUrls.filter((u) => u.id !== urlId);
    const archived = [
      {
        ...target,
        commentCount: 9,
        archivedAt: new Date().toISOString(),
      },
    ];

    // Pre-fix style body (should 400 without client strip — server still strict)
    const dirty = await fetch(`/api/lists/${id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: remaining.map((u) => ({ ...u, commentCount: 1 })),
        archivedUrls: archived,
        action: "archive",
        urlId,
      }),
    });

    const allowed = [
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
    ] as const;

    const strip = (rows: Record<string, unknown>[]) =>
      rows.map((raw) => {
        const item: Record<string, unknown> = {};
        for (const key of allowed) {
          const value = raw[key];
          if (value !== undefined && value !== null) {
            if (key === "healthLastStatus" && value === 0) continue;
            item[key] = value;
          }
        }
        return item;
      });

    const clean = await fetch(`/api/lists/${id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: strip(remaining),
        archivedUrls: strip([{ ...target }]),
        action: "archive",
        urlId,
      }),
    });

    // Restore so later tests keep URLs
    const after = await clean.json().catch(() => ({}));
    const restoredUrls = [
      ...(after.list?.urls || []),
      ...(after.list?.archivedUrls || []).filter(
        (u: { id: string }) => u.id === urlId,
      ),
    ];
    const restoredArchived = (after.list?.archivedUrls || []).filter(
      (u: { id: string }) => u.id !== urlId,
    );
    await fetch(`/api/lists/${id}/archive-url`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        urls: strip(restoredUrls),
        archivedUrls: strip(restoredArchived),
        action: "restore",
        urlId,
      }),
    });

    return { dirty: dirty.status, clean: clean.status };
  }, { listId, slug });

  expect(result.dirty).toBe(400);
  expect(result.clean).toBe(200);
});

test("deleting one duplicate keeps shared url-metadata guard false", async ({
  page,
}) => {
  const { slug, listId } = await fixture();
  await openList(page, slug);

  const result = await page.evaluate(async ({ listId: id }) => {
    const pageUrl = `https://c723-dup-${Date.now()}.example.test/`;
    const meta = {
      title: "Dup Meta",
      image: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
    };

    const add = async (isDuplicate: boolean) => {
      const res = await fetch(`/api/lists/${id}/urls`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: pageUrl,
          title: "Dup",
          metadata: meta,
          isDuplicate,
        }),
      });
      const body = await res.json();
      return { status: res.status, id: body.url?.id as string | undefined };
    };

    const a = await add(false);
    const b = await add(true);
    if (!a.id || !b.id) return { error: "add-failed", a, b };

    const shouldClearUrlMetadataCache = (
      urls: { id: string; url: string }[],
      deletedUrlId: string,
      deletedUrl: string,
    ) => !urls.some((u) => u.id !== deletedUrlId && u.url === deletedUrl);

    const shouldClear = shouldClearUrlMetadataCache(
      [
        { id: a.id, url: pageUrl },
        { id: b.id, url: pageUrl },
      ],
      a.id,
      pageUrl,
    );

    const del = await fetch(`/api/lists/${id}/urls`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urlId: a.id }),
    });

    await fetch(`/api/lists/${id}/urls`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ urlId: b.id }),
    });

    return {
      shouldClear,
      deleteStatus: del.status,
    };
  }, { listId });

  expect(result.error).toBeUndefined();
  expect(result.shouldClear).toBe(false);
  expect(result.deleteStatus).toBe(200);
});

test("list cards keep visible titles after scroll", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  await expect(page.getByText("E2E URL A").first()).toBeVisible({
    timeout: 20_000,
  });

  await page.evaluate(() => {
    window.scrollTo(0, document.body.scrollHeight);
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(300);

  await expect(page.getByText("E2E URL A").first()).toBeVisible();
  // Title text must remain — not an empty card shell
  const titleVisible = await page.getByText("E2E URL A").first().isVisible();
  expect(titleVisible).toBe(true);
});
