/**
 * One-off: delete broken public browse list(s) with malformed slug
 * (e.g. "/plan" → share URL `/list//plan`, detail `/list/plan` 404).
 *
 * Usage:
 *   npx tsx scripts/delete-orphan-list.ts
 *
 * Requires DATABASE_URL (same as Prisma / app).
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SLUG_CANDIDATES = ["/plan", "plan"] as const;
const TITLE_CANDIDATE = "my plans for tmr";

async function main() {
  const matches = await prisma.list.findMany({
    where: {
      OR: [
        { slug: { in: [...SLUG_CANDIDATES] } },
        {
          title: {
            equals: TITLE_CANDIDATE,
            mode: "insensitive",
          },
        },
      ],
    },
    select: {
      id: true,
      slug: true,
      title: true,
      isPublic: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (matches.length === 0) {
    console.log("No matching orphan lists found. Nothing to delete.");
    return;
  }

  for (const row of matches) {
    console.log("Deleting list:", JSON.stringify(row, null, 2));
    await prisma.list.delete({ where: { id: row.id } });
    console.log(`Deleted id=${row.id} slug=${JSON.stringify(row.slug)}`);
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
