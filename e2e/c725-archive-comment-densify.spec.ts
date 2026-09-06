// C7.25: archive densify + Browse SectionCountBadge smoke.
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

test("archive success keeps updates?activityLimit spam ≤1", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  const updates: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/updates?activityLimit=")) {
      updates.push(`${req.method()} ${req.url()}`);
    }
  });

  const archiveBtn = page.getByRole("button", { name: /^archive url$/i }).first();
  await expect(archiveBtn).toBeVisible({ timeout: 15_000 });

  const before = updates.length;
  await archiveBtn.click();

  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole("button", { name: /^archive$/i }).click();

  await expect(page.getByText(/url archived/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);

  const afterHits = updates.slice(before);
  // Soft assert for debugging: log captured updates in failure message
  expect(
    afterHits.length,
    `unexpected updates after archive:\n${afterHits.join("\n")}`,
  ).toBeLessThanOrEqual(1);
});

test("browse page paints section count badge", async ({ page }) => {
  await page.goto("/browse");
  const heading = page.getByRole("heading", {
    name: /discover public lists/i,
  });
  await expect(heading).toBeVisible({ timeout: 20_000 });
  // SectionCountBadge is a sibling of the h1 inside the title row
  await expect(heading.locator("..").getByText(/^\d+$/)).toBeVisible({
    timeout: 15_000,
  });
});

test("comment create keeps updates?activityLimit spam ≤1", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  const updates: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/updates?activityLimit=")) {
      updates.push(`${req.method()} ${req.url()}`);
    }
  });

  await page.getByRole("button", { name: /^comments$/i }).first().click();
  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  const box = dialog.getByPlaceholder(/add a comment/i);
  await expect(box).toBeVisible({ timeout: 10_000 });
  await box.fill(`c725 densify ${Date.now()}`);

  const before = updates.length;
  await dialog.getByRole("button", { name: /post comment/i }).click();
  await expect(dialog.getByText(/c725 densify/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.waitForTimeout(4000);

  const afterHits = updates.slice(before);
  expect(
    afterHits.length,
    `unexpected updates after comment:\n${afterHits.join("\n")}`,
  ).toBeLessThanOrEqual(1);
});

test("api docs tabs render Auth/Lists/Utility/Insights", async ({ page }) => {
  await page.goto("/api-docs");
  await expect(
    page.getByRole("heading", { name: /api documentation/i }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("tab", { name: /auth/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /lists/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /utility/i })).toBeVisible();
  await expect(page.getByRole("tab", { name: /insights/i })).toBeVisible();
  await page.getByRole("tab", { name: /lists/i }).click();
  await expect(page.getByText(/\/api\/lists/i).first()).toBeVisible({
    timeout: 10_000,
  });
});
