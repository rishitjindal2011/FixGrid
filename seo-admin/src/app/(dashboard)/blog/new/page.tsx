import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createBlogPost } from "@/lib/blog/actions";
import { getSession } from "@/lib/auth/session";

export const metadata: Metadata = { title: "New Blog Post" };
export const dynamic = "force-dynamic";

export default async function NewBlogPost() {
  const session = await getSession();
  const canEdit = session?.role === "editor" || session?.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow="Content"
        title="New Blog Post"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/blog">
              <ArrowLeft aria-hidden />
              Back
            </Link>
          </Button>
        }
      />

      {!canEdit ? (
        <p className="rounded-machined border border-hairline bg-chalk px-4 py-6 text-sm text-steel">
          Your account has view-only access. Ask an owner for the editor role to create posts.
        </p>
      ) : (
        <Card className="max-w-xl">
          <CardContent className="pt-6">
            <form action={createBlogPost} className="flex flex-col gap-5">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="title" className="eyebrow">
                  Title
                </label>
                <Input
                  id="title"
                  name="title"
                  required
                  placeholder="e.g. 5 Common Plumbing Fixes"
                  autoFocus
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="slug" className="eyebrow">
                  Slug
                </label>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm text-steel-soft">/blog/</span>
                  <Input
                    id="slug"
                    name="slug"
                    required
                    placeholder="e.g. 5-common-plumbing-fixes"
                    pattern="^[a-z0-9-]+$"
                    title="Only lowercase letters, numbers, and hyphens"
                  />
                </div>
              </div>

              <div className="mt-2 flex justify-end">
                <Button type="submit">Create draft</Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </>
  );
}
