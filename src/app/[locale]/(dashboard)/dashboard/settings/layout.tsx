import { getTranslations } from "next-intl/server";

import { PageHeader } from "@/components/dashboard/page-header";
import { SettingsNav } from "@/components/dashboard/settings-nav";

/**
 * Shell for the four settings pages.
 *
 * The header lives here rather than on each page so the strip below it stays
 * put while you move between tabs — a `PageHeader` per page would re-render an
 * identical block four times and make the nav look like it jumped. Pages open
 * straight into their own `SectionHeader`.
 *
 * The auth gate is the dashboard layout's; nothing is repeated here.
 */
export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const t = await getTranslations("dashboard.settingsNav");

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <SettingsNav />

      {children}
    </div>
  );
}
