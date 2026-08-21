import ApiStatusPage from "@/components/pages/ApiStatusPage";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

/**
 * C7.4: Auth-only RSC — do not await status probe (blocked soft-nav ~1.5–3s).
 * Client useApiStatusQuery fills live values; chrome paints immediately.
 */
export default async function ApiStatus() {
  await requirePageUser();
  return <ApiStatusPage />;
}
