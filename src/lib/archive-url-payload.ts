/**
 * Client archive/restore strips archivedAt for Zod urlItemSchema.
 * Re-merge prior dates from DB and stamp only the newly archived urlId.
 */

export type ArchivedAtCarrier = {
  id: string;
  archivedAt?: string;
};

export function mergeArchivedAtOnWrite<T extends ArchivedAtCarrier>(args: {
  incoming: ReadonlyArray<T>;
  existing: ReadonlyArray<ArchivedAtCarrier>;
  action?: string;
  urlId?: string;
  nowIso: string;
}): Array<T & { archivedAt?: string }> {
  const priorById = new Map<string, string>();
  for (const row of args.existing) {
    if (typeof row.archivedAt === "string" && row.archivedAt) {
      priorById.set(row.id, row.archivedAt);
    }
  }

  return args.incoming.map((item) => {
    if (args.action === "archive" && args.urlId && item.id === args.urlId) {
      return { ...item, archivedAt: args.nowIso };
    }
    const prior = priorById.get(item.id);
    if (prior) {
      return { ...item, archivedAt: prior };
    }
    return { ...item };
  });
}
