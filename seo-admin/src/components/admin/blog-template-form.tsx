"use client";

import * as React from "react";
import { useActionState } from "react";
import { Save } from "lucide-react";

import { SubmitButton } from "@/components/admin/confirm-submit";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { updateBlogTemplate } from "@/lib/blog-templates/actions";
import { type FormState, INITIAL_FORM_STATE } from "@/lib/redirects/state";
import type { BlogTemplateRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function BlogTemplateForm({ template }: { template: BlogTemplateRow }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateBlogTemplate,
    INITIAL_FORM_STATE,
  );

  return (
    <form action={formAction} className="space-y-8">
      <input type="hidden" name="id" value={template.id} />

      {state.message ? (
        <p
          role="status"
          className={cn(
            "rounded-machined border px-3 py-2.5 text-sm",
            state.status === "error"
              ? "border-rust/30 bg-rust-wash text-rust"
              : "border-verdigris/30 bg-verdigris-wash text-verdigris",
          )}
        >
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <div>
            <label htmlFor="name" className="eyebrow mb-2 block">
              Template name
            </label>
            <Input
              id="name"
              name="name"
              defaultValue={template.name}
              required
              aria-invalid={Boolean(state.errors?.name)}
            />
            {state.errors?.name ? (
              <p className="mt-1.5 text-xs text-rust">{state.errors.name}</p>
            ) : null}
          </div>

          <div className="flex-1">
            <label htmlFor="html_template" className="eyebrow mb-2 block">
              HTML Template
            </label>
            <Textarea
              id="html_template"
              name="html_template"
              defaultValue={template.html_template}
              required
              className="min-h-[500px] font-mono text-sm leading-relaxed"
              aria-invalid={Boolean(state.errors?.html_template)}
            />
            <p className="mt-1.5 text-xs text-steel-soft">
              Use {"{{title}}"}, {"{{date}}"}, and {"{{content}}"} as placeholders for the blog post content.
            </p>
            {state.errors?.html_template ? (
              <p className="mt-1.5 text-xs text-rust">{state.errors.html_template}</p>
            ) : null}
          </div>
        </div>
      </div>

      <div className="border-t border-hairline pt-6">
        <SubmitButton>
          <Save aria-hidden />
          Save template
        </SubmitButton>
      </div>
    </form>
  );
}
