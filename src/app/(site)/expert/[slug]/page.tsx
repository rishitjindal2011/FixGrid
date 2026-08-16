import type { Metadata } from "next";
import { notFound } from "next/navigation";
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
  profileWarrantyDays,
} from "@/lib/queries/expert";
import { PublicInventory } from "@/components/expert/public-inventory";
import { getShopStatus, type HoursInput } from "@/lib/hours";
import { buildBreadcrumbs, buildLocalBusiness, type Thing, type WithContext } from "@/lib/seo/jsonld";
import { absoluteUrl } from "@/lib/site";
import { truncate } from "@/lib/utils";
import type { ExpertProfile } from "@/lib/types/database";

export const revalidate = 600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ slug: string }> };

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
  const { slug } = await params;
  const profile = await getExpertBySlug(slug);
  if (!profile) return { title: "Repair expert not found" };

  const primaryCategory = profile.categories[0]?.name;
  const title = primaryCategory
    ? `${profile.shop_name} — ${primaryCategory}`
    : profile.shop_name;

  const description = profile.bio
    ? truncate(profile.bio, 155)
    : `${profile.shop_name} is a repair shop at ${profile.address}. See opening hours, services and reviews.`;

  // Canonical always points at the slug URL, so the id-fallback route never
  // competes with it for indexing.
  const canonical = absoluteUrl(`/expert/${profile.slug}`);

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      type: "profile",
      title,
      description,
      url: canonical,
      images: profile.photos[0] ? [profile.photos[0]] : undefined,
    },
  };
}

export default async function ExpertPage({ params }: PageProps) {
  const { slug } = await params;
  
  const profile = await getExpertBySlug(slug);
  if (!profile) notFound();
  
  const publicInventory = await getPublicInventory(profile.id);

  const hours = hoursOf(profile);
  // Computed on the server so the first paint is already correct; the client
  // strip then re-checks every 30s.
  const status = getShopStatus(hours);

  /* The strongest claim on this page, so it is resolved once and passed down
     rather than derived inside a component that also renders it. */
  const warrantyDays = profileWarrantyDays(profile);

  const schemas: WithContext<Thing>[] = [buildLocalBusiness(profile)];
  const breadcrumbs = buildBreadcrumbs([
    { name: "Home", path: "/" },
    { name: "Experts", path: "/search" },
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
        <p className="text-steel">This shop hasn&apos;t added a description yet.</p>
      )}

      {profile.categories.length > 0 ? (
        <section>
          <p className="eyebrow mb-3">What they repair</p>
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
          <p className="eyebrow mb-3">Location</p>
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
                    Verified
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
                reviewCount={profile.rating_count}
                inventoryCount={publicInventory.length}
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
