import Link from "next/link";
import Image from "next/image";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  BadgeCheck,
  CalendarClock,
  ExternalLink,
  ImageIcon,
  MapPin,
  Star,
  Tag,
} from "lucide-react";

import { BookingSettingsForm } from "@/components/dashboard/expert/booking-settings-form";
import { PhotoManager } from "@/components/dashboard/expert/photo-manager";
import { ShopProfileForm } from "@/components/dashboard/expert/shop-profile-form";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { formatClock, getShopStatus, resolveWeek, type HoursInput } from "@/lib/hours";
import { createClient } from "@/lib/supabase/server";
import type { Json, Weekday } from "@/lib/types/database";
import { cn, truncate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Shop profile",
  robots: { index: false, follow: false },
};

/**
 * Everything a customer sees before they book, in one editable screen.
 *
 * Three writes and three read-only panels, and the split between them is not
 * arbitrary — it is exactly what `expert-actions.ts` will accept. The public
 * details and the booking settings each have a server action; photos are a
 * direct RLS-scoped column write from the browser (see `PhotoManager`); and the
 * categories and the opening hours are owned elsewhere, so they are shown as
 * facts with a pointer rather than as controls that would go nowhere.
 *
 * The preview card renders *saved* values, not what is currently typed. That is
 * the honest reading of "how customers see you" — a live preview of an unsaved
 * form would show a listing that does not exist. Both actions revalidate this
 * path, so it catches up the moment a save lands.
 */

/**
 * Only what this page renders. `select("*")` would start returning whatever a
 * later migration adds, and the fallback below would silently stop matching it.
 *
 * The categories embed carries explicit constraint hints: `fixer_categories`
 * holds two foreign keys and PostgREST resolves an unhinted embed by guessing
 * which one was meant.
 */
const PROFILE_COLUMNS = `
  id, slug, shop_name, bio, address, lat, lng, timezone, verified, photos,
  contact_phone, contact_email,
  working_days, opening_time, closing_time, hours,
  rating_avg, rating_count,
  accepts_bookings, booking_lead_hours, booking_horizon_days, auto_accept,
  response_hours, default_warranty_days, payout_email,
  category_links:fixer_categories!fixer_categories_fixer_id_fkey (
    repair_categories!fixer_categories_category_id_fkey ( id, name )
  )
`;

interface ProfileDetail {
  id: string;
  slug: string;
  shop_name: string;
  bio: string | null;
  address: string;
  lat: number | null;
  lng: number | null;
  timezone: string;
  verified: boolean;
  photos: string[] | null;
  contact_phone: string | null;
  contact_email: string | null;
  working_days: Weekday[];
  opening_time: string;
  closing_time: string;
  hours: Json;
  rating_avg: number;
  rating_count: number;
  accepts_bookings: boolean;
  booking_lead_hours: number;
  booking_horizon_days: number;
  auto_accept: boolean;
  response_hours: number;
  default_warranty_days: number;
  payout_email: string | null;
  category_links: Array<{ repair_categories: { id: string; name: string } | null }> | null;
}

