import { LogOut } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/auth/actions";
import type { AdminSession } from "@/lib/auth/session";
import { ADMIN_ROLE_LABELS } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/**
 * Signed-in identity and the way out.
 *
 * A Server Component: it renders a plain form posting to a server action, so
 * signing out works with JavaScript disabled and cannot be triggered by a
 * cross-site GET the way a bare link could.
 *
 * The role is displayed, not just held. Every operator sharing this console
 * should be able to see at a glance whether the buttons they are about to look
 * for will be there — a `viewer` who does not know they are a viewer files a
 * bug about a missing approve button.
 */
export function Topbar({ session }: { session: AdminSession }) {
  return (
    <header
      className={cn(
        "sticky top-0 z-10 flex flex-wrap items-center gap-x-4 gap-y-2",
        "border-b border-hairline bg-chalk/95 px-5 py-3 backdrop-blur-none lg:px-8",
      )}
    >
      <div className="min-w-0 flex-1">
        <p className="eyebrow">Fix-It Registry</p>
        <p className="mt-1 truncate font-display text-[1.05rem] uppercase leading-none text-enamel">
          Platform admin
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="hidden min-w-0 flex-col items-end gap-1 sm:flex">
          <span className="max-w-[16rem] truncate text-sm text-enamel" title={session.email}>
            {session.email}
          </span>
          {/*
            `owner` is solid rather than tinted: it is the role that can move
            money, and it should not look like the other two.
          */}
          <Badge
            variant={
              session.role === "owner"
                ? "solid"
                : session.role === "editor"
                  ? "verified"
                  : "neutral"
            }
          >
            {ADMIN_ROLE_LABELS[session.role]}
          </Badge>
        </div>

        <form action={logout}>
          <Button type="submit" variant="outline" size="sm">
            <LogOut aria-hidden />
            <span className="sr-only sm:not-sr-only">Sign out</span>
          </Button>
        </form>
      </div>
    </header>
  );
}
