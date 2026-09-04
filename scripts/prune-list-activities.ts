/**
 * One-off / ops: prune list activities to ACTIVITY_FEED_LIMIT (FIFO keep newest).
 *
 * Usage:
 *   npx tsx scripts/prune-list-activities.ts
 *   npx tsx scripts/prune-list-activities.ts --listId=<cuid>
 *
 * Requires DATABASE_URL (same as Prisma / app).
 */

import { PrismaClient } from "@prisma/client";
import { ACTIVITY_FEED_LIMIT } from "../src/lib/activity-feed-limit";

const prisma = new PrismaClient();

function parseListIdArg(): string | undefined {
  const raw = process.argv.find((arg) => arg.startsWith("--listId="));
  if (!raw) return undefined;
  const value = raw.slice("--listId=".length).trim();
  return value || undefined;
}

async function pruneList(listId: string): Promise<number> {
  const keep = await prisma.activity.findMany({
    where: { listId },
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_FEED_LIMIT,
    select: { id: true },
  });
  const keepIds = keep.map((row) => row.id);
  const result = await prisma.activity.deleteMany({
    where: {
      listId,
      ...(keepIds.length > 0 ? { id: { notIn: keepIds } } : {}),
    },
  });
  return result.count;
}

async function main() {
  const onlyListId = parseListIdArg();

  if (onlyListId) {
    const deleted = await pruneList(onlyListId);
    console.log(
      `Pruned listId=${onlyListId}: deleted ${deleted} (keep ≤${ACTIVITY_FEED_LIMIT})`,
    );
    return;
  }

  const lists = await prisma.list.findMany({ select: { id: true, slug: true } });
  let totalDeleted = 0;
  for (const list of lists) {
    const deleted = await pruneList(list.id);
    if (deleted > 0) {
      console.log(
        `listId=${list.id} slug=${JSON.stringify(list.slug)} deleted=${deleted}`,
      );
      totalDeleted += deleted;
    }
  }
  console.log(
    `Done. Lists scanned=${lists.length}, activities deleted=${totalDeleted}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
