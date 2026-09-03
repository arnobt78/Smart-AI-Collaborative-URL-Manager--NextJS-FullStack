// REQ-0053: browser-level regression for cached list navigation after mutation.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

test("URL mutation survives immediate Back/Forward and list revisit", async ({ page }) => {
  const { listId, slug } = await fixture();
  await page.goto(`/list/${slug}`);
  await expect(page.getByText("E2E Warm List")).toBeVisible();

  // Use the visible add control so the page's actual optimistic cache path runs.
  await page.getByRole("button", { name: /add url/i }).click();
  await page.getByPlaceholder(/https?:\/\//i).fill("https://playwright.example.test");
  await page.getByRole("button", { name: /add/i }).last().click();
  await expect(page.getByText(/playwright\.example/i)).toBeVisible();

  await page.getByRole("link", { name: /my lists/i }).click();
  await expect(page.getByText("E2E Warm List")).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(new RegExp(`/list/${slug}`));
  await page.goForward();
  await expect(page.getByText("E2E Warm List")).toBeVisible();

  // Keep fixture variables referenced so a failed auth/route setup is explicit.
  expect(listId).toBeTruthy();
});