export default async function ExpertProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/profile");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this is a narrowing step rather than a second query. A null shop cannot
  // reach here — the gate renders the claim screen instead of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const profile = await readProfile(shop.id, {
    slug: shop.slug,
    shopName: shop.shopName,
    verified: shop.verified,
    timezone: shop.timezone,
    acceptsBookings: shop.acceptsBookings,
  });

  const categories = (profile.category_links ?? [])
    .map((link) => link.repair_categories)
    .filter((category): category is { id: string; name: string } => category !== null)
    .sort((a, b) => a.name.localeCompare(b.name));

  const photos = profile.photos ?? [];
  const publicUrl = `/expert/${profile.slug}`;

  const hours: HoursInput = {
    working_days: profile.working_days,
    opening_time: profile.opening_time,
    closing_time: profile.closing_time,
    hours: profile.hours,
    timezone: profile.timezone,
  };

  // A server snapshot, in the shop's own zone. The public page recomputes it on
  // the client every 30s; here it only has to be right at render.
  const status = getShopStatus(hours);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Shop profile"
        description="What customers read before they book you: the name above the door, what you fix, how to reach you, and the terms your diary runs on."
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href={publicUrl}>
              <ExternalLink aria-hidden />
              View public page
            </Link>
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <section>
            <SectionHeader title="Public details" />
            <Card>
              <CardContent className="pt-5">
                <ShopProfileForm
                  values={{
                    fixerId: profile.id,
                    shopName: profile.shop_name,
                    description: profile.bio,
                    contactPhone: profile.contact_phone,
                    contactEmail: profile.contact_email,
                    address: profile.address,
                    lat: profile.lat,
                    lng: profile.lng,
                  }}
                />
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader title="Photos" />
            <Card>
              <CardContent className="pt-5">
                <PhotoManager fixerId={profile.id} photos={photos} />
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader title="Booking settings" />
            <Card>
              <CardContent className="pt-5">
                <BookingSettingsForm
                  fixerId={profile.id}
                  values={{
                    accepts_bookings: profile.accepts_bookings,
                    booking_lead_hours: profile.booking_lead_hours,
                    booking_horizon_days: profile.booking_horizon_days,
                    auto_accept: profile.auto_accept,
                    response_hours: profile.response_hours,
                    default_warranty_days: profile.default_warranty_days,
                    payout_email: profile.payout_email,
                  }}
                />
              </CardContent>
            </Card>
          </section>
        </div>

        <div className="flex flex-col gap-6 lg:col-span-2">
          <section>
            <SectionHeader title="How customers see you" />
            <PreviewCard
              shopName={profile.shop_name}
              slug={profile.slug}
              verified={profile.verified}
              acceptsBookings={profile.accepts_bookings}
              ratingAvg={Number(profile.rating_avg)}
              ratingCount={profile.rating_count}
              address={profile.address}
              bio={profile.bio}
              phone={profile.contact_phone}
              cover={photos[0] ?? null}
              photoCount={photos.length}
              categories={categories}
              responseHours={profile.response_hours}
              statusLabel={status.isOpen ? status.headline : status.detail}
              isOpen={status.isOpen}
            />
          </section>

          <section>
            <SectionHeader title="What you repair" />
            <Card>
              <CardContent className="flex flex-col gap-3 pt-5">
                {categories.length > 0 ? (
                  <ul className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <li key={category.id}>
                        <Badge>{category.name}</Badge>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="flex items-start gap-2 text-sm leading-relaxed text-steel">
                    <Tag aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
                    No categories on your listing yet, so you will not appear when someone
                    filters the directory by repair type.
                  </p>
                )}

                <p className="text-xs leading-relaxed text-steel-soft">
                  Categories are how the directory files you, and they are set with us
                  rather than here — email support with what you want added or dropped.
                  Your individual services and their prices are yours to edit.
                </p>

                <Link
                  href="/dashboard/expert/services"
                  className="font-mono text-eyebrow uppercase tracking-[0.14em] text-signal hover:underline"
                >
                  Edit services
                </Link>
              </CardContent>
            </Card>
          </section>

          <section>
            <SectionHeader title="Opening hours" />
            <Card>
              <CardContent className="flex flex-col gap-3 pt-5">
                <dl className="divide-y divide-hairline">
                  {resolveWeek(hours).map((day) => (
                    <div
                      key={day.day}
                      className="flex items-baseline justify-between gap-4 py-1.5"
                    >
                      <dt className="text-sm text-steel">{day.label}</dt>
                      <dd
                        className={cn(
                          "font-mono text-sm tabular-nums",
                          day.schedule ? "text-enamel" : "text-steel-soft",
                        )}
                      >
                        {day.schedule
                          ? `${formatClock(day.schedule.openMinutes)} – ${formatClock(day.schedule.closeMinutes)}`
                          : "Closed"}
                      </dd>
                    </div>
                  ))}
                </dl>

                <p className="text-xs leading-relaxed text-steel-soft">
                  These are the hours printed on your listing, in{" "}
                  <span className="font-mono">{profile.timezone.replace(/_/g, " ")}</span>.
                  The diary customers actually book slots in is separate — it has its own
                  per-day capacity and gaps between jobs.
                </p>

                <Button asChild variant="outline" size="sm" className="self-start">
                  <Link href="/dashboard/expert/schedule">
                    <CalendarClock aria-hidden />
                    Opening hours and time off
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>
    </div>
  );
}

/**
 * The listing, drawn the way the directory draws it.
 *
 * Not a live preview of the form beside it — see the note at the top of the
 * file. Everything here comes from the saved row, so what it shows is what a
 * customer would find if they opened the page this second.
 */
