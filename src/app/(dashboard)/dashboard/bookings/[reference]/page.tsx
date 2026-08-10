import type { ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Building2,
  Car,
  FileText,
  Home,
  MapPin,
  MessagesSquare,
  Paperclip,
  Receipt,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { AddToCalendar } from "@/components/dashboard/add-to-calendar";
import { BookingActions } from "@/components/dashboard/booking-actions";
import { BookingTimeline } from "@/components/dashboard/booking-timeline";
import { CostBreakdown } from "@/components/dashboard/cost-breakdown";
import { RescheduleDialog } from "@/components/dashboard/reschedule-dialog";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { allowedActions, slotEnd, slotStart, statusExplainer } from "@/lib/bookings/actions-map";
import {
  getBookingByReference,
  type BookingAttachment,
  type BookingDetail,
} from "@/lib/dashboard/booking-detail";
import { getThreadForBooking } from "@/lib/dashboard/messages";
import {
  daysUntil,
  formatDateLong,
  formatDuration,
  formatSlot,
} from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import {
  DELIVERY_MODE_LABELS,
  type AttachmentKind,
  type DeliveryMode,
} from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Booking",
  robots: { index: false, follow: false },
};

const BUCKET = "booking-attachments";
/** Long enough to read the page, short enough that a copied URL dies quickly. */
const SIGNED_URL_TTL_SECONDS = 300;

const MODE_ICON: Record<DeliveryMode, typeof Building2> = {
  in_shop: Building2,
  home_visit: Home,
  pickup_drop: Car,
};

const ATTACHMENT_LABELS: Record<AttachmentKind, string> = {
  fault: "What was wrong",
  completion: "After the repair",
  evidence: "Claim evidence",
};

/**
 * The statuses where a slot can still be moved.
 *
 * Not `!isTerminal(status)`: `in_progress` is non-terminal and the device is
 * already on the bench, so proposing a different morning for it is nonsense.
 */
const RESCHEDULABLE = new Set(["requested", "accepted", "confirmed"]);

/**
 * Signed URLs for the job's photos, one round-trip for all of them.
 *
 * The bucket is private, so a stored path is not fetchable on its own. Every
 * failure — bucket not provisioned, storage disabled, a path that no longer
 * resolves — maps to a null URL and a filename chip. A photo that will not
 * render must not take the booking page with it.
 */
async function signAttachments(
  attachments: BookingAttachment[],
): Promise<Map<string, string | null>> {
  const signed = new Map<string, string | null>();
  if (attachments.length === 0) return signed;

  for (const item of attachments) signed.set(item.storagePath, null);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(
        attachments.map((item) => item.storagePath),
        SIGNED_URL_TTL_SECONDS,
      );

    if (error) {
      console.error("[bookings] attachment signing failed", error.message);
      return signed;
    }

    for (const row of data ?? []) {
      if (row.path && row.signedUrl) signed.set(row.path, row.signedUrl);
    }
  } catch (error) {
    console.error(
      "[bookings] storage unavailable",
      error instanceof Error ? error.message : error,
    );
  }

  return signed;
}

/**
 * An instant as a `datetime-local` value in the shop's zone.
 *
 * `sv-SE` is the shortest route to ISO-ordered parts out of `Intl`; the parts
 * are reassembled by hand rather than string-sliced because the separator
 * differs between runtimes.
 */
function localInputValue(date: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone,
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).formatToParts(date);

  const read = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((part) => part.type === type)?.value ?? "00";

  return `${read("year")}-${read("month")}-${read("day")}T${read("hour")}:${read("minute")}`;
}

/** The postal address on the job, as lines. Empty when the shop is the venue. */
function addressLines(booking: BookingDetail): string[] {
  return [
    booking.address_line1,
    booking.address_line2,
    booking.address_city,
    booking.address_postcode,
  ].filter((line): line is string => Boolean(line?.trim()));
}

