import HomePage from "@/components/HomePage";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FORCE_GUEST_COOKIE, WAS_AUTHED_COOKIE } from "@/constants/auth";
import { isWasAuthedCookieValue } from "@/lib/was-authed";
import { isForceGuestCookieValue } from "@/lib/logout-client";

/**
 * Home — marketing for returning/authed users.
 * Guests and force-guest → /login (chrome-free Auth, one document scrollbar).
 */
export default async function Home() {
  const cookieStore = await cookies();
  const forceGuest = isForceGuestCookieValue(
    cookieStore.get(FORCE_GUEST_COOKIE)?.value,
  );
  const hasWasAuthed = isWasAuthedCookieValue(
    cookieStore.get(WAS_AUTHED_COOKIE)?.value,
  );
  const hasSessionToken = Boolean(cookieStore.get("session_token")?.value);
  const initialWasAuthed = forceGuest
    ? false
    : hasWasAuthed || hasSessionToken;

  if (!initialWasAuthed) {
    redirect("/login");
  }

  return <HomePage initialWasAuthed={initialWasAuthed} />;
}
