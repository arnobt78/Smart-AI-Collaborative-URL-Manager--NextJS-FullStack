import HomePage from "@/components/HomePage";
import { cookies } from "next/headers";
import { WAS_AUTHED_COOKIE } from "@/constants/auth";
import { isWasAuthedCookieValue } from "@/lib/was-authed";

/**
 * Home — pass SSR wasAuthed cookie (or session_token) so returning users paint
 * Marketing first (no Auth flash on hard refresh).
 */
export default async function Home() {
  const cookieStore = await cookies();
  const initialWasAuthed =
    isWasAuthedCookieValue(cookieStore.get(WAS_AUTHED_COOKIE)?.value) ||
    Boolean(cookieStore.get("session_token")?.value);
  return <HomePage initialWasAuthed={initialWasAuthed} />;
}