function Panel({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon?: typeof Building2;
  children: ReactNode;
}) {
  return (
    <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
      <h2 className="eyebrow flex items-center gap-2">
        {Icon ? <Icon aria-hidden className="size-3.5" /> : null}
        {title}
      </h2>
      <div className="pt-3">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="eyebrow pb-1">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

function AttachmentTile({
  item,
  url,
}: {
  item: BookingAttachment;
  url: string | null;
}) {
  const isImage = (item.mimeType ?? "").startsWith("image/");
  const label = item.fileName ?? ATTACHMENT_LABELS[item.kind];

  // `unoptimized` deliberately: the optimiser would cache a derivative keyed on
  // a URL whose signature expires in five minutes, so every view is a miss, and
  // the signed host is not in `next.config.ts` remote patterns.
  if (url && isImage) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer noopener"
        className="group block overflow-hidden rounded-machined border border-hairline bg-bench"
      >
        <Image
          src={url}
          alt={label}
          width={240}
          height={240}
          unoptimized
          className="h-24 w-full object-cover transition-opacity group-hover:opacity-90"
        />
        <span className="block truncate px-2 py-1.5 text-xs text-steel">
          {ATTACHMENT_LABELS[item.kind]}
        </span>
      </a>
    );
  }

  const chip = (
    <>
      <FileText aria-hidden className="size-4 shrink-0 text-steel-soft" />
      <span className="min-w-0 truncate">{label}</span>
    </>
  );

  return url ? (
    <a
      href={url}
      target="_blank"
      rel="noreferrer noopener"
      className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-3 py-2.5 text-sm text-enamel hover:border-steel-soft"
    >
      {chip}
    </a>
  ) : (
    <span
      title="This file cannot be shown right now."
      className="flex items-center gap-2 rounded-machined border border-dashed border-hairline bg-bench/40 px-3 py-2.5 text-sm text-steel-soft"
    >
      {chip}
    </span>
  );
}

/**
 * One booking, in full.
 *
 * `now` is captured once and threaded into everything time-dependent — the
 * action gating, the timeline's relative stamps, the warranty countdown. Each
 * of those calling `new Date()` for itself would let them disagree about which
 * side of a deadline the request landed on.
 */
