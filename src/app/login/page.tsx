import Auth from "@/components/Auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { FORCE_GUEST_COOKIE, WAS_AUTHED_COOKIE } from "@/constants/auth";
import { isWasAuthedCookieValue } from "@/lib/was-authed";
import { isForceGuestCookieValue } from "@/lib/logout-client";
import { safeInternalNextPath } from "@/lib/auth-redirect";

/**
 * /login — chrome-free Auth (root layout skips Navbar/Footer).
 * Authed users (no force-guest) bounce to `next` (invite deep-link) or marketing home.
 */
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const cookieStore = await cookies();
  const forceGuest = isForceGuestCookieValue(
    cookieStore.get(FORCE_GUEST_COOKIE)?.value,
  );
  const initialWasAuthed =
    !forceGuest &&
    (isWasAuthedCookieValue(cookieStore.get(WAS_AUTHED_COOKIE)?.value) ||
      Boolean(cookieStore.get("session_token")?.value));

  const params = await searchParams;
  const nextPath = safeInternalNextPath(params.next) || "/";

  if (initialWasAuthed) {
    redirect(nextPath);
  }

  return <Auth />;
}
