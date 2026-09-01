import { Receiver } from "@upstash/qstash";
import { timingSafeEqual } from "crypto";
import { getCurrentUser } from "@/lib/auth";
import { resolveAuthorizedList } from "@/lib/list-route-access";

/** REQ-0025: Internal jobs accept only a verified delivery or server-held secret. */
function matchesSecret(candidate: string | null, expected: string | undefined): boolean {
  if (!candidate || !expected) return false;

  const candidateBuffer = Buffer.from(candidate);
  const expectedBuffer = Buffer.from(expected);
  return candidateBuffer.length === expectedBuffer.length && timingSafeEqual(candidateBuffer, expectedBuffer);
}

async function hasVerifiedQStashSignature(request: Request): Promise<boolean> {
  const signature = request.headers.get("upstash-signature");
  const currentSigningKey = process.env.QSTASH_CURRENT_SIGNING_KEY;
  const nextSigningKey = process.env.QSTASH_NEXT_SIGNING_KEY;
  if (!signature || !currentSigningKey || !nextSigningKey) return false;

  try {
    const receiver = new Receiver({ currentSigningKey, nextSigningKey });
    return await receiver.verify({
      signature,
      body: await request.clone().text(),
      url: request.url,
      upstashRegion: request.headers.get("upstash-region") ?? undefined,
    });
  } catch {
    return false;
  }
}

export async function isAuthorizedInternalJob(request: Request): Promise<boolean> {
  if (process.env.NODE_ENV === "development") return true;

  if (matchesSecret(request.headers.get("x-internal-job-secret"), process.env.INTERNAL_JOB_SECRET)) {
    return true;
  }

  return hasVerifiedQStashSignature(request);
}

/** QStash/internal OR authenticated user with list edit access (manual jobs menu). */
export async function isAuthorizedManualListJob(
  request: Request,
  listId: string,
): Promise<boolean> {
  if (await isAuthorizedInternalJob(request)) return true;
  const access = await resolveAuthorizedList(listId, "edit");
  return access.ok;
}

/** QStash/internal OR any authenticated user (global schedule setup). */
export async function isAuthorizedManualScheduleSetup(
  request: Request,
): Promise<boolean> {
  if (await isAuthorizedInternalJob(request)) return true;
  return (await getCurrentUser()) !== null;
}
