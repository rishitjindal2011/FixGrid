import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Bell, Search, Settings, Store, UserRound } from "lucide-react";

import { DashboardSidebarSheet } from "@/components/dashboard/sidebar";
import { RoleToggle } from "@/components/dashboard/role-toggle";
import { SignOutMenuItem } from "@/components/dashboard/sign-out-menu-item";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { CurrentUser } from "@/lib/auth/session";
import type { OwnedShop } from "@/lib/dashboard/owned-shop";

/**
 * Sticky topbar: the mobile menu trigger, a search shortcut, notifications and
 * the account menu.
 *
 * A Server Component — everything interactive is a client leaf beneath it, so
 * the session read stays on the server and the bell's unread count arrives with
 * the HTML rather than after a round-trip.
 */
export async function DashboardTopbar({
  user,
  shop,
  unreadCount,
  pendingRequests = 0,
  openDisputes = 0,
}: {
  user: CurrentUser;
  shop: OwnedShop | null;
  unreadCount: number;
  /**
   * Booking requests awaiting this owner's reply, badged on the sidebar's
   * Requests item. Optional so the dashboard layout compiles unchanged; the
   * layout should read it alongside `getOwnedShop` and pass it down.
   */
  pendingRequests?: number;
  openDisputes?: number;
}) {
  const t = await getTranslations("dashboard.topbar");

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-2 border-b border-hairline bg-bench/85 px-4 backdrop-blur-sm">
      {/* Only the mobile trigger lives here. The desktop rail is rendered by the
          layout — this header's `backdrop-blur-sm` would otherwise become the
          containing block for its `fixed` positioning. See `DashboardSidebarRail`. */}
      <DashboardSidebarSheet
        hasShop={shop !== null}
        shopName={shop?.shopName ?? null}
        pendingRequests={pendingRequests}
        openDisputes={openDisputes}
      />

      {/* Left of the search shortcut and before the account menu: which side of
          the product you are on is context for everything else in the bar, so
          it reads first. Renders nothing for users without a shop. */}
      <RoleToggle hasShop={shop !== null} />

      <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
        <Link href="/dashboard/discover">
          <Search aria-hidden />
          {t("findExpert")}
        </Link>
      </Button>

      <div className="ml-auto flex items-center gap-1 sm:gap-2">
        <Button asChild variant="ghost" size="icon" className="relative">
          <Link href="/dashboard/notifications">
            <Bell aria-hidden />
            {unreadCount > 0 ? (
              <>
                {/*
                 * Count sits on the icon rather than beside it so the control
                 * stays a single 40px target. Capped at 9+ because a
                 * three-digit badge overflows the corner it hangs off.
                 */}
                <span
                  aria-hidden
                  className="absolute -right-0.5 -top-0.5 grid min-w-4 place-items-center rounded-machined bg-signal px-1 font-mono text-[0.625rem] leading-4 text-chalk"
                >
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
                <span className="sr-only">
                  {t("notificationsUnread", { count: unreadCount })}
                </span>
              </>
            ) : (
              <span className="sr-only">{t("notifications")}</span>
            )}
          </Link>
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-2 rounded-machined px-1.5 py-1 transition-colors hover:bg-chalk focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-enamel"
            >
              <UserAvatar src={user.avatarUrl} name={user.displayName} size="sm" />
              <span className="hidden max-w-[14ch] truncate font-display text-sm uppercase tracking-wide text-enamel md:inline">
                {user.displayName}
              </span>
              <span className="sr-only">{t("openAccountMenu")}</span>
            </button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <span className="block truncate text-enamel">{user.displayName}</span>
              {user.email ? (
                <span className="block truncate font-mono text-xs font-normal normal-case tracking-normal text-steel">
                  {user.email}
                </span>
              ) : null}
            </DropdownMenuLabel>

            <DropdownMenuSeparator />

            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/profile">
                <UserRound aria-hidden className="size-4" />
                {t("yourProfile")}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/notifications">
                <Settings aria-hidden className="size-4" />
                {t("settings")}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Link href={shop ? "/dashboard/expert" : "/join"}>
                <Store aria-hidden className="size-4" />
                {shop ? t("expertDashboard") : t("listShop")}
              </Link>
            </DropdownMenuItem>

            <DropdownMenuSeparator />

            {/*
             * Not a `<form action={signOut}>` inside the menu: Radix unmounts
             * this subtree on select, which kills the submit before it fires.
             * See the note in `SignOutMenuItem`.
             */}
            <SignOutMenuItem />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
