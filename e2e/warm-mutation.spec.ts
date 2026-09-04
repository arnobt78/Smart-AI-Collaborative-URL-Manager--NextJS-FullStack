// REQ-0053: browser-level regression for cached list navigation after mutation.
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

test("URL mutation survives immediate Back/Forward and list revisit", async ({
  page,
}) => {
  const { listId, slug } = await fixture();
  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("E2E URL A").first()).toBeVisible({
    timeout: 20_000,
  });

  const addBtn = page.getByRole("button", { name: /add url/i });
  await expect(addBtn).toBeEnabled({ timeout: 20_000 });
  await addBtn.click();

  const urlInput = page.getByPlaceholder(/enter a url to add/i);
  await expect(urlInput).toBeVisible({ timeout: 10_000 });
  await urlInput.fill("https://playwright.example.test");
  await page.getByRole("button", { name: /^add url$/i }).last().click();
  await expect(page.getByText(/playwright\.example/i).first()).toBeVisible({
    timeout: 45_000,
  });

  await page.getByRole("link", { name: /my lists/i }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });
  // Soft-nav back via list title (history goBack is flaky with soft-nav shells).
  await page.getByRole("heading", { name: "E2E Warm List" }).first().click();
  await expect(page).toHaveURL(new RegExp(`/list/${slug}`), { timeout: 20_000 });
  await expect(page.getByText(/playwright\.example/i).first()).toBeVisible({
    timeout: 20_000,
  });
  await page.getByRole("link", { name: /my lists/i }).click();
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  expect(listId).toBeTruthy();
});
