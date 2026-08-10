"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, Check } from "lucide-react";

import { TextField, TextareaField } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatKeywords } from "@/lib/cms/keywords";
import { IDLE_FORM_STATE } from "@/lib/redirects/state";
import { updateGlobalSettings } from "@/lib/settings/actions";
import type { SeoGlobalRow } from "@/lib/types/database";

export function SettingsForm({ settings }: { settings: SeoGlobalRow | null }) {
  const [state, formAction] = useActionState(updateGlobalSettings, IDLE_FORM_STATE);
  const error = (field: string) => state.fieldErrors[field];

  return (
    <form action={formAction} className="flex max-w-2xl flex-col gap-6">
      {state.status !== "idle" && state.message ? (
        <p
          role="status"
          aria-live="polite"
          className={
            state.status === "error"
              ? "flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
              : "flex items-start gap-2 rounded-machined border border-verdigris/30 bg-verdigris-wash px-3 py-2.5 text-sm text-verdigris"
          }
        >
          {state.status === "error" ? (
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          ) : (
            <Check className="mt-0.5 size-4 shrink-0" aria-hidden />
          )}
          {state.message}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Identity</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <TextField
            label="Site title"
            name="site_title"
            required
            maxLength={120}
            defaultValue={settings?.site_title ?? "FixGrid"}
            error={error("site_title")}
            hint="Appended to page titles and used as the Open Graph site name."
          />

          <TextField
            label="Canonical domain"
            name="canonical_domain"
            required
            defaultValue={settings?.canonical_domain ?? ""}
            error={error("canonical_domain")}
            placeholder="https://vytron.me"
            hint="Origin only, no trailing slash. Every canonical tag and sitemap URL is built from this."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Defaults</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-steel">
            Used only where a page leaves the field empty. A page that sets its
            own meta title is never affected by a change here.
          </p>

          <TextField
            label="Default meta title"
            name="default_meta_title"
            required
            maxLength={200}
            defaultValue={settings?.default_meta_title ?? ""}
            error={error("default_meta_title")}
          />

          <TextareaField
            label="Default meta description"
            name="default_meta_description"
            required
            rows={3}
            maxLength={400}
            defaultValue={settings?.default_meta_description ?? ""}
            error={error("default_meta_description")}
          />

          <TextField
            label="Default keywords"
            name="default_keywords"
            defaultValue={formatKeywords(settings?.default_keywords)}
            hint="Comma separated. Kept for internal reporting only."
          />

          <TextField
            label="Default OG image"
            name="default_og_image_url"
            defaultValue={settings?.default_og_image_url ?? ""}
            error={error("default_og_image_url")}
            placeholder="https://…/og-default.png"
            hint="1200×630. Shown when a page has no image of its own."
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Global JSON-LD Schemas</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm leading-relaxed text-steel">
            These JSON-LD schemas will be applied globally across the platform. Use `{"{{placeholder}}"}` syntax if template variables are supported.
          </p>

          <TextareaField
            label="Expert Profile Schema"
            name="global_expert_schema"
            rows={6}
            defaultValue={settings?.global_expert_schema ? JSON.stringify(settings.global_expert_schema, null, 2) : ""}
            error={error("global_expert_schema")}
            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness"\n}`}
            className="font-mono text-xs"
          />

          <TextareaField
            label="Organization Schema"
            name="global_organization_schema"
            rows={6}
            defaultValue={settings?.global_organization_schema ? JSON.stringify(settings.global_organization_schema, null, 2) : ""}
            error={error("global_organization_schema")}
            placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "Organization"\n}`}
            className="font-mono text-xs"
          />
        </CardContent>
      </Card>

      <SaveSettings />
    </form>
  );
}

function SaveSettings() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="self-start" disabled={pending}>
      {pending ? "Saving…" : "Save settings"}
    </Button>
  );
}
