// C7.21 Waves 3–5: activity cap, jobs updates spam, single metadata batch
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
}

test("list detail opens with a single list metadata batch", async ({ page }) => {
  const { slug, listId } = await fixture();
  const metadataHits: string[] = [];
  page.on("request", (req) => {
    if (
      req.method() === "GET" &&
      req.url().includes(`/api/lists/${listId}/metadata`)
    ) {
      metadataHits.push(req.url());
    }
  });

  await openList(page, slug);
  await page.waitForTimeout(5000);
  expect(metadataHits.length).toBeLessThanOrEqual(1);
});

test("activity badge never exceeds 20", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  const activityHeading = page.getByText("Activity Feed").first();
  await expect(activityHeading).toBeVisible({ timeout: 15_000 });
  await activityHeading.click().catch(() => undefined);

  const badge = page
    .locator("text=Activity Feed")
    .first()
    .locator("..")
    .locator("span, div")
    .filter({ hasText: /^\d+$/ })
    .first();

  if (await badge.isVisible().catch(() => false)) {
    const n = Number(await badge.innerText());
    expect(n).toBeLessThanOrEqual(20);
  }
});

test("health check does not double-fire updates", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  const updates: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/updates?activityLimit=")) {
      updates.push(req.url());
    }
  });

  await page.getByRole("button", { name: /list jobs menu/i }).click();

  const health = page.getByRole("menuitem", { name: /health check/i });
  if (!(await health.isVisible().catch(() => false))) {
    test.skip(true, "Jobs menu not available in this layout");
    return;
  }

  const before = updates.length;
  await health.click();
  await page.waitForTimeout(6000);
  const after = updates.length - before;
  expect(after).toBeLessThanOrEqual(1);
});
