import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { BadgeCheck, MapPin } from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { RatingStars } from "@/components/rating-stars";
import { StatusStrip } from "@/components/status-strip";
import { Badge } from "@/components/ui/badge";
import { ContactCard } from "@/components/expert/contact-card";
import { ExpertMap } from "@/components/expert/expert-map";
import { ExpertTabs } from "@/components/expert/expert-tabs";
import { PhotoGallery } from "@/components/expert/photo-gallery";
import { ReviewGate } from "@/components/expert/review-gate";
import { ReviewList } from "@/components/expert/review-list";

import {
  getAllExpertSlugs,
  getExpertBySlug,
  getPublicInventory,
  getPublicShopJobs,
  profileWarrantyDays,
} from "@/lib/queries/expert";
import { PublicInventory } from "@/components/expert/public-inventory";
import { PublicJobs } from "@/components/expert/public-jobs";
import { getShopStatus, type HoursInput } from "@/lib/hours";
import { buildBreadcrumbs, buildLocalBusiness, type Thing, type WithContext } from "@/lib/seo/jsonld";
import { localeAlternates } from "@/lib/seo/alternates";
import { isLocale, withLocale } from "@/i18n/config";
import { absoluteUrl } from "@/lib/site";
import { truncate } from "@/lib/utils";
import type { ExpertProfile } from "@/lib/types/database";

export const revalidate = 600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

/**
 * Only the slug is enumerated here. Next composes this with the locale segment
 * from the parent layout's own `generateStaticParams`, so this returns one entry
 * per shop, not one per shop per language.
 */
export async function generateStaticParams() {
  const experts = await getAllExpertSlugs(1000);
  return experts.map((expert) => ({ slug: expert.slug }));
}

function hoursOf(profile: ExpertProfile): HoursInput {
  return {
    working_days: profile.working_days,
    opening_time: profile.opening_time,
    closing_time: profile.closing_time,
    hours: profile.hours,
    timezone: profile.timezone,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = await getTranslations({ locale, namespace: "expert" });

  const profile = await getExpertBySlug(slug);
  if (!profile) return { title: t("notFound") };

  const primaryCategory = profile.categories[0]?.name;
  const title = primaryCategory
    ? `${profile.shop_name} — ${primaryCategory}`
    : profile.shop_name;

  // The shop's own bio is never translated — it is the owner's words. Only the
  // generated fallback, which is ours, is written in the reader's language.
  const description = profile.bio
    ? truncate(profile.bio, 155)
    : t("metaDescription", { shopName: profile.shop_name, address: profile.address });

  return {
    title,
    description,
    // Self-canonical per locale, plus hreflang for the other six. The
    // id-fallback route still never competes for indexing: it is not listed.
    alternates: localeAlternates(`/expert/${profile.slug}`, locale),
    openGraph: {
      type: "profile",
      title,
      description,
      url: absoluteUrl(withLocale(`/expert/${profile.slug}`, locale)),
      images: profile.photos[0] ? [profile.photos[0]] : undefined,
    },
  };
}

export default async function ExpertPage({ params }: PageProps) {
  const { locale: rawLocale, slug } = await params;
  const locale = isLocale(rawLocale) ? rawLocale : "en";
  const t = await getTranslations({ locale, namespace: "expert" });

  const profile = await getExpertBySlug(slug);
  if (!profile) notFound();

  const [publicInventory, publicJobs] = await Promise.all([
    getPublicInventory(profile.id),
    getPublicShopJobs(profile.id),
  ]);

  const hours = hoursOf(profile);
  // Computed on the server so the first paint is already correct; the client
  // strip then re-checks every 30s.
  const status = getShopStatus(hours);

  /* The strongest claim on this page, so it is resolved once and passed down
     rather than derived inside a component that also renders it. */
  const warrantyDays = profileWarrantyDays(profile);

  const schemas: WithContext<Thing>[] = [buildLocalBusiness(profile)];
  // Breadcrumb names are translated because Google renders them verbatim in the
  // result snippet. The paths are not: the shop lives at one URL per locale and
  // `buildBreadcrumbs` resolves them against the canonical origin.
  const breadcrumbs = buildBreadcrumbs([
    { name: t("breadcrumbHome"), path: "/" },
    { name: t("breadcrumbExperts"), path: "/search" },
    { name: profile.shop_name, path: `/expert/${profile.slug}` },
  ]);
  if (breadcrumbs) schemas.push(breadcrumbs);

  const about = (
    <div className="space-y-8">
      {profile.bio ? (
        <div className="prose prose-registry max-w-none">
          {profile.bio.split(/\n{2,}/).map((paragraph, index) => (
            <p key={index}>{paragraph}</p>
          ))}
        </div>
      ) : (
        <p className="text-steel">{t("noDescription")}</p>
      )}

      {profile.categories.length > 0 ? (
        <section>
          <p className="eyebrow mb-3">{t("whatTheyRepair")}</p>
          <ul className="flex flex-wrap gap-2">
            {profile.categories.map((category) => (
              <li key={category.id}>
                <Badge>{category.name}</Badge>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {profile.lat !== null && profile.lng !== null ? (
        <section>
          <p className="eyebrow mb-3">{t("location")}</p>
          <ExpertMap lat={profile.lat} lng={profile.lng} shopName={profile.shop_name} />
        </section>
      ) : null}
    </div>
  );

  return (
    <>
      <JsonLd data={schemas} />

      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <header>
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-display">{profile.shop_name}</h1>
                {profile.verified ? (
                  <Badge variant="verified">
                    <BadgeCheck aria-hidden />
                    {t("verified")}
                  </Badge>
                ) : null}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                <RatingStars
                  rating={Number(profile.rating_avg)}
                  count={profile.rating_count}
                  size="md"
                />
                <StatusStrip hours={hours} initialStatus={status} />
              </div>

              <p className="mt-3 flex items-center gap-1.5 text-sm text-steel">
                <MapPin aria-hidden className="size-4 shrink-0 text-steel-soft" />
                {profile.address}
              </p>

              {profile.categories.length > 0 ? (
                <ul className="mt-4 flex flex-wrap gap-2">
                  {profile.categories.slice(0, 6).map((category) => (
                    <li key={category.id}>
                      <Badge>{category.name}</Badge>
                    </li>
                  ))}
                </ul>
              ) : null}
            </header>

            <div className="mt-8">
              <PhotoGallery photos={profile.photos} shopName={profile.shop_name} />
            </div>

            {/* Contact card sits here on mobile, before the tabs, because
                phone and directions are the whole point of the page. */}
            <div className="mt-8 lg:hidden">
              <ContactCard
                profile={profile}
                hours={hours}
                initialStatus={status}
                warrantyDays={warrantyDays}
              />
            </div>

            <div className="mt-10">
              <ExpertTabs
                about={about}
                reviews={
                  <ReviewGate
                    fixerId={profile.id}
                    slug={profile.slug}
                    ownerId={profile.owner_id}
                    reviews={profile.reviews}
                  >
                    <ReviewList reviews={profile.reviews} />
                  </ReviewGate>
                }
                inventory={<PublicInventory items={publicInventory} shopName={profile.shop_name} />}
                jobs={<PublicJobs shopName={profile.shop_name} jobs={publicJobs} />}
                reviewCount={profile.rating_count}
                inventoryCount={publicInventory.length}
                jobsCount={publicJobs.length}
              />
            </div>
          </div>

          <div className="hidden lg:block">
            <div className="lg:sticky lg:top-24">
              <ContactCard
                profile={profile}
                hours={hours}
                initialStatus={status}
                warrantyDays={warrantyDays}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
