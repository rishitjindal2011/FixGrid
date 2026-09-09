import Link from "next/link";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";

/**
 * Reached when the reference does not resolve — no such booking, or one that
 * belongs to someone else. Both are the same page on purpose: a distinct
 * "not yours" would confirm the reference exists to anyone guessing at them.
 */
export default function BookingNotFound() {
  const t = useTranslations("dashboard.bookings");
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <p className="eyebrow">{t("notFoundEyebrow")}</p>
      <h1 className="mt-3 font-display text-display-sm uppercase text-enamel sm:text-display">
        {t("notFoundTitle")}
      </h1>
      <p className="mt-4 leading-relaxed text-steel">
        {t("notFoundBody")}
      </p>

      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Button asChild size="md">
          <Link href="/dashboard/bookings">{t("notFoundAll")}</Link>
        </Button>
        <Button asChild variant="outline" size="md">
          <Link href="/dashboard/discover">{t("findExpert")}</Link>
        </Button>
      </div>
    </div>
  );
}
