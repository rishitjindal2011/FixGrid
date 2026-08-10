import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageForm } from "@/components/admin/page-form";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { requireEditor } from "@/lib/auth/session";
import { getTemplate, listTemplates } from "@/lib/queries/pages";

export const metadata: Metadata = { title: "New page" };

/**
 * `requireEditor()` here as well as in the create action.
 *
 * The action is the security boundary — this call is about not showing a viewer
 * a form they cannot submit. Failing at the point of intent beats failing after
 * ten minutes of typing.
 */
export default async function NewPage({
  searchParams,
}: {
  searchParams: Promise<{ template?: string }>;
}) {
  await requireEditor();

  const { template: templateId } = await searchParams;

  const [templates, fromTemplate] = await Promise.all([
    listTemplates(),
    // A missing or deleted id resolves to null and the form opens blank rather
    // than erroring — the query string is a convenience, not a contract.
    templateId ? getTemplate(templateId) : Promise.resolve(null),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="New page"
        description={
          fromTemplate
            ? `Starting from “${fromTemplate.name}”. The blocks are yours to edit — later changes to the template will not reach this page.`
            : "Created as a draft unless you set the status. Nothing is public until it is published."
        }
        actions={
          <Button asChild variant="outline">
            <Link href="/pages">
              <ArrowLeft aria-hidden />
              Back
            </Link>
          </Button>
        }
      />

      <PageForm page={null} templates={templates} fromTemplate={fromTemplate} />
    </>
  );
}
