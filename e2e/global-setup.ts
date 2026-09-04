// Seed ephemeral e2e owner. Prefer isolated E2E_DATABASE_URL;
// E2E_ALLOW_SHARED_DB=1 permits DATABASE_URL for demo/showcase only.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  const allowSharedDb = process.env.E2E_ALLOW_SHARED_DB === "1";
  const databaseUrl =
    process.env.E2E_DATABASE_URL ||
    (allowSharedDb ? process.env.DATABASE_URL : undefined);
  if (!databaseUrl) {
    throw new Error(
      "E2E_DATABASE_URL is required (or DATABASE_URL with E2E_ALLOW_SHARED_DB=1).",
    );
  }
  if (!allowSharedDb && databaseUrl === process.env.DATABASE_URL) {
    throw new Error(
      "Refusing to seed DATABASE_URL; set E2E_ALLOW_SHARED_DB=1 for demo DB only.",
    );
  }

  const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
  const runId = randomUUID();
  const email = `e2e-owner-${runId}@example.test`;
  const user = await prisma.user.create({ data: { email, password: "e2e-only-password" } });
  const list = await prisma.list.create({
    data: {
      userId: user.id,
      title: "E2E Warm List",
      slug: `e2e-warm-${runId}`,
      isPublic: false,
      urls: [
        {
          id: `e2e-url-a-${runId}`,
          url: "https://example-a.test",
          title: "E2E URL A",
          createdAt: new Date().toISOString(),
          isFavorite: false,
        },
        {
          id: `e2e-url-b-${runId}`,
          url: "https://example-b.test",
          title: "E2E URL B",
          createdAt: new Date().toISOString(),
          isFavorite: false,
        },
      ],
    },
  });
  const token = randomUUID();
  await prisma.session.create({
    data: {
      userId: user.id,
      token: createHash("sha256").update(token).digest("hex"),
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  });

  await mkdir("e2e/.auth", { recursive: true });
  const baseURL = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3100");
  await writeFile(
    "e2e/.auth/owner.json",
    JSON.stringify({
      cookies: [
        {
          name: "session_token",
          value: token,
          domain: baseURL.hostname,
          path: "/",
          expires: Math.floor(Date.now() / 1000) + 3600,
          httpOnly: true,
          secure: baseURL.protocol === "https:",
          sameSite: "Lax",
        },
      ],
      origins: [],
    }),
  );
  await writeFile(
    "e2e/.auth/fixture.json",
    JSON.stringify({ userId: user.id, listId: list.id, slug: list.slug }),
  );

  return async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  };
}
