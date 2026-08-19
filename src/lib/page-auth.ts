import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

/** REQ-0028: Protected RSC routes never paint an authenticated shell after cookie revocation. */
export async function requirePageUser(): Promise<void> {
  const user = await getCurrentUser();
  if (!user) redirect("/");
}
