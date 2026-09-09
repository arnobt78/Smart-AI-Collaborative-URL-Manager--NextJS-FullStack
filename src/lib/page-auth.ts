import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { loginHrefWithNext } from "@/lib/auth-redirect";

/** REQ-0028: Protected RSC routes never paint an authenticated shell after cookie revocation. */
export async function requirePageUser(): Promise<void> {
  const user = await getCurrentUser();
  if (user) return;

  const headerStore = await headers();
  const pathname = headerStore.get("x-pathname") || "/";
  const search = headerStore.get("x-search") || "";
  // pathname + search; safeInternalNextPath sanitizes before login?next=
  redirect(loginHrefWithNext(`${pathname}${search}`));
}
