import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { OnboardingGate } from "@/components/dashboard/onboarding-gate";
import { DashboardSidebarRail } from "@/components/dashboard/sidebar";
import { DashboardTopbar } from "@/components/dashboard/topbar";
import { getCurrentUser } from "@/lib/auth/session";
import { safeNextPath } from "@/lib/auth/paths";
import { getPendingRequestCount } from "@/lib/dashboard/expert";
import { countOpenShopDisputes } from "@/lib/dashboard/warranty";
import { getOnboardingStatus } from "@/lib/dashboard/onboarding";
import { getOwnedShop } from "@/lib/dashboard/owned-shop";
import { getUnreadNotificationCount } from "@/lib/dashboard/notifications";
import { PATHNAME_HEADER } from "@/proxy";

/**
 * Everything under `/dashboard` is per-request and signed-in only. Static
 * rendering would either leak one user's data into another's cache or fail at
 * build time trying to read a session that doesn't exist yet.
 */
export const dynamic = "force-dynamic";

/**
 * The shell, and the single auth gate for the whole dashboard.
 *
 * Gating here rather than in each page is what makes it reliable: a new route
 * added under this group is protected by existing, and there is no per-page
 * check to forget. Individual pages still narrow further where they need to —
 * the expert routes check shop ownership on top of this.
 *
 * Note the `next` round-trip. Someone deep-linked to `/dashboard/bookings`
 * while signed out should land back there after signing in, not on the
 * overview, so the path they asked for is carried through the login form.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    // The path the browser asked for, forwarded by the proxy — a layout cannot
    // read its own URL. Run through `safeNextPath` even though it came from our
    // own proxy: it is still derived from the request line, and this is the one
    // place a hostile value would be handed straight back as a redirect target.
    const requested = (await headers()).get(PATHNAME_HEADER);
    redirect(`/login?next=${encodeURIComponent(safeNextPath(requested))}`);
  }

  // Both are per-request reads the shell needs on every page; running them
  // together keeps the shell at one round-trip rather than two sequential ones.
  const [shop, unreadCount] = await Promise.all([
    getOwnedShop(user.id),
    getUnreadNotificationCount(user.id),
  ]);

  // Pending requests badge the sidebar's Requests item, and the onboarding gate
  // decides whether the mandatory details dialog renders. Both are per-request
  // reads the shell needs anyway, so they run alongside the others.
  const [pendingRequests, openDisputes, onboarding] = await Promise.all([
    shop ? getPendingRequestCount(shop.id) : Promise.resolve(0),
    shop ? countOpenShopDisputes(shop.id) : Promise.resolve(0),
    getOnboardingStatus(),
  ]);

  return (
    <div className="lg:pl-64">
      {/*
        The rail is a sibling of the topbar, not a child of it. `backdrop-blur`
        on the header creates a containing block for `position: fixed`, which
        would trap the rail inside the header's 64px box and leave this `pl-64`
        column empty. See the note on `DashboardSidebarRail`.
      */}
      <DashboardSidebarRail
        hasShop={shop !== null}
        shopName={shop?.shopName ?? null}
        pendingRequests={pendingRequests}
        openDisputes={openDisputes}
      />

      <DashboardTopbar
        user={user}
        shop={shop}
        unreadCount={unreadCount}
        pendingRequests={pendingRequests}
        openDisputes={openDisputes}
      />

      <main id="main" className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {children}
      </main>

      {/*
        Rendered last and only when incomplete. In the layout rather than on the
        overview page so it cannot be sidestepped by deep-linking to
        /dashboard/discover — every dashboard route passes through here.
      */}
      {onboarding.complete ? null : (
        <OnboardingGate
          suggestedFullName={onboarding.suggestedFullName}
          phone={onboarding.phone}
          preferredContact={onboarding.preferredContact}
        />
      )}
    </div>
  );
}
