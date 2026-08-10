import Link from "next/link";
import { redirect } from "next/navigation";
import { LogOut, Wrench } from "lucide-react";

import { SidebarNav } from "@/components/admin/sidebar-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import { getSession } from "@/lib/auth/session";

/**
 * Signed-in shell.
 *
 * The proxy has already turned anonymous requests away, so reaching here
 * without a session should be impossible. It is still checked, because "should
 * be impossible" is how the admin ends up rendering with `session!` after
 * someone edits the proxy matcher. `getSession()` reads a cookie and
 * verifies a JWT — cheap enough to not need an excuse.
 */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex min-h-dvh flex-col lg:flex-row">
      <aside className="flex shrink-0 flex-col gap-6 border-b border-hairline bg-chalk p-4 lg:sticky lg:top-0 lg:h-dvh lg:w-60 lg:border-b-0 lg:border-r">
        <Link href="/" className="flex items-center gap-2.5 px-1">
          <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-enamel text-bench">
            <Wrench className="size-4" aria-hidden />
          </span>
          <span className="font-display text-lg uppercase leading-none tracking-wide text-enamel">
            SEO Admin
          </span>
        </Link>

        <SidebarNav />

        {/* Pushed to the bottom on desktop; sits inline on mobile. */}
        <div className="mt-auto flex flex-col gap-3 border-t border-hairline pt-4">
          <div className="flex flex-col gap-1.5 px-1">
            <span className="truncate text-sm text-enamel" title={session.email}>
              {session.email}
            </span>
            <Badge variant={session.role === "viewer" ? "neutral" : "verified"} className="self-start">
              {session.role}
            </Badge>
          </div>

          {/*
            A plain form posting to a server action, so signing out works with
            JavaScript disabled and cannot be triggered by a cross-site GET the
            way a bare link could.
          */}
          <form action={logout}>
            <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
              <LogOut aria-hidden />
              Sign out
            </Button>
          </form>
        </div>
      </aside>

      <main className="min-w-0 flex-1 p-5 lg:p-8">{children}</main>
    </div>
  );
}
