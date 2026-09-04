// C7.22: refresh-metadata completes; toast clears; activity FIFO subtitle
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

test("refresh-metadata returns and clears loading toast", async ({ page }) => {
  const { slug } = await fixture();
  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  await page.getByRole("button", { name: /list jobs menu/i }).click();
  const refresh = page.getByRole("menuitem", { name: /refresh metadata/i });
  if (!(await refresh.isVisible().catch(() => false))) {
    test.skip(true, "Jobs menu not available in this layout");
    return;
  }

  const responsePromise = page.waitForResponse(
    (res) =>
      res.url().includes("/api/jobs/refresh-metadata") &&
      res.request().method() === "POST",
    { timeout: 60_000 },
  );
  await refresh.click();

  const response = await responsePromise;
  expect(response.status()).toBe(200);

  // Loading toast must clear (success or error — never stuck forever)
  await expect(page.getByText("Refreshing Metadata")).toBeHidden({
    timeout: 15_000,
  });
  await expect(
    page.getByText(/Metadata Refresh Complete|Refresh Failed|Timed Out/i).first(),
  ).toBeVisible({ timeout: 10_000 });
});

test("activity feed subtitle mentions FIFO limit 20", async ({ page }) => {
  const { slug } = await fixture();
  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  await expect(page.getByText(/Latest 20 events/i).first()).toBeVisible({
    timeout: 15_000,
  });
});