export default async function BookingDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/bookings");

  const { reference } = await params;
  const booking = await getBookingByReference(user.id, reference);

  // Null covers "no such reference", "RLS said no", "belongs to someone else"
  // and "the migration has not been run". All four are a 404 here: anything
  // more specific would confirm which references exist.
  if (!booking) notFound();

  const now = new Date();
  const timeZone = booking.shop?.timezone ?? "Europe/London";
  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);

  const [thread, signed] = await Promise.all([
    getThreadForBooking(booking.id),
    signAttachments(booking.attachments),
  ]);

  const actions = allowedActions(booking, "customer", now);

  // `final_amount` is what the job came to, `quoted_amount` what was agreed
  // before it started. With neither there is no price yet, and rendering a
  // breakdown that sums to £0 would read as "free" rather than "not priced".
  const servicePence = booking.final_amount ?? booking.quoted_amount;
  const totalPence =
    servicePence === null
      ? null
      : servicePence + booking.platform_fee + booking.tax_amount;

  const warrantyOpen =
    booking.warranty_expires_at !== null &&
    new Date(booking.warranty_expires_at).getTime() > now.getTime();

  const durationMinutes =
    booking.service?.duration_minutes ??
    (start && end ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000)) : 60);

  const canReschedule = RESCHEDULABLE.has(booking.status);
  const showCalendar =
    start !== null &&
    end !== null &&
    (booking.status === "accepted" ||
      booking.status === "confirmed" ||
      booking.status === "in_progress");

  const ModeIcon = MODE_ICON[booking.delivery_mode];
  const lines = addressLines(booking);
  const title = booking.service?.name ?? booking.device_details ?? "Repair booking";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/bookings"
          className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All bookings
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6">
        <div aria-hidden className="schematic schematic-fade absolute inset-0" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2 pb-2">
              <StatusBadge status={booking.status} />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {booking.reference}
              </span>
            </div>

            <h1 className="font-display text-display-sm uppercase text-enamel">{title}</h1>

            <p className="pt-1.5 text-sm text-steel">
              {booking.shop?.slug ? (
                <Link href={`/expert/${booking.shop.slug}`} className="hover:text-signal">
                  {booking.shop.shop_name}
                </Link>
              ) : (
                (booking.shop?.shop_name ?? "Shop removed")
              )}
            </p>

            <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
              {statusExplainer(booking.status, "customer")}
            </p>
          </div>

          {thread ? (
            <div className="flex shrink-0 flex-wrap items-center gap-2">
              <Button asChild variant="outline" size="sm">
                <Link href={`/dashboard/messages/${thread.id}`}>
                  <MessagesSquare aria-hidden />
                  Message the shop
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <section>
            <h2 className="pb-3 font-display text-lg uppercase tracking-wide text-enamel">
              Timeline
            </h2>
            <BookingTimeline events={booking.events} now={now} timeZone={timeZone} />
          </section>

          {booking.device_details?.trim() || booking.customer_notes?.trim() ? (
            <Panel title="The job" icon={Wrench}>
              <dl className="flex flex-col gap-4">
                {booking.device_details?.trim() ? (
                  <Field label="Device">
                    <span className="whitespace-pre-wrap break-words leading-relaxed">
                      {booking.device_details}
                    </span>
                  </Field>
                ) : null}

                {booking.customer_notes?.trim() ? (
                  <Field label="Your notes">
                    <span className="whitespace-pre-wrap break-words leading-relaxed text-steel">
                      {booking.customer_notes}
                    </span>
                  </Field>
                ) : null}
              </dl>
            </Panel>
          ) : null}

          {booking.cancellation_reason?.trim() ? (
            <Panel title="Reason given">
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-steel">
                {booking.cancellation_reason}
              </p>
            </Panel>
          ) : null}

          {booking.attachments.length > 0 ? (
            <Panel title="Photos" icon={Paperclip}>
              <div className="grid gap-2 sm:grid-cols-3">
                {booking.attachments.map((item) => (
                  <AttachmentTile
                    key={item.id}
                    item={item}
                    url={signed.get(item.storagePath) ?? null}
                  />
                ))}
              </div>
            </Panel>
          ) : null}
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-2">
          {actions.length > 0 || canReschedule || showCalendar ? (
            <Panel title="What you can do">
              <div className="flex flex-col gap-3">
                <BookingActions
                  bookingId={booking.id}
                  reference={booking.reference}
                  actions={actions}
                />

                {canReschedule ? (
                  <RescheduleDialog
                    bookingId={booking.id}
                    timeZone={timeZone}
                    durationMinutes={durationMinutes}
                    defaultLocal={start ? localInputValue(start, timeZone) : undefined}
                    minLocal={localInputValue(now, timeZone)}
                    zoneLabel={timeZone.replace(/_/g, " ")}
                  />
                ) : null}

                {showCalendar && start && end ? (
                  <AddToCalendar
                    reference={booking.reference}
                    summary={`${title} — ${booking.shop?.shop_name ?? "Repair"}`}
                    start={start}
                    end={end}
                    location={
                      booking.delivery_mode === "in_shop"
                        ? (booking.shop?.address ?? null)
                        : lines.join(", ")
                    }
                    description={`Booking ${booking.reference}. ${DELIVERY_MODE_LABELS[booking.delivery_mode]}.`}
                  />
                ) : null}
              </div>
            </Panel>
          ) : null}

          <Panel title="Appointment">
            <dl className="flex flex-col gap-4">
              <Field label="Slot">
                {start && end ? (
                  <span className="font-mono tabular-nums">
                    {formatSlot(start, end, timeZone)}
                  </span>
                ) : (
                  <span className="text-steel">No time agreed yet</span>
                )}
              </Field>

              <Field label="Runs for">
                <span className="font-mono tabular-nums">
                  {formatDuration(durationMinutes)}
                </span>
              </Field>

              <Field label="How">
                <span className="flex items-center gap-2">
                  <ModeIcon aria-hidden className="size-4 shrink-0 text-steel-soft" />
                  {DELIVERY_MODE_LABELS[booking.delivery_mode]}
                </span>
              </Field>

              <Field label={booking.delivery_mode === "in_shop" ? "Shop address" : "Address"}>
                {booking.delivery_mode === "in_shop" ? (
                  <span className="flex items-start gap-2">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
                    <span className="leading-relaxed">
                      {booking.shop?.address ?? "Address unavailable"}
                    </span>
                  </span>
                ) : lines.length > 0 ? (
                  <span className="flex items-start gap-2">
                    <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
                    <span className="leading-relaxed">
                      {lines.map((line) => (
                        <span key={line} className="block">
                          {line}
                        </span>
                      ))}
                    </span>
                  </span>
                ) : (
                  <span className="text-steel">No address on this booking</span>
                )}
              </Field>
            </dl>
          </Panel>

          <Panel title="Cost" icon={Receipt}>
            {servicePence !== null && totalPence !== null ? (
              <>
                <CostBreakdown
                  servicePence={servicePence}
                  platformFeePence={booking.platform_fee}
                  taxPence={booking.tax_amount}
                  totalPence={totalPence}
                  currency={booking.currency}
                />

                {booking.final_amount === null && booking.quoted_amount !== null ? (
                  <p className="pt-3 text-xs leading-relaxed text-steel">
                    This is the quote. The final figure is set when the shop marks the
                    repair complete.
                  </p>
                ) : null}

                <div className="pt-4">
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <Link href={`/dashboard/billing/${booking.reference}`}>View invoice</Link>
                  </Button>
                </div>
              </>
            ) : (
              <p className="text-sm leading-relaxed text-steel">
                No price agreed yet. The shop sends a quote once they have looked at what
                you have described.
              </p>
            )}
          </Panel>

          <Panel title="Warranty" icon={ShieldCheck}>
            {booking.warranty_expires_at ? (
              warrantyOpen ? (
                <div className="flex flex-col gap-2">
                  <p className="font-mono text-2xl leading-none tabular-nums text-verdigris">
                    {daysUntil(booking.warranty_expires_at, now)}
                    <span className="pl-2 font-sans text-sm text-steel">days left</span>
                  </p>
                  <p className="text-sm leading-relaxed text-steel">
                    Covered until {formatDateLong(booking.warranty_expires_at, timeZone)}. If
                    the fault comes back inside the window, raise a claim.
                  </p>
                  <Button asChild variant="outline" size="sm" className="mt-1 w-full">
                    <Link
                      href={`/dashboard/warranty/new?booking=${encodeURIComponent(booking.reference)}`}
                    >
                      Raise a claim
                    </Link>
                  </Button>
                </div>
              ) : (
                <p className="text-sm leading-relaxed text-steel">
                  The warranty on this repair closed on{" "}
                  {formatDateLong(booking.warranty_expires_at, timeZone)}.
                </p>
              )
            ) : (
              <p className="text-sm leading-relaxed text-steel">
                {booking.warranty_days > 0
                  ? `${booking.warranty_days} days of cover start the moment the shop marks this repair complete.`
                  : "No warranty is recorded on this booking."}
              </p>
            )}
          </Panel>

          <Panel title="Shop">
            <dl className="flex flex-col gap-4">
              <Field label="Name">
                {booking.shop?.slug ? (
                  <Link href={`/expert/${booking.shop.slug}`} className="hover:text-signal">
                    {booking.shop.shop_name}
                  </Link>
                ) : (
                  (booking.shop?.shop_name ?? "Shop removed")
                )}
              </Field>

              {booking.shop?.contact_phone ? (
                <Field label="Phone">
                  <a
                    href={`tel:${booking.shop.contact_phone}`}
                    className="font-mono tabular-nums hover:text-signal"
                  >
                    {booking.shop.contact_phone}
                  </a>
                </Field>
              ) : null}

              <Field label="Reference">
                <span className="font-mono uppercase tracking-[0.08em]">
                  {booking.reference}
                </span>
              </Field>
            </dl>

            <div className="pt-4">
              {thread ? (
                <Button asChild variant="outline" size="sm" className="w-full">
                  <Link href={`/dashboard/messages/${thread.id}`}>
                    <MessagesSquare aria-hidden />
                    Open the thread
                  </Link>
                </Button>
              ) : (
                <p className="text-xs leading-relaxed text-steel-soft">
                  Messaging is unavailable for this booking right now.
                </p>
              )}
            </div>
          </Panel>
        </aside>
      </div>
    </div>
  );
}
