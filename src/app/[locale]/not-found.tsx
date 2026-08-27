import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

/**
 * Site-wide 404. Reached for any path that isn't an expert, a CMS page, or a
 * known route — including a `seo_redirects` source that was deleted.
 */
export default async function NotFound() {
  const t = await getTranslations("notFound");

  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow">{t("eyebrow")}</p>
      <h1 className="mt-3 text-display">{t("heading")}</h1>
      <p className="mt-4 leading-relaxed text-steel">
        {t("body")}
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/search">{t("findExpert")}</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">{t("backHome")}</Link>
        </Button>
      </div>
    </div>
  );
}
