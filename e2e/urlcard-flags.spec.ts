// C7.21 Wave 1: favorite/pin single PATCH + no flag flicker
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
  await expect(page.getByText("E2E URL A").first()).toBeVisible({
    timeout: 20_000,
  });
  // Wait for edit chrome (owner session)
  await expect(page.getByRole("button", { name: /add url/i })).toBeEnabled({
    timeout: 20_000,
  });
}

test("favorite toggles once without flag flicker", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  // Prefer toolbar IconButton (nth 1); overlay star is nth 0 and can be flaky under hover.
  const stars = page.getByRole("button", {
    name: /add to favorites|remove from favorites/i,
  });
  await expect(stars.first()).toBeVisible({ timeout: 15_000 });
  const star = (await stars.count()) > 1 ? stars.nth(1) : stars.first();
  await star.scrollIntoViewIfNeeded();
  await expect(star).toBeEnabled();

  const patchPromise = page.waitForRequest(
    (req) =>
      req.method() === "PATCH" &&
      req.url().includes("/urls") &&
      (req.postData() || "").includes("isFavorite"),
    { timeout: 25_000 },
  );
  await star.click();
  await patchPromise;

  let extra = 0;
  const onReq = (r: import("@playwright/test").Request) => {
    if (
      r.method() === "PATCH" &&
      r.url().includes("/urls") &&
      (r.postData() || "").includes("isFavorite")
    ) {
      extra += 1;
    }
  };
  page.on("request", onReq);
  await page.waitForTimeout(2000);
  page.off("request", onReq);
  expect(extra).toBe(0);
});

test("pin toggles once without double PATCH", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);

  const pin = page
    .locator("main")
    .getByRole("button", { name: /pin to top|unpin from top/i })
    .last();
  await expect(pin).toBeVisible({ timeout: 15_000 });
  await pin.scrollIntoViewIfNeeded();
  await expect(pin).toBeEnabled();

  const patchPromise = page.waitForRequest(
    (req) =>
      req.method() === "PATCH" &&
      req.url().includes("/urls") &&
      (req.postData() || "").includes("isPinned"),
    { timeout: 25_000 },
  );
  await pin.click({ force: true });
  await patchPromise;

  let extra = 0;
  const onReq = (r: import("@playwright/test").Request) => {
    if (
      r.method() === "PATCH" &&
      r.url().includes("/urls") &&
      (r.postData() || "").includes("isPinned")
    ) {
      extra += 1;
    }
  };
  page.on("request", onReq);
  await page.waitForTimeout(2000);
  page.off("request", onReq);
  expect(extra).toBe(0);
});
