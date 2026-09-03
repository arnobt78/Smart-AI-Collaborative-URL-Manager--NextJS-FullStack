// REQ-0053: isolated owner/session fixture for history and realtime browser checks.
import { createHash, randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { PrismaClient } from "@prisma/client";

export default async function globalSetup() {
  const databaseUrl = process.env.E2E_DATABASE_URL;
  if (!databaseUrl) throw new Error("E2E_DATABASE_URL is required.");
  if (databaseUrl === process.env.DATABASE_URL) {
    throw new Error("Refusing to seed the active DATABASE_URL; provide a dedicated E2E_DATABASE_URL.");
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
      urls: [{ id: `e2e-url-${runId}`, url: "https://example.test", title: "E2E URL", createdAt: new Date().toISOString(), isFavorite: false }],
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
  const baseURL = new URL(process.env.PLAYWRIGHT_BASE_URL || "http://127.0.0.1:3100");
  await writeFile("e2e/.auth/owner.json", JSON.stringify({
    cookies: [{ name: "session_token", value: token, domain: baseURL.hostname, path: "/", expires: Math.floor(Date.now() / 1000) + 3600, httpOnly: true, secure: baseURL.protocol === "https:", sameSite: "Lax" }],
    origins: [],
  }));
  await writeFile("e2e/.auth/fixture.json", JSON.stringify({ userId: user.id, listId: list.id, slug: list.slug }));

  return async () => {
    await prisma.user.delete({ where: { id: user.id } }).catch(() => undefined);
    await prisma.$disconnect();
  };
}
