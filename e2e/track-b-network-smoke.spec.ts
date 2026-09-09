/**
 * Phase B: scoped Track B Network smoke (not full-app A–Z).
 * Asserts lists/browse card wire shape, list-detail SSE, soft-nav urlCount, tab-hide pause.
 */
import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

type Fixture = { listId: string; slug: string };

async function fixture(): Promise<Fixture> {
  return JSON.parse(await readFile("e2e/.auth/fixture.json", "utf8")) as Fixture;
}

function isCardListPayload(body: unknown): body is {
  lists: Array<{ urlCount?: number; urls?: unknown; slug?: string }>;
} {
  return (
    !!body &&
    typeof body === "object" &&
    Array.isArray((body as { lists?: unknown }).lists)
  );
}

test("GET /api/lists card payload has urlCount and omits urls arrays", async ({
  page,
}) => {
  await page.goto("/lists");
  await expect(page.getByRole("heading", { name: /my lists/i }).first()).toBeVisible({
    timeout: 20_000,
  });
  const res = await page.request.get("/api/lists");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as unknown;
  expect(isCardListPayload(body)).toBe(true);
  if (!isCardListPayload(body)) return;
  expect(body.lists.length).toBeGreaterThan(0);
  for (const row of body.lists) {
    expect(typeof row.urlCount).toBe("number");
    expect(row).not.toHaveProperty("urls");
  }
});

test("GET /api/lists/public card payload has urlCount and omits urls arrays", async ({
  page,
}) => {
  await page.goto("/browse");
  await expect(
    page.getByRole("heading", { name: /discover public lists/i }),
  ).toBeVisible({ timeout: 20_000 });
  const res = await page.request.get("/api/lists/public");
  expect(res.ok()).toBeTruthy();
  const body = (await res.json()) as unknown;
  expect(isCardListPayload(body)).toBe(true);
  if (!isCardListPayload(body)) return;
  for (const row of body.lists) {
    expect(typeof row.urlCount).toBe("number");
    expect(row).not.toHaveProperty("urls");
  }
});

test("list detail opens SSE; hide tab closes EventSource; show reconnects", async ({
  page,
}) => {
  const { listId, slug } = await fixture();

  const sseOpened: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes(`/api/realtime/list/${listId}/events`)) {
      sseOpened.push(req.url());
    }
  });

  await page.goto(`/list/${slug}`);
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  await expect
    .poll(() => sseOpened.length, { timeout: 15_000 })
    .toBeGreaterThanOrEqual(1);

  const beforeHide = sseOpened.length;

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => true,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });
  await page.waitForTimeout(800);
  // Hide must not open additional SSE connections (pause closes EventSource)
  expect(sseOpened.length).toBe(beforeHide);

  await page.evaluate(() => {
    Object.defineProperty(document, "hidden", {
      configurable: true,
      get: () => false,
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect
    .poll(() => sseOpened.length, { timeout: 15_000 })
    .toBeGreaterThan(beforeHide);
});

test("soft-nav Lists→detail URL badge is not stuck at 0 when card has urlCount", async ({
  page,
}) => {
  const { slug } = await fixture();

  await page.goto("/lists");
  await expect(page.getByRole("heading", { name: /my lists/i }).first()).toBeVisible({
    timeout: 20_000,
  });

  const api = await page.request.get("/api/lists");
  const payload = (await api.json()) as {
    lists: Array<{ slug: string; urlCount: number }>;
  };
  const row = payload.lists.find((list) => list.slug === slug);
  expect(row).toBeTruthy();
  expect(row!.urlCount).toBeGreaterThan(0);

  const cardTitle = page.getByRole("button", { name: "E2E Warm List" }).first();
  await expect(cardTitle).toBeVisible({ timeout: 15_000 });

  // Prefer WarmSoftNavLink / soft navigation when available
  await cardTitle.click();
  await expect(
    page.getByRole("heading", { name: "E2E Warm List" }).first(),
  ).toBeVisible({ timeout: 20_000 });

  const badge = page.getByText(/^\d+\s+URLs?$/i).first();
  await expect(badge).toBeVisible({ timeout: 10_000 });
  const badgeText = await badge.innerText();
  const badgeCount = Number(badgeText.match(/(\d+)/)?.[1] ?? "0");
  expect(badgeCount).toBeGreaterThan(0);
  expect(badgeCount).toBe(row!.urlCount);
});
