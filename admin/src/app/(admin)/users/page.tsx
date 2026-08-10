import Link from "next/link";
import type { Metadata } from "next";
import { Users } from "lucide-react";

import { DataTable, type DataColumn } from "@/components/admin/data-table";
import { EmptyState } from "@/components/admin/empty-state";
import { PageHeader } from "@/components/admin/page-header";
import { RoleSelect } from "@/components/admin/role-select";
import { StatTile } from "@/components/admin/stat-tile";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { requireSession } from "@/lib/auth/session";
import { listUsers, type PlatformRole, type PlatformUser } from "@/lib/queries/users";
import { formatDay } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Users",
  robots: { index: false, follow: false },
};

const ROLE_TABS: { key: PlatformRole | "all"; label: string }[] = [
  { key: "all", label: "Everyone" },
  { key: "customer", label: "Customers" },
  { key: "fixer", label: "Fixers" },
  { key: "admin", label: "Admins" },
];

function isRole(value: string | undefined): value is PlatformRole | "all" {
  return ROLE_TABS.some((tab) => tab.key === value);
}

/**
 * Every account on the platform.
 *
 * The console had pages for customers, experts and claims but nowhere to answer
 * "who is this person and what can they do" — the three views each showed one
 * facet and none showed the account itself.
 *
 * The role column is editable, and the "Access" column beside it exists because
 * the role alone is misleading: `users.role` is a label, while the expert
 * dashboard is opened by owning a `fixer_profiles` row and this console is
 * opened by having a `seo_admins` row. Showing all three together is what makes
 * a mislabelled account visible rather than confusing.
 */
export default async function UsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const [params, session] = await Promise.all([searchParams, requireSession()]);

  const query = params.q?.trim() || undefined;
  const role = isRole(params.role) ? params.role : "all";

  // Unfiltered too, so the tiles describe the platform rather than the current
  // filter — a "Customers 3" tile that changes when you search is not a total.
  const [users, everyone] = await Promise.all([
    listUsers({ query, role }),
    listUsers(),
  ]);

  const canEditRoles = session.role === "owner";

  const columns: DataColumn<PlatformUser>[] = [
    {
      key: "person",
      header: "Account",
      cell: (row) => (
        <div className="flex flex-col">
          <Link
            href={`/customers/${row.id}`}
            className="font-medium text-enamel hover:text-signal"
          >
            {row.displayName}
          </Link>
          {row.email ? (
            <span className="font-mono text-xs text-steel">{row.email}</span>
          ) : null}
          {row.fullName && row.fullName !== row.displayName ? (
            <span className="text-xs text-steel">{row.fullName}</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "access",
      header: "Access",
      cell: (row) => (
        <div className="flex flex-wrap gap-1">
          {row.isAdmin ? <Badge variant="signal">Admin console</Badge> : null}
          {row.ownsShop ? (
            <Badge variant="verified" title={row.shopNames.join(", ")}>
              {row.shopNames.length === 1
                ? row.shopNames[0]
                : `${row.shopNames.length} shops`}
            </Badge>
          ) : null}
          {!row.isAdmin && !row.ownsShop ? (
            <span className="text-xs text-steel">Customer only</span>
          ) : null}
        </div>
      ),
    },
    {
      key: "bookings",
      header: "Bookings",
      cell: (row) => <span className="font-mono text-sm">{row.bookingCount}</span>,
    },
    {
      key: "joined",
      header: "Joined",
      cell: (row) => (
        <span className="font-mono text-xs text-steel">{formatDay(row.createdAt)}</span>
      ),
    },
    {
      key: "role",
      header: "Role",
      cell: (row) => (
        <RoleSelect userId={row.id} role={row.role} disabled={!canEditRoles} />
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account, what it is labelled as, and what it can actually reach."
      />

      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="Accounts" value={String(everyone.length)} />
        <StatTile
          label="Shop owners"
          value={String(everyone.filter((user) => user.ownsShop).length)}
          hint="Own a fixer_profiles row"
        />
        <StatTile
          label="Admins"
          value={String(everyone.filter((user) => user.isAdmin).length)}
          hint="Can sign in here"
          tone="signal"
        />
        <StatTile
          label="Labelled fixer"
          value={String(everyone.filter((user) => user.role === "fixer").length)}
          hint="users.role — a label, not a grant"
        />
      </div>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <label htmlFor="user-search" className="eyebrow text-steel">
            Search
          </label>
          <Input
            id="user-search"
            name="q"
            defaultValue={query ?? ""}
            placeholder="Name, email or phone"
            className="w-full sm:w-72"
          />
        </div>
        {role !== "all" ? <input type="hidden" name="role" value={role} /> : null}
        <Button type="submit" variant="outline" size="sm">
          Search
        </Button>
      </form>

      <nav aria-label="Filter by role" className="mt-4 flex flex-wrap gap-1">
        {ROLE_TABS.map((tab) => {
          const href =
            tab.key === "all"
              ? `/users${query ? `?q=${encodeURIComponent(query)}` : ""}`
              : `/users?role=${tab.key}${query ? `&q=${encodeURIComponent(query)}` : ""}`;

          return (
            <Link
              key={tab.key}
              href={href}
              aria-current={tab.key === role ? "page" : undefined}
              className={cn(
                "rounded-machined px-3 py-1.5 font-display text-xs uppercase tracking-wide transition-colors",
                tab.key === role
                  ? "bg-enamel text-bench"
                  : "text-steel hover:bg-bench-sunk hover:text-enamel",
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-4">
        <DataTable
          columns={columns}
          rows={users}
          getRowKey={(row) => row.id}
          empty={
            <EmptyState
              icon={Users}
              title={query ? "No account matches that" : "No accounts yet"}
              description={
                query
                  ? "Try a different name, email or phone number."
                  : "Accounts appear here as people sign up on the site."
              }
            />
          }
        />
      </div>

      {!canEditRoles ? (
        <p className="mt-4 text-sm text-steel">
          Changing a role needs owner access. You are signed in as {session.role}.
        </p>
      ) : null}
    </>
  );
}
