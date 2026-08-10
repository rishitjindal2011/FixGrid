import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { AddUserDialog } from "@/components/admin/add-user-dialog";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatRelative } from "@/lib/format";
import { getSession } from "@/lib/auth/session";
import { Badge } from "@/components/ui/badge";
import { RoleActions } from "./role-actions";

export const metadata: Metadata = {
  title: "Team Management",
  robots: { index: false, follow: false },
};

type AdminUser = {
  id: string;
  email: string;
  role: "viewer" | "editor" | "owner";
  last_login_at: string | null;
  created_at: string;
};

export default async function TeamPage() {
  const session = await getSession();
  const isOwner = session?.role === "owner";

  const supabase = createAdminClient();
  const { data: admins, error } = await supabase
    .from("seo_admins")
    .select("id, email, role, last_login_at, created_at")
    .order("created_at", { ascending: false })
    .returns<AdminUser[]>();

  if (error) {
    console.error("[TeamPage] Failed to fetch admins:", error.message);
  }

  const users = admins ?? [];

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Team Management"
        description="Manage admin panel access and roles for your team."
        actions={isOwner ? <AddUserDialog /> : null}
      />

      {!isOwner ? (
        <div className="rounded-machined border border-sun/30 bg-sun-wash p-4 text-sm text-enamel">
          Only owners can add or manage team members.
        </div>
      ) : null}

      <div className="rounded-machined border border-hairline bg-chalk shadow-bench">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-enamel">
            <thead className="border-b border-hairline bg-bench">
              <tr>
                <th className="px-4 py-3 font-medium text-steel">Email</th>
                <th className="px-4 py-3 font-medium text-steel">Role</th>
                <th className="px-4 py-3 font-medium text-steel">Last Login</th>
                <th className="px-4 py-3 font-medium text-steel text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-hairline">
              {users.map((user) => (
                <tr key={user.id} className="transition-colors hover:bg-bench/50">
                  <td className="px-4 py-3">
                    <span className="font-mono">{user.email}</span>
                  </td>
                  <td className="px-4 py-3">
                    {user.role === "owner" ? (
                      <Badge variant="signal">Owner</Badge>
                    ) : user.role === "editor" ? (
                      <Badge variant="neutral">Editor</Badge>
                    ) : (
                      <Badge variant="neutral" className="text-steel-soft">Viewer</Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 text-steel">
                    {user.last_login_at ? formatRelative(user.last_login_at) : "Never"}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <RoleActions userId={user.id} currentRole={user.role} isCurrentUser={session?.adminId === user.id} isOwner={isOwner} />
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-steel">
                    No team members found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
