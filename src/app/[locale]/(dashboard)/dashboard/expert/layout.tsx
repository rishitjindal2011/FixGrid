import { getLocale } from "next-intl/server";

import { redirect } from "@/i18n/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";

/**
 * The ownership gate for everything under /dashboard/expert.
 *
 * `getCurrentUser` is already guaranteed by the parent dashboard layout, but it
 * has to be repeated here because a layout cannot receive props from the layout
 * above it. The parent redirects to /login, so after this line `user` is
 * non-null or we have already left.
 *
 * Someone without a shop is sent to /join. That used to render a "claim your
 * listing" screen in place of `children` — search our directory, find your shop,
 * ask for it — which only worked for businesses we had already seeded. /join
 * covers both cases now: it creates the shop row there and then, so an expert
 * whose shop was never in the directory is no longer stuck at a search box that
 * will never find them.
 *
 * `redirect` is safe here only because /join sits *outside* this layout. The
 * old claim page lived underneath it, which is why that version had to render
 * rather than redirect — it would have looped.
 */
export default async function ExpertDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();

  const user = await getCurrentUser();
  // `return` narrows `user` to non-null for `getMyShop` below; `redirect` throws
  // regardless, so nothing after it runs.
  if (!user) {
    return redirect({ href: { pathname: "/login", query: { next: "/dashboard/expert" } }, locale });
  }

  // `getMyShop` is cached for the request, so the page underneath calls the
  // same read without a second database round-trip.
  const shop = await getMyShop(user.id);
  if (!shop) return redirect({ href: "/join", locale });

  return <>{children}</>;
}
