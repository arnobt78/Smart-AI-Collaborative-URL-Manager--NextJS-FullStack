// C7.26: invite ?next= gate, archive dialog pending, delete densify Network.
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

/** Collect Hydration failed console/pageerrors until the returned disposer runs. */
function attachHydrationListeners(page: import("@playwright/test").Page) {
  const mismatches: string[] = [];
  const onConsole = (msg: import("@playwright/test").ConsoleMessage) => {
    const text = msg.text();
    if (
      /Hydration failed because the server rendered (text|HTML) didn't match/i.test(
        text,
      )
    ) {
      mismatches.push(text);
    }
  };
  const onPageError = (err: Error) => {
    if (
      /Hydration failed because the server rendered (text|HTML) didn't match/i.test(
        err.message,
      )
    ) {
      mismatches.push(err.message);
    }
  };
  page.on("console", onConsole);
  page.on("pageerror", onPageError);
  return {
    mismatches,
    dispose: () => {
      page.off("console", onConsole);
      page.off("pageerror", onPageError);
    },
  };
}

/** Open list and assert zero Hydration failed for that navigation. */
async function openListWithoutHydrationMismatch(
  page: import("@playwright/test").Page,
  slug: string,
) {
  const { mismatches, dispose } = attachHydrationListeners(page);
  try {
    await openList(page, slug);
    expect(
      mismatches,
      `ListPage Hydration failed:\n${mismatches.join("\n\n")}`,
    ).toEqual([]);
  } finally {
    dispose();
  }
}

/** Ensure at least one active URL card exists (prior archive tests may empty the fixture). */
async function ensureActiveUrl(
  page: import("@playwright/test").Page,
  href: string,
) {
  const hasCard = await page
    .getByRole("button", { name: /^archive url$/i })
    .first()
    .isVisible()
    .catch(() => false);
  if (hasCard) return;

  await page.getByRole("button", { name: /add url/i }).click();
  const urlInput = page.getByPlaceholder(/enter a url to add/i);
  await expect(urlInput).toBeVisible({ timeout: 10_000 });
  await urlInput.fill(href);
  await page.getByRole("button", { name: /^add url$/i }).last().click();
  const escaped = href.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  await expect(
    page
      .getByText(new RegExp(escaped, "i"))
      .or(page.getByText(/url added|added to (your )?list/i))
      .or(page.getByRole("button", { name: /^archive url$/i }))
      .first(),
  ).toBeVisible({ timeout: 45_000 });
}

test("guest list deep-link lands on login?next= without home flash", async ({
  browser,
}) => {
  const { slug } = await fixture();
  const context = await browser.newContext({ storageState: undefined });
  const page = await context.newPage();

  const navigations: string[] = [];
  page.on("framenavigated", (frame) => {
    if (frame === page.mainFrame()) {
      navigations.push(frame.url());
    }
  });

  await page.goto(`/list/${slug}`);
  await page.waitForURL(/\/login/, { timeout: 20_000 });

  const finalUrl = page.url();
  expect(finalUrl, `login URL should carry next=list:\n${finalUrl}`).toMatch(
    /\/login\?next=/,
  );
  expect(decodeURIComponent(finalUrl)).toContain(`/list/${slug}`);

  // No marketing home hop in the redirect chain (C7.26 requirePageUser)
  const sawBareHome = navigations.some((u) => {
    try {
      const path = new URL(u).pathname.replace(/\/+$/, "") || "/";
      return path === "/";
    } catch {
      return false;
    }
  });
  expect(
    sawBareHome,
    `unexpected home flash in nav chain:\n${navigations.join("\n")}`,
  ).toBe(false);

  await expect(page.getByRole("button", { name: /sign in/i }).first()).toBeVisible({
    timeout: 10_000,
  });

  // x-search: RSC bounce retains query on next=
  navigations.length = 0;
  await page.goto(`/list/${slug}?tab=1`);
  await page.waitForURL(/\/login/, { timeout: 20_000 });
  const withQuery = page.url();
  expect(decodeURIComponent(withQuery)).toContain(`/list/${slug}?tab=1`);

  await context.close();
});

