import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { SubmitButton } from "@/components/admin/confirm-submit";
import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createBlogTemplate } from "@/lib/blog-templates/actions";

export const metadata: Metadata = { title: "New Blog Template" };

export default function NewBlogTemplate() {
  return (
    <>
      <PageHeader
        title="New Blog Template"
        description="Create a new HTML layout to wrap blog posts."
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/blog-templates">
              <ArrowLeft aria-hidden />
              Cancel
            </Link>
          </Button>
        }
      />

      <div className="max-w-2xl">
        <form action={createBlogTemplate} className="space-y-6">
          <div>
            <label htmlFor="name" className="eyebrow mb-2 block">
              Template name
            </label>
            <Input
              id="name"
              name="name"
              required
              autoFocus
              placeholder="e.g. Minimalist layout"
              maxLength={120}
            />
            <p className="mt-1.5 text-xs text-steel-soft">
              Internal name, only visible in the admin.
            </p>
          </div>

          <SubmitButton>Create Template</SubmitButton>
        </form>
      </div>
    </>
  );
}
