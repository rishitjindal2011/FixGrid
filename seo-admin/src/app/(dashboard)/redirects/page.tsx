import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { RedirectsTable } from "@/components/admin/redirects-table";
import { getSession } from "@/lib/auth/session";
import { listRedirects } from "@/lib/queries/pages";

export const metadata: Metadata = { title: "Redirects" };
export const dynamic = "force-dynamic";

export default async function RedirectsPage() {
  const [rows, session] = await Promise.all([listRedirects(), getSession()]);

  const canEdit = session?.role === "editor" || session?.role === "owner";
  const permanent = rows.filter((row) => row.status_code === 301).length;

  return (
    <>
      <PageHeader
        eyebrow="Technical SEO"
        title="Redirects"
        description="Rules applied by the site before a page renders. Changes reach the live site within a minute."
      />

      {canEdit ? (
        <p className="mb-6 max-w-prose text-sm leading-relaxed text-steel">
          A 301 is permanent and browsers cache it hard — someone who has already
          followed one may keep being redirected even after the rule changes.
          Reach for 302 while you are still deciding.
          {permanent > 0 ? (
            <>
              {" "}
              <span className="text-steel-soft">
                {permanent} of {rows.length} current rules are permanent.
              </span>
            </>
          ) : null}
        </p>
      ) : (
        <p className="mb-6 max-w-prose text-sm leading-relaxed text-steel">
          Your account has view-only access. The rules below are shown for
          reference; ask an owner for the editor role to change them.
        </p>
      )}

      <RedirectsTable
        rows={rows}
        canEdit={canEdit}
        canDelete={session?.role === "owner"}
      />
    </>
  );
}
