"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";

import { SubmitButton } from "@/components/admin/confirm-submit";
import { TextField, TextareaField } from "@/components/admin/field";
import { updateBlogTemplate } from "@/lib/blog-templates/actions";
import { type FormState, IDLE_FORM_STATE } from "@/lib/redirects/state";
import type { BlogTemplateRow } from "@/lib/types/database";
import { cn } from "@/lib/utils";

export function BlogTemplateForm({ template }: { template: BlogTemplateRow }) {
  const [state, formAction] = useActionState<FormState, FormData>(
    updateBlogTemplate,
    IDLE_FORM_STATE,
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

      {/*
        `TextField`/`TextareaField` rather than the bare `ui/input` primitives:
        `ui/input` exports `Input` and `Select` only — there is no `Textarea`
        there, which is what broke this build. The field wrappers are also what
        every other form in this app uses, and they carry the label/hint/error
        wiring that was being hand-rolled here.
      */}
      <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
        <div className="flex flex-col gap-6">
          <TextField
            label="Template name"
            name="name"
            defaultValue={template.name}
            required
            error={state.fieldErrors.name}
          />

          <TextareaField
            label="HTML template"
            name="html_template"
            defaultValue={template.html_template}
            required
            rows={22}
            className="flex-1"
            error={state.fieldErrors.html_template}
            hint={`Use {{title}}, {{date}} and {{content}} as placeholders for the blog post content.`}
          />
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
