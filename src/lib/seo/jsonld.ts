import { absoluteUrl, SITE_NAME, SITE_ORIGIN } from "@/lib/site";
import { toSchemaOpeningHours, type HoursInput } from "@/lib/hours";
import type { ExpertProfile } from "@/lib/types/database";

/**
 * Typed JSON-LD builders.
 *
 * Hand-rolled rather than pulling in `schema-dts`: we emit five shapes, and a
 * 2 MB type-only dependency to describe them is not a trade worth making.
 * Every builder prunes undefined keys — Google treats an empty `""` or a
 * literal `null` as a malformed value, and Search Console reports it.
 */

export interface Thing {
  "@type": string;
  [key: string]: unknown;
}

export type WithContext<T extends Thing> = T & { "@context": "https://schema.org" };

/** Recursively drop undefined / null / empty-string / empty-array values. */
function prune<T>(input: T): T {
  if (Array.isArray(input)) {
    const cleaned = input.map(prune).filter((value) => value !== undefined);
    return cleaned as unknown as T;
  }
  if (input && typeof input === "object") {
    const entries = Object.entries(input as Record<string, unknown>)
      .map(([key, value]) => [key, prune(value)] as const)
      .filter(([, value]) => {
        if (value === undefined || value === null || value === "") return false;
        if (Array.isArray(value) && value.length === 0) return false;
        return true;
      });
    return Object.fromEntries(entries) as T;
  }
  return input;
}

function withContext<T extends Thing>(thing: T): WithContext<T> {
  return prune({ "@context": "https://schema.org", ...thing }) as WithContext<T>;
}

/* ── Organisation + site (root layout) ────────────────────────────────────── */

export function buildOrganization(): WithContext<Thing> {
  return withContext({
    "@type": "Organization",
    "@id": `${SITE_ORIGIN}/#organization`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    logo: absoluteUrl("/icon.svg"),
  });
}

export function buildWebSite(): WithContext<Thing> {
  return withContext({
    "@type": "WebSite",
    "@id": `${SITE_ORIGIN}/#website`,
    name: SITE_NAME,
    url: SITE_ORIGIN,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${SITE_ORIGIN}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  });
}

/* ── LocalBusiness (expert profile, spec §3.2) ────────────────────────────── */

export function buildLocalBusiness(profile: ExpertProfile): WithContext<Thing> {
  const url = absoluteUrl(`/expert/${profile.slug}`);

  const hoursInput: HoursInput = {
    working_days: profile.working_days,
    opening_time: profile.opening_time,
    closing_time: profile.closing_time,
    hours: profile.hours,
    timezone: profile.timezone,
  };

  return withContext({
    "@type": "LocalBusiness",
    "@id": `${url}#business`,
    name: profile.shop_name,
    description: profile.bio ?? undefined,
    url,
    image: profile.photos.length > 0 ? profile.photos : undefined,
    telephone: profile.contact_phone ?? undefined,
    email: profile.contact_email ?? undefined,
    address: { "@type": "PostalAddress", streetAddress: profile.address },
    geo:
      profile.lat !== null && profile.lng !== null
        ? {
            "@type": "GeoCoordinates",
            latitude: profile.lat,
            longitude: profile.lng,
          }
        : undefined,
    openingHours: toSchemaOpeningHours(hoursInput),
    // Emitting an AggregateRating with zero reviews is a structured-data
    // error, not merely unhelpful. Omit it entirely until a review exists.
    aggregateRating:
      profile.rating_count > 0
        ? {
            "@type": "AggregateRating",
            ratingValue: Number(profile.rating_avg),
            reviewCount: profile.rating_count,
            bestRating: 5,
            worstRating: 1,
          }
        : undefined,
    review: profile.reviews.slice(0, 10).map((review) => ({
      "@type": "Review",
      reviewRating: {
        "@type": "Rating",
        ratingValue: review.rating,
        bestRating: 5,
        worstRating: 1,
      },
      author: { "@type": "Person", name: review.customer?.display_name ?? "Verified customer" },
      datePublished: review.created_at.slice(0, 10),
      reviewBody: review.text ?? undefined,
    })),
    makesOffer: profile.categories.map((category) => ({
      "@type": "Offer",
      itemOffered: { "@type": "Service", name: category.name },
    })),
  });
}

/* ── FAQPage (faq_accordion block, spec §3.3) ─────────────────────────────── */

export function buildFaqPage(
  items: Array<{ question: string; answer: string }>,
  pageUrl: string,
): WithContext<Thing> | null {
  if (items.length === 0) return null;

  return withContext({
    "@type": "FAQPage",
    "@id": `${pageUrl}#faq`,
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  });
}

/* ── Service + WebPage (CMS pages) ────────────────────────────────────────── */

export function buildService(params: {
  name: string;
  description?: string | null;
  url: string;
  areaServed?: string;
}): WithContext<Thing> {
  return withContext({
    "@type": "Service",
    "@id": `${params.url}#service`,
    name: params.name,
    description: params.description ?? undefined,
    url: params.url,
    areaServed: params.areaServed,
    provider: { "@id": `${SITE_ORIGIN}/#organization` },
  });
}

export function buildWebPage(params: {
  name: string;
  description?: string | null;
  url: string;
  datePublished?: string | null;
  dateModified?: string | null;
  schemaType?: string;
}): WithContext<Thing> {
  return withContext({
    "@type": params.schemaType && params.schemaType !== "Service" ? params.schemaType : "WebPage",
    "@id": `${params.url}#webpage`,
    name: params.name,
    description: params.description ?? undefined,
    url: params.url,
    datePublished: params.datePublished ?? undefined,
    dateModified: params.dateModified ?? undefined,
    isPartOf: { "@id": `${SITE_ORIGIN}/#website` },
  });
}

/* ── BreadcrumbList ───────────────────────────────────────────────────────── */

export function buildBreadcrumbs(
  trail: Array<{ name: string; path: string }>,
): WithContext<Thing> | null {
  if (trail.length === 0) return null;

  return withContext({
    "@type": "BreadcrumbList",
    itemListElement: trail.map((crumb, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: crumb.name,
      item: absoluteUrl(crumb.path),
    })),
  });
}

export function buildArticle(params: {
  headline: string;
  description?: string | null;
  url: string;
  datePublished?: string | null;
  dateModified?: string | null;
  image?: string | null;
  keywords?: string[] | null;
}): WithContext<Thing> {
  return withContext({
    "@type": "BlogPosting",
    "@id": `${params.url}#article`,
    headline: params.headline,
    description: params.description ?? undefined,
    url: params.url,
    datePublished: params.datePublished ?? undefined,
    dateModified: params.dateModified ?? undefined,
    image: params.image ?? undefined,
    keywords: params.keywords?.join(", ") ?? undefined,
    publisher: { "@id": `${SITE_ORIGIN}/#organization` },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": params.url,
    },
  });
}

/**
 * Merge admin-authored `schema_markup` JSONB with a generated base object.
 * Admin keys win, so a page can override `areaServed` without us shipping a
 * bespoke builder for every variation.
 */
export function mergeCustomSchema(
  base: WithContext<Thing>,
  custom: unknown,
): WithContext<Thing> {
  if (!custom || typeof custom !== "object" || Array.isArray(custom)) return base;
  return prune({ ...base, ...(custom as Record<string, unknown>) }) as WithContext<Thing>;
}
