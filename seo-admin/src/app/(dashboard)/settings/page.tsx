import type { Metadata } from "next";

import { PageHeader } from "@/components/admin/page-header";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSession } from "@/lib/auth/session";
import { getGlobalSettings } from "@/lib/queries/pages";
import { PUBLIC_APP_URL } from "@/lib/site";
import { formatDateTime } from "@/lib/utils";

export const metadata: Metadata = { title: "Settings" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [settings, session] = await Promise.all([getGlobalSettings(), getSession()]);
  const isOwner = session?.role === "owner";

  return (
    <>
      <PageHeader
        eyebrow="Configuration"
        title="Global SEO"
        description={
          settings
            ? `Site-wide defaults. Last changed ${formatDateTime(settings.updated_at)}.`
            : "Site-wide defaults. Nothing saved yet — these are the built-in fallbacks."
        }
      />

      {isOwner ? (
        <SettingsForm settings={settings} />
      ) : (
        <p className="max-w-prose rounded-machined border border-hairline bg-chalk px-4 py-6 text-sm leading-relaxed text-steel">
          Global settings are owner-only. They apply to every page at once, so
          the permission is deliberately narrower than page editing.
        </p>
      )}

      {/*
        Shown to everyone including viewers. When a canonical tag looks wrong the
        first question is always "which origin is the admin actually building
        against", and that comes from the environment, not the database.
      */}
      <section className="mt-10 max-w-2xl border-t border-hairline pt-6">
        <h2 className="text-lg">Environment</h2>
        <dl className="mt-3 grid grid-cols-[10rem_minmax(0,1fr)] gap-x-4 gap-y-2 text-sm">
          <dt className="text-steel">Consumer app</dt>
          <dd className="truncate font-mono text-xs text-enamel">{PUBLIC_APP_URL}</dd>

          <dt className="text-steel">Canonical domain</dt>
          <dd className="truncate font-mono text-xs text-enamel">
            {settings?.canonical_domain ?? "— not set —"}
          </dd>
        </dl>

        {settings && settings.canonical_domain !== PUBLIC_APP_URL ? (
          <p className="mt-3 max-w-prose rounded-machined border border-signal/30 bg-signal-wash px-3 py-2.5 text-sm leading-relaxed text-enamel">
            These two differ. That is correct behind a CDN or a marketing domain,
            but if it is unintended the site will canonicalise to an origin the
            preview links never reach.
          </p>
        ) : null}
      </section>
    </>
  );
}
