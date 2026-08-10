import type { Metadata } from "next";
import Link from "next/link";
import { FileText, LayoutTemplate } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth/session";
import { getBlogTemplates } from "@/lib/queries/blog-templates";
import { formatDate } from "@/lib/utils";

export const metadata: Metadata = { title: "Blog Templates" };
export const dynamic = "force-dynamic";

export default async function BlogTemplatesPage() {
  const [templates, session] = await Promise.all([getBlogTemplates(), getSession()]);

  const canEdit = session?.role === "editor" || session?.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="Blog Templates"
        description="HTML layouts that wrap your blog posts."
        actions={
          canEdit ? (
            <form action="/blog-templates/new" method="GET">
              <Button type="submit">
                <FileText aria-hidden />
                New template
              </Button>
            </form>
          ) : null
        }
      />

      {templates.length === 0 ? (
        <div className="rounded-machined border border-dashed border-hairline bg-chalk px-6 py-12 text-center">
          <LayoutTemplate className="mx-auto size-8 text-steel-soft" aria-hidden />
          <p className="mt-3 text-sm text-steel">No blog templates exist yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardHeader>
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <p className="font-mono text-xs text-steel-soft">{template.id}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-steel">
                  Created {formatDate(template.created_at)}
                </p>

                <Button asChild variant="outline" className="mt-4 w-full">
                  <Link href={`/blog-templates/${template.id}`}>
                    <FileText aria-hidden />
                    View details
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </>
  );
}
