import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import {
  BadgeCheck,
  Building2,
  ChevronRight,
  Clock,
  Cpu,
  Home,
  MapPin,
  Navigation,
  ShieldCheck,
  Sparkles,
  Truck,
  Wrench,
  Zap,
} from "lucide-react";

import { JsonLd } from "@/components/seo/JsonLd";
import { RatingStars } from "@/components/rating-stars";
import { StatusStrip } from "@/components/status-strip";
import { WarrantyBadge } from "@/components/warranty-badge";
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
import { absoluteUrl, SITE_KEYWORDS } from "@/lib/site";
import { directionsUrl, truncate } from "@/lib/utils";
import type { ExpertProfile } from "@/lib/types/database";

export const revalidate = 600;
export const dynamicParams = true;

type PageProps = { params: Promise<{ locale: string; slug: string }> };

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

  const description = profile.bio
    ? truncate(profile.bio, 155)
    : t("metaDescription", { shopName: profile.shop_name, address: profile.address });

  const keywords = Array.from(
    new Set([
      ...profile.categories.map((category) => `${category.name} repair`),
      ...(primaryCategory ? [`${primaryCategory} repair shop near me`] : []),
      profile.shop_name,
      "repair shop",
      ...SITE_KEYWORDS,
    ]),
  );

  return {
    title,
    description,
    keywords,
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
  const status = getShopStatus(hours);
  const warrantyDays = profileWarrantyDays(profile);
  const responseHours = (profile as { response_hours?: number }).response_hours ?? 24;

  const formattedSchedule = (() => {
    const wd = profile.working_days;
    const ot = profile.opening_time;
    const ct = profile.closing_time;

    let daysStr = "";
    if (wd && wd.length === 7) daysStr = "Open 7 Days";
    else if (wd && wd.length === 5 && !wd.includes("sat") && !wd.includes("sun")) daysStr = "Mon – Fri";
    else if (wd && wd.length === 6 && !wd.includes("sun")) daysStr = "Mon – Sat";
    else if (wd && wd.length > 0) daysStr = `${wd.length} Days/Wk`;

    let hoursStr = "";
    if (ot && ct && ot !== "00:00:00") {
      const fmt = (tStr: string) => {
        const parts = tStr.split(":");
        const hPart = parts[0] ?? "0";
        const mPart = parts[1] ?? "00";
        let h = parseInt(hPart, 10);
        const ampm = h >= 12 ? "PM" : "AM";
        h = h % 12 || 12;
        return `${h}:${mPart} ${ampm}`;
      };
      hoursStr = `${fmt(ot)} – ${fmt(ct)}`;
    }

    if (daysStr && hoursStr) return `${daysStr} · ${hoursStr}`;
    return daysStr || hoursStr || null;
  })();

  const schemas: WithContext<Thing>[] = [buildLocalBusiness(profile)];
  const breadcrumbs = buildBreadcrumbs([
    { name: t("breadcrumbHome"), path: "/" },
    { name: t("breadcrumbExperts"), path: "/search" },
    { name: profile.shop_name, path: `/expert/${profile.slug}` },
  ]);
  if (breadcrumbs) schemas.push(breadcrumbs);

  const about = (
    <div className="space-y-6">
      {/* Workshop Statement / Bio */}
      <div className="rounded-xl border border-hairline bg-bench/30 p-4 sm:p-5">
        <div className="flex items-start gap-3.5">
          <div className="size-10 rounded-xl bg-signal/10 border border-signal/20 flex items-center justify-center text-signal shrink-0 mt-0.5">
            <Wrench className="size-5" />
          </div>
          <div className="flex-1 space-y-1 min-w-0">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-display text-base font-bold uppercase tracking-tight text-enamel">
                Technician &amp; Workshop Statement
              </h3>
              <span className="font-mono text-[10px] uppercase font-bold text-verdigris bg-verdigris-wash px-2 py-0.5 rounded border border-verdigris/30">
                FixGrid Certified Bench
              </span>
            </div>
            <p className="text-sm text-steel leading-relaxed">
              {profile.bio && profile.bio.trim().length > 0
                ? profile.bio
                : "Verified independent repair facility equipped for on-site diagnostic testing, board-level inspection, and component-level repairs backed by FixGrid Smart Escrow protection."}
            </p>
          </div>
        </div>
      </div>

      {/* Laboratory Diagnostic & Bench Standards */}
      <div>
        <div className="flex items-center justify-between mb-2.5">
          <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft">
            FixGrid Hardware Standards
          </p>
          <span className="font-mono text-[10px] text-verdigris font-semibold">
            0% Advance Risk Guarantee
          </span>
        </div>

        <div className="grid gap-3.5 sm:grid-cols-3">
          <div className="rounded-xl border border-hairline/80 bg-chalk p-4 shadow-2xs hover:border-signal/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-signal">
              <Zap className="size-4 shrink-0" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-enamel">
                Diagnostic Intake
              </h4>
            </div>
            <p className="text-xs text-steel leading-relaxed">
              Root-cause fault isolation and transparent quote before any disassembly.
            </p>
          </div>

          <div className="rounded-xl border border-hairline/80 bg-chalk p-4 shadow-2xs hover:border-verdigris/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-verdigris">
              <ShieldCheck className="size-4 shrink-0" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-enamel">
                Smart Escrow
              </h4>
            </div>
            <p className="text-xs text-steel leading-relaxed">
              Funds are secured in escrow until you inspect and sign off on the fix.
            </p>
          </div>

          <div className="rounded-xl border border-hairline/80 bg-chalk p-4 shadow-2xs hover:border-enamel/40 transition-colors">
            <div className="flex items-center gap-2 mb-2 text-enamel">
              <Cpu className="size-4 shrink-0" />
              <h4 className="font-display text-xs font-bold uppercase tracking-wider text-enamel">
                Quality Parts
              </h4>
            </div>
            <p className="text-xs text-steel leading-relaxed">
              OEM-grade replacement components backed by recorded FixGrid warranty.
            </p>
          </div>
        </div>
      </div>

      {/* Supported Repair Specialties */}
      <div className="rounded-xl border border-hairline/80 bg-chalk p-4 sm:p-5 shadow-2xs">
        <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft mb-3">
          {t("whatTheyRepair")} &amp; Technical Capabilities
        </p>
        {profile.categories.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {profile.categories.map((category) => (
              <li key={category.id}>
                <Badge className="border-hairline bg-bench px-3 py-1.5 text-xs text-enamel font-mono uppercase shadow-2xs">
                  {category.name}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Badge className="border-hairline bg-bench px-3 py-1.5 text-xs text-enamel font-mono uppercase shadow-2xs">
              Hardware Bench Diagnostics
            </Badge>
            <Badge className="border-hairline bg-bench px-3 py-1.5 text-xs text-enamel font-mono uppercase shadow-2xs">
              Component-Level Inspection
            </Badge>
            <Badge className="border-hairline bg-bench px-3 py-1.5 text-xs text-enamel font-mono uppercase shadow-2xs">
              Board-Level Soldering
            </Badge>
            <Badge className="border-hairline bg-bench px-3 py-1.5 text-xs text-enamel font-mono uppercase shadow-2xs">
              Direct Technician Access
            </Badge>
          </div>
        )}
      </div>

      {/* Workshop Location Radar Map */}
      {profile.lat !== null && profile.lng !== null ? (
        <div className="rounded-xl border border-hairline/80 bg-chalk p-4 sm:p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <p className="font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft">
              {t("location")} &amp; Radar
            </p>
            <a
              href={directionsUrl(profile.lat, profile.lng)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-signal hover:underline"
            >
              <Navigation className="size-3" />
              Open in Google Maps
            </a>
          </div>
          <div className="rounded-xl border border-hairline overflow-hidden shadow-bench">
            <ExpertMap lat={profile.lat} lng={profile.lng} shopName={profile.shop_name} />
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {schemas.length > 0 ? <JsonLd data={schemas} /> : null}

      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
        {/* Breadcrumb Navigation */}
        <nav aria-label="Breadcrumb" className="mb-4 flex flex-wrap items-center justify-between gap-2 text-xs text-steel">
          <div className="flex items-center gap-1.5">
            <Link href="/" className="hover:text-signal transition-colors">Home</Link>
            <ChevronRight className="size-3 text-steel/50" />
            <Link href="/search" className="hover:text-signal transition-colors">Verified Workshops</Link>
            <ChevronRight className="size-3 text-steel/50" />
            <span className="font-semibold text-enamel">{profile.shop_name}</span>
          </div>

          <div className="flex items-center gap-2 font-mono text-[11px] font-semibold text-verdigris bg-verdigris-wash/80 border border-verdigris/30 px-2.5 py-0.5 rounded">
            <ShieldCheck className="size-3.5" />
            <span>FixGrid Certified · Smart Escrow Protected</span>
          </div>
        </nav>

        {/* Executive Workshop Hero Banner Card */}
        <div className="mb-8 rounded-2xl border border-hairline bg-chalk p-5 sm:p-7 shadow-bench">
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 border-b border-hairline/60 pb-5">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-enamel">
                  {profile.shop_name}
                </h1>
                {profile.verified ? (
                  <span className="inline-flex items-center gap-1 rounded bg-verdigris-wash border border-verdigris/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-verdigris shadow-2xs">
                    <BadgeCheck className="size-3.5" />
                    Verified Partner
                  </span>
                ) : null}
              </div>

              <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-steel">
                <p className="flex items-center gap-1.5 font-medium text-enamel">
                  <MapPin className="size-4 shrink-0 text-signal" />
                  <span>{profile.address}</span>
                </p>
                {profile.lat !== null && profile.lng !== null ? (
                  <a
                    href={directionsUrl(profile.lat, profile.lng)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 font-mono text-xs font-semibold text-signal hover:underline"
                  >
                    <Navigation className="size-3" />
                    Get Directions
                  </a>
                ) : null}
              </div>
            </div>

            <div className="shrink-0">
              <div className="rounded-xl bg-bench px-3 py-1.5 border border-hairline/70">
                <StatusStrip hours={hours} size="md" initialStatus={status} />
              </div>
            </div>
          </div>

          {/* Telemetry, Trust & Capabilities Ribbon */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {profile.rating_count > 0 ? (
                <RatingStars
                  rating={Number(profile.rating_avg)}
                  count={profile.rating_count}
                  size="md"
                />
              ) : (
                <span className="inline-flex items-center gap-1.5 rounded bg-bench px-2.5 py-1 font-mono text-[11px] font-semibold text-steel border border-hairline/70">
                  <Sparkles className="size-3.5 text-signal" />
                  New Verified Listing · First Reviews Pending
                </span>
              )}

              <span className="inline-flex items-center gap-1.5 rounded bg-verdigris-wash border border-verdigris/30 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-verdigris">
                <ShieldCheck className="size-3.5 text-verdigris" />
                Smart Escrow Protected
              </span>

              <span className="inline-flex items-center gap-1.5 rounded bg-enamel/5 border border-enamel/15 px-2.5 py-1 font-mono text-[11px] font-bold uppercase text-enamel">
                <Zap className="size-3.5 text-signal" />
                ~{responseHours}h Response Window
              </span>

              {warrantyDays > 0 ? <WarrantyBadge days={warrantyDays} /> : null}
            </div>

            {/* Service Delivery Pills */}
            <div className="flex flex-wrap items-center gap-1.5">
              {profile.offers_in_shop ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-chalk border border-hairline px-2.5 py-1 text-xs font-medium text-enamel shadow-2xs">
                  <Building2 className="size-3.5 text-signal" />
                  <span>In-Shop Lab</span>
                </span>
              ) : null}
              {profile.offers_home_service ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-chalk border border-hairline px-2.5 py-1 text-xs font-medium text-enamel shadow-2xs">
                  <Home className="size-3.5 text-verdigris" />
                  <span>Home Visit</span>
                </span>
              ) : null}
              {profile.offers_pickup_drop ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-chalk border border-hairline px-2.5 py-1 text-xs font-medium text-enamel shadow-2xs">
                  <Truck className="size-3.5 text-steel" />
                  <span>Pickup &amp; Return</span>
                </span>
              ) : null}
              {formattedSchedule ? (
                <span className="inline-flex items-center gap-1.5 rounded bg-bench px-2.5 py-1 text-xs text-steel font-mono border border-hairline/60">
                  <Clock className="size-3.5 text-steel-soft" />
                  <span>{formattedSchedule}</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>

        {/* Modern 2-Column Split: Content Feed & Sticky Booking Sidebar */}
        <div className="grid gap-8 lg:grid-cols-[1.85fr_1.15fr] items-start">
          {/* Main Showcase Column */}
          <div className="min-w-0 space-y-6">
            {/* Gallery Canvas with Contextual Header */}
            <div className="rounded-2xl border border-hairline bg-chalk p-3 sm:p-4 shadow-bench">
              <div className="flex items-center justify-between gap-3 mb-2.5 px-1">
                <div className="flex items-center gap-2 font-mono text-xs font-bold uppercase tracking-wider text-steel">
                  <Building2 className="size-3.5 text-signal" />
                  <span>Workshop Facility &amp; Diagnostics Lab</span>
                </div>
                <span className="font-mono text-[10px] text-steel-soft bg-bench px-2 py-0.5 rounded border border-hairline/60">
                  {profile.photos.length > 0 ? `${profile.photos.length} Verified Photo` : "Verified Laboratory"}
                </span>
              </div>
              <PhotoGallery photos={profile.photos} shopName={profile.shop_name} />
            </div>

            {/* Mobile Contact Deck */}
            <div className="lg:hidden">
              <ContactCard
                profile={profile}
                hours={hours}
                initialStatus={status}
                warrantyDays={warrantyDays}
              />
            </div>

            {/* Comprehensive Information Tabs */}
            <div className="rounded-2xl border border-hairline bg-chalk p-5 sm:p-6 shadow-bench">
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

          {/* Sticky Executive Booking & Contact Deck */}
          <div className="hidden lg:block sticky top-24">
            <ContactCard
              profile={profile}
              hours={hours}
              initialStatus={status}
              warrantyDays={warrantyDays}
            />
          </div>
        </div>
      </div>
    </>
  );
}
