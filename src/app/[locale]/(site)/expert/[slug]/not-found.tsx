import Link from "next/link";
import { getTranslations } from "next-intl/server";

import { Button } from "@/components/ui/button";

/**
 * Empty and error states are directional, not apologetic: say what happened,
 * then give one clear way forward.
 */
export default async function ExpertNotFound() {
  const t = await getTranslations("expert");

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow">{t("notFoundEyebrow")}</p>
      <h1 className="mt-3 text-display">{t("notFoundHeading")}</h1>
      <p className="mt-4 leading-relaxed text-steel">{t("notFoundBody")}</p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/search">{t("browseExperts")}</Link>
      </Button>
    </div>
  );
}
