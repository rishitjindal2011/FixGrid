import { redirect } from "next/navigation";

import { Sidebar } from "@/components/admin/sidebar";
import { Topbar } from "@/components/admin/topbar";
import { getSession } from "@/lib/auth/session";
import { getPendingClaimCount } from "@/lib/queries/platform";

/**
 * Signed-in shell.
 *
 * The proxy has already turned anonymous requests away, so reaching here
 * without a session should be impossible. It is still checked, because "should
 * be impossible" is how a console ends up rendering with `session!` after
 * someone edits the proxy matcher. `getSession()` reads a cookie and verifies a
 * JWT — cheap enough to not need an excuse, and this app is not one to take the
 * cheap route on.
 *
 * The pending-claim count is fetched here rather than on the claims page, so
 * the badge is correct from whichever screen the operator happens to be on.
 * That means one extra COUNT behind every navigation; it is a `head: true`
 * count that transfers no rows, and a badge that is only right on the page you
 * already navigated to would be pointless.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  const pendingClaims = await getPendingClaimCount();

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <Sidebar pendingClaims={pendingClaims} />

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar session={session} />
        <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
