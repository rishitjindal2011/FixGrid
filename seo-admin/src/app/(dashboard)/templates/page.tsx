import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LayoutTemplate } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { listTemplates } from "@/lib/queries/pages";
import { parseContentSections } from "@/lib/cms/blocks";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Templates" };
export const dynamic = "force-dynamic";

/**
 * Templates are read-only in the admin, and that is a decision rather than an
 * omission.
 *
 * A template is a starting set of blocks, copied into a page at creation time.
 * Editing one cannot retroactively change pages already made from it, so an
 * edit screen here would strongly imply a propagation that does not happen.
 * Templates are seeded from SQL, which is version-controlled and reviewable;
 * this screen shows what is available and what each one contains.
 *
 * "Use this template" is the one action, and it is the whole point of the
 * table: it hands the blocks to `/pages/new`, which copies them into the editor
 * once. Without it a template row is decorative — it would populate a dropdown
 * and nothing else.
 */
export default async function TemplatesPage() {
  const [templates, session] = await Promise.all([listTemplates(), getSession()]);

  // Viewers cannot create pages; `/pages/new` calls `requireEditor()` and would
  // bounce them. Hiding the button fails at the point of intent instead.
  const canCreate = session?.role === "editor" || session?.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Templates"
        description="Starting block sets for new pages. Seeded from the repository, not edited here."
        actions={
          <Button asChild>
            <Link href="/pages/new">
              <FileText aria-hidden />
              New page
            </Link>
          </Button>
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-machined border border-dashed border-hairline bg-chalk px-6 py-12 text-center">
          <LayoutTemplate className="mx-auto size-8 text-steel-soft" aria-hidden />
          <p className="mt-3 text-sm text-steel">No templates seeded yet.</p>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-steel-soft">
            Run <code className="font-mono text-enamel">supabase/template-guide.sql</code>{" "}
            against your database, or{" "}
            <code className="font-mono text-enamel">npm run seed:seo</code> in the
            consumer app to generate one per category.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => {
            // Parsed rather than counted raw: the count should reflect blocks
            // that will actually render, which is what the parser decides.
            const blocks = parseContentSections(template.sections);
            const types = [...new Set(blocks.map((block) => block.type))];

            return (
              <Card key={template.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{template.name}</CardTitle>
                  <p className="font-mono text-xs text-steel-soft">{template.slug}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-steel">
                    {blocks.length} block{blocks.length === 1 ? "" : "s"} · added{" "}
                    {formatDate(template.created_at)}
                  </p>

                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {types.map((type) => (
                      <li
                        key={type}
                        className="rounded-machined border border-hairline bg-bench px-2 py-0.5 font-mono text-[0.7rem] uppercase tracking-wide text-steel"
                      >
                        {type.replace(/_/g, " ")}
                      </li>
                    ))}
                  </ul>

                  {canCreate ? (
                    <Button asChild variant="outline" className="mt-4 w-full">
                      <Link href={`/pages/new?template=${template.id}`}>
                        <FileText aria-hidden />
                        Use this template
                      </Link>
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