function PreviewCard({
  shopName,
  slug,
  verified,
  acceptsBookings,
  ratingAvg,
  ratingCount,
  address,
  bio,
  phone,
  cover,
  photoCount,
  categories,
  responseHours,
  statusLabel,
  isOpen,
}: {
  shopName: string;
  slug: string;
  verified: boolean;
  acceptsBookings: boolean;
  ratingAvg: number;
  ratingCount: number;
  address: string;
  bio: string | null;
  phone: string | null;
  cover: string | null;
  photoCount: number;
  categories: Array<{ id: string; name: string }>;
  responseHours: number;
  statusLabel: string;
  isOpen: boolean;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="relative aspect-[16/9] border-b border-hairline bg-bench-sunk">
        {cover ? (
          <Image
            // Unoptimised for the same reason as the manager tiles: a seeded
            // listing can carry a photo from a host the image config does not
            // allow, and a broken preview would read as a broken listing.
            unoptimized
            src={cover}
            alt={`${shopName} cover photo`}
            fill
            sizes="(min-width: 1024px) 33vw, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-2 text-steel-soft">
            <ImageIcon aria-hidden className="size-6" />
            <p className="font-mono text-eyebrow uppercase tracking-[0.14em]">No cover photo</p>
          </div>
        )}

        {photoCount > 1 ? (
          <span className="absolute bottom-2 right-2 rounded-machined border border-hairline bg-chalk px-2 py-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
            {photoCount} photos
          </span>
        ) : null}
      </div>

      <CardContent className="flex flex-col gap-3 pt-5">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-display text-lg uppercase tracking-wide text-enamel">
            {shopName}
          </h3>
          {verified ? (
            <Badge variant="verified">
              <BadgeCheck aria-hidden />
              Verified
            </Badge>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
          {ratingCount > 0 ? (
            <span className="inline-flex items-center gap-1.5">
              <Star aria-hidden className="size-3.5 text-signal" />
              <span className="font-mono tabular-nums text-enamel">{ratingAvg.toFixed(1)}</span>
              <span className="text-steel-soft">
                ({ratingCount} {ratingCount === 1 ? "review" : "reviews"})
              </span>
            </span>
          ) : (
            <span className="text-steel-soft">No reviews yet</span>
          )}

          <span className="inline-flex items-center gap-2">
            <span
              aria-hidden
              className={cn("status-dot", isOpen ? "status-dot--open" : "status-dot--closed")}
            />
            <span className={isOpen ? "text-verdigris" : "text-steel"}>{statusLabel}</span>
          </span>
        </div>

        <p className="flex items-start gap-1.5 text-sm text-steel">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          {address}
        </p>

        {categories.length > 0 ? (
          <ul className="flex flex-wrap gap-1.5">
            {categories.slice(0, 4).map((category) => (
              <li key={category.id}>
                <Badge>{category.name}</Badge>
              </li>
            ))}
          </ul>
        ) : null}

        <p className="text-sm leading-relaxed text-steel">
          {bio ? (
            truncate(bio, 180)
          ) : (
            <span className="text-steel-soft">
              No description yet — this is the paragraph that tells a customer why to pick
              you.
            </span>
          )}
        </p>

        <dl className="grid gap-1.5 border-t border-hairline pt-3 text-sm">
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-steel-soft">Phone</dt>
            <dd className="font-mono text-enamel">
              {phone ?? <span className="text-steel-soft">Not listed</span>}
            </dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-steel-soft">Replies within</dt>
            <dd className="font-mono tabular-nums text-enamel">{responseHours} hr</dd>
          </div>
          <div className="flex items-baseline justify-between gap-4">
            <dt className="text-steel-soft">Bookings</dt>
            <dd className={acceptsBookings ? "text-verdigris" : "text-rust"}>
              {acceptsBookings ? "Open" : "Hidden from search"}
            </dd>
          </div>
        </dl>

        <Button asChild variant="outline" size="sm" className="self-start">
          <Link href={`/expert/${slug}`}>
            <ExternalLink aria-hidden />
            Open the real page
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/**
 * The full row behind this screen, or a usable stand-in.
 *
 * The layout's gate has already proved the shop exists, so a failure here is a
 * degraded database rather than a missing shop — a column the migration has not
 * added, most likely. Falling back to the five fields `getOwnedShop` already
 * returned plus the migration's own column defaults means the page still
 * renders every control, correctly labelled, instead of 500ing on a deployment
 * state. The defaults are the ones in `001_marketplace.sql` phase 3, so a save
 * from the fallback writes what the database would have held anyway.
 */
async function readProfile(
  fixerId: string,
  known: {
    slug: string;
    shopName: string;
    verified: boolean;
    timezone: string;
    acceptsBookings: boolean;
  },
): Promise<ProfileDetail> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("fixer_profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", fixerId)
    .maybeSingle<ProfileDetail>();

  if (error) {
    console.error("[expert] shop profile read failed", error.message);
  }

  if (data) return data;

  return {
    id: fixerId,
    slug: known.slug,
    shop_name: known.shopName,
    bio: null,
    address: "",
    lat: null,
    lng: null,
    timezone: known.timezone,
    verified: known.verified,
    photos: [],
    contact_phone: null,
    contact_email: null,
    working_days: ["mon", "tue", "wed", "thu", "fri"],
    opening_time: "09:00",
    closing_time: "18:00",
    hours: {},
    rating_avg: 0,
    rating_count: 0,
    accepts_bookings: known.acceptsBookings,
    booking_lead_hours: 2,
    booking_horizon_days: 60,
    auto_accept: false,
    response_hours: 24,
    default_warranty_days: 3,
    payout_email: null,
    category_links: [],
  };
}