test("archive dialog stays open with Archiving… until toast", async ({
  page,
}) => {
  const { slug } = await fixture();
  await openListWithoutHydrationMismatch(page, slug);
  await ensureActiveUrl(page, `https://c726-archive-${Date.now()}.example.test`);

  const archiveBtn = page.getByRole("button", { name: /^archive url$/i }).first();
  await expect(archiveBtn).toBeVisible({ timeout: 15_000 });
  await archiveBtn.click();

  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  const confirm = dialog.getByRole("button", { name: /^archive$/i });
  await confirm.click();

  // Pending label should appear while request is in flight (dialog still open)
  await expect(
    dialog.getByRole("button", { name: /archiving/i }),
  ).toBeVisible({ timeout: 5_000 });

  await expect(page.getByText(/url archived/i).first()).toBeVisible({
    timeout: 25_000,
  });
  await expect(dialog).toBeHidden({ timeout: 10_000 });
});

test("delete success keeps updates?activityLimit spam ≤1", async ({ page }) => {
  const { slug } = await fixture();
  await openList(page, slug);
  await ensureActiveUrl(page, `https://c726-delete-${Date.now()}.example.test`);

  const updates: string[] = [];
  page.on("request", (req) => {
    if (req.url().includes("/updates?activityLimit=")) {
      updates.push(`${req.method()} ${req.url()}`);
    }
  });

  const deleteBtn = page.getByRole("button", { name: /^delete url$/i }).first();
  await expect(deleteBtn).toBeVisible({ timeout: 15_000 });

  const before = updates.length;
  await deleteBtn.click();

  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible({ timeout: 10_000 });
  await dialog.getByRole("button", { name: /^delete$/i }).click();

  await expect(page.getByText(/url deleted/i).first()).toBeVisible({
    timeout: 25_000,
  });
  await page.waitForTimeout(4000);

  const afterHits = updates.slice(before);
  console.log("[c726 densify] delete updates hits:", afterHits.length, afterHits);
  expect(
    afterHits.length,
    `unexpected updates after delete:\n${afterHits.join("\n")}`,
  ).toBeLessThanOrEqual(1);
});

test("comments meta shows Edited with xs icons when edited", async ({
  page,
}) => {
  const { slug } = await fixture();
  await openList(page, slug);
  await ensureActiveUrl(page, `https://c726-comment-${Date.now()}.example.test`);

  await page.getByRole("button", { name: /^comments$/i }).first().click();
  const dialog = page.getByRole("dialog").or(page.getByRole("alertdialog"));
  await expect(dialog).toBeVisible({ timeout: 10_000 });

  const body = `c726-edit-${Date.now()}`;
  await dialog.getByPlaceholder(/add a comment/i).fill(body);
  await dialog.getByRole("button", { name: /post comment/i }).click();
  // Posted body lives in the comment card (textarea may still briefly hold the draft)
  await expect(
    dialog.locator("div.whitespace-pre-wrap").filter({ hasText: body }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByPlaceholder(/add a comment/i)).toHaveValue("", {
    timeout: 10_000,
  });

  await dialog.getByRole("button", { name: /^edit comment$/i }).first().click();
  const edited = `${body}-edited`;
  await dialog.locator("textarea").last().fill(edited);
  await dialog.getByRole("button", { name: /^save$/i }).last().click();
  await expect(
    dialog.locator("div.whitespace-pre-wrap").filter({ hasText: edited }),
  ).toBeVisible({ timeout: 20_000 });
  await expect(dialog.getByText(/^Edited /i).first()).toBeVisible({
    timeout: 10_000,
  });
});

test("cold list open keeps URL badge stable (no ListPage hydration mismatch)", async ({
  page,
}) => {
  const { slug } = await fixture();
  const { mismatches, dispose } = attachHydrationListeners(page);
  try {
    await openList(page, slug);

    const urlBadge = page.getByText(/\d+\s+URLs?/i).first();
    await expect(urlBadge).toBeVisible({ timeout: 10_000 });
    const first = (await urlBadge.textContent())?.trim();
    await expect
      .poll(async () => (await urlBadge.textContent())?.trim())
      .toBe(first);

    // Owner visibility Switch enabled after session dehydrate
    const switchInput = page
      .locator(".flex.items-center.gap-1 input[type='checkbox']")
      .first();
    await expect(switchInput).toBeEnabled({ timeout: 10_000 });

    expect(
      mismatches,
      `ListPage Hydration failed:\n${mismatches.join("\n\n")}`,
    ).toEqual([]);
  } finally {
    dispose();
  }
});
