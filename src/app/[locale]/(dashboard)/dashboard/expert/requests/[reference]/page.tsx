import type { ReactNode } from "react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { Metadata } from "next";
import {
  ArrowLeft,
  Building2,
  Camera,
  Car,
  History,
  Home,
  MapPin,
  NotebookPen,
  Phone,
  Receipt,
  Star,
  User,
  Wrench,
} from "lucide-react";

import { AttachmentGallery } from "@/components/dashboard/attachment-gallery";
import { BillForm } from "@/components/dashboard/expert/bill-form";
import {
  PrivateNoteEditor,
  RequestActions,
} from "@/components/dashboard/expert/request-actions";
import {
  RequestExpiry,
  WaitingTime,
  addressLines,
  buildPricingIndex,
} from "@/components/dashboard/expert/request-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { UserAvatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { slotEnd, slotStart, statusExplainer } from "@/lib/bookings/actions-map";
import { getMyShop } from "@/lib/dashboard/claims";
import {
  getBillForBooking,
  getBookingNote,
  getClient,
  listExpertBookings,
  listPendingRequests,
  listShopServices,
} from "@/lib/dashboard/expert";
import {
  formatDateTime,
  formatDay,
  formatDuration,
  formatMoney,
  formatPriceRange,
  formatRelative,
  formatSlot,
} from "@/lib/format";
import {
  attachmentHrefs,
  listBookingAttachments,
} from "@/lib/attachments/server";
import { createClient } from "@/lib/supabase/server";
import {
  BOOKING_STATUS_LABELS,
  DELIVERY_MODE_LABELS,
  type DeliveryMode,
} from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Request",
  robots: { index: false, follow: false },
};

const MODE_ICON: Record<DeliveryMode, typeof Building2> = {
  in_shop: Building2,
  home_visit: Home,
  pickup_drop: Car,
};

const NEEDS_ADDRESS: readonly DeliveryMode[] = ["home_visit", "pickup_drop"];

/** How many of the customer's earlier jobs to list before it becomes a report. */
const HISTORY_SHOWN = 4;

interface CustomerRating {
  rating: number;
  text: string | null;
  createdAt: string;
}

/**
 * What this customer scored the shop, if they have ever reviewed it.
 *
 * Read here rather than through `expert.ts` because `reviews` predates the
 * marketplace tables and no expert-side read covers it; the unique constraint on
 * `(fixer_id, customer_id)` is what makes `maybeSingle` correct. Degrades to
 * null on any failure — a missing star rating must not take down the screen the
 * shop answers its work on.
 */
async function readCustomerRating(
  fixerId: string,
  customerId: string,
): Promise<CustomerRating | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("reviews")
    .select("rating, text, created_at")
    .eq("fixer_id", fixerId)
    .eq("customer_id", customerId)
    .maybeSingle<{ rating: number; text: string | null; created_at: string }>();

  if (error) {
    console.error("[dashboard] expert customer rating failed", error.message);
    return null;
  }

  return data
    ? { rating: data.rating, text: data.text, createdAt: data.created_at }
    : null;
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

/** A counted figure with its label. Mono, because the number is the point. */
function Metric({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-machined bg-bench-sunk px-3 py-2.5">
      <p className="font-mono text-lg leading-none tabular-nums text-enamel">{value}</p>
      <p className="pt-1.5 text-xs text-steel">{label}</p>
    </div>
  );
}

/**
 * One request, in full, with the three answers beside it.
 *
 * Deliberately not restricted to `requested` bookings. A shop that accepts or
 * declines from here is left on this URL, and a page that 404s the moment it is
 * used would be worse than no page — so the lookup covers recent bookings too
 * and the actions simply narrow to whatever is still legal.
 */
export default async function ExpertRequestDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/requests");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const { reference } = await params;
  const wanted = decodeURIComponent(reference).trim().toUpperCase();

  const now = new Date();

  // Two lists rather than a keyed read: `expert.ts` has no by-reference lookup,
  // and these two between them cover both the case this page is normally opened
  // in (a pending request, however old) and the case it is left in (a booking
  // just answered, so recent). Both are already scoped to this shop by RLS.
  const [pending, recent, services] = await Promise.all([
    listPendingRequests(shop.id),
    listExpertBookings(shop.id, { limit: 200 }),
    listShopServices(shop.id),
  ]);

  const matches = (candidate: { reference: string }) =>
    candidate.reference.toUpperCase() === wanted;

  const booking = pending.find(matches) ?? recent.find(matches);

  // Null covers "no such reference", "not this shop's", "RLS said no" and "the
  // migration has not been run". All four are a 404 here: anything more specific
  // would confirm which references exist.
  if (!booking) notFound();

  const [note, client, rating, attachments] = await Promise.all([
    getBookingNote(booking.id),
    getClient(shop.id, booking.customer_id),
    readCustomerRating(shop.id, booking.customer_id),
    listBookingAttachments(booking.id),
  ]);

  // Served from this origin by `/dashboard/attachments/booking/[id]`, which
  // re-authorises per request through `is_booking_party` — so the shop sees the
  // customer's fault photos without a Supabase token ever reaching the browser.
  const attachmentUrls = attachmentHrefs("booking", attachments);

  /*
   * The bill on this job, if one has been filed.
   *
   * Read here rather than inside the form because the form is a client component
   * and this decides which of two things it renders — a field to fill in, or the
   * state of what was already filed. Only fetched once the job is billable, so a
   * request still waiting on an answer costs no extra round-trip.
   */
  const billable = ["completed", "closed", "disputed"].includes(booking.status);
  const bill = billable ? await getBillForBooking(booking.id) : null;

  const pricing = booking.service_id
    ? (buildPricingIndex(services).get(booking.service_id) ?? null)
    : null;

  const start = slotStart(booking.slot);
  const end = slotEnd(booking.slot);
  const durationMinutes =
    start && end
      ? Math.max(15, Math.round((end.getTime() - start.getTime()) / 60000))
      : (booking.service?.duration_minutes ?? 60);

  const customerName = booking.customer?.display_name ?? "A customer";
  const lines = addressLines(booking);
  const ModeIcon = MODE_ICON[booking.delivery_mode];

  // Everything except the job being looked at. `getClient` counts every booking
  // this customer has ever made here, cancellations included, so the figure has
  // to lose one to answer "have I done work for them before".
  const earlier = (client?.bookings ?? []).filter((row) => row.id !== booking.id);
  const earlierFinished = earlier.filter(
    (row) => row.status === "completed" || row.status === "closed",
  ).length;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/dashboard/expert/requests"
          className="inline-flex items-center gap-1.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel hover:text-signal"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All requests
        </Link>
      </div>

      <header className="relative overflow-hidden rounded-machined border border-hairline bg-chalk px-5 py-6 shadow-bench sm:px-6">
        <div aria-hidden className="schematic schematic-fade absolute inset-0" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2 pb-2">
              <StatusBadge status={booking.status} />
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {booking.reference}
              </span>
            </div>

            <h1 className="font-display text-display-sm uppercase text-enamel">
              {booking.service?.name ?? "Repair request"}
            </h1>

            <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
              {statusExplainer(booking.status, "shop")}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
            {booking.status === "requested" ? (
              <WaitingTime
                requestedAt={booking.requested_at}
                now={now}
                timezone={shop.timezone}
              />
            ) : (
              <span className="text-xs text-steel">
                Requested {formatRelative(booking.requested_at, now)}
              </span>
            )}
            {booking.expires_at ? (
              <RequestExpiry
                expiresAt={booking.expires_at}
                now={now}
                timezone={shop.timezone}
              />
            ) : null}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="flex flex-col gap-6 lg:col-span-3">
          <Panel title="What they need" icon={Wrench}>
            <dl className="flex flex-col gap-4">
              <Field label="Device and fault">
                {booking.device_details?.trim() ? (
                  <span className="whitespace-pre-wrap break-words leading-relaxed">
                    {booking.device_details}
                  </span>
                ) : (
                  <span className="text-steel">Nothing described</span>
                )}
              </Field>

              {booking.customer_notes?.trim() ? (
                <Field label="What they wrote">
                  <span className="block whitespace-pre-wrap break-words rounded-machined bg-bench-sunk px-3 py-2.5 leading-relaxed text-steel">
                    {booking.customer_notes}
                  </span>
                </Field>
              ) : null}

              <Field label="Service">
                {booking.service?.name ?? "Not specified"}
                {pricing ? (
                  <span className="block pt-1 text-xs text-steel">
                    Listed{" "}
                    {formatPriceRange(
                      pricing.priceType,
                      pricing.minPence,
                      pricing.maxPence,
                      pricing.currency,
                    )}
                    {" · "}
                    {formatDuration(booking.service?.duration_minutes ?? durationMinutes)}
                  </span>
                ) : null}
              </Field>
            </dl>
          </Panel>

          {attachments.length > 0 ? (
            <Panel title="Photos of the fault" icon={Camera}>
              <AttachmentGallery
                items={attachments.filter((item) => item.kind === "fault")}
                hrefs={attachmentUrls}
                emptyLabel="No fault photos attached."
              />
              {attachments.some((item) => item.kind === "completion") ? (
                <div className="pt-4">
                  <p className="eyebrow pb-2">After the repair</p>
                  <AttachmentGallery
                    items={attachments.filter((item) => item.kind === "completion")}
                    hrefs={attachmentUrls}
                    emptyLabel="No completion photos."
                  />
                </div>
              ) : null}
            </Panel>
          ) : null}

          <Panel title="When and where">
            <dl className="grid gap-4 sm:grid-cols-2">
              <Field label="Slot they asked for">
                {start && end ? (
                  <span className="font-mono tabular-nums">
                    {formatSlot(start, end, shop.timezone)}
                  </span>
                ) : (
                  <span className="text-steel">Flexible</span>
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

              <Field label="Sent">
                <span className="font-mono tabular-nums">
                  {formatDateTime(booking.requested_at, shop.timezone)}
                </span>
              </Field>

              {NEEDS_ADDRESS.includes(booking.delivery_mode) ? (
                <div className="sm:col-span-2">
                  <dt className="eyebrow pb-1">Address</dt>
                  <dd className="text-sm text-enamel">
                    {lines.length > 0 ? (
                      <span className="flex items-start gap-2">
                        <MapPin
                          aria-hidden
                          className="mt-0.5 size-4 shrink-0 text-steel-soft"
                        />
                        <span className="leading-relaxed">
                          {lines.map((line) => (
                            <span key={line} className="block">
                              {line}
                            </span>
                          ))}
                        </span>
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-rust">
                        <MapPin aria-hidden className="size-4 shrink-0" />
                        No address on this request — ask before you accept
                      </span>
                    )}
                  </dd>
                </div>
              ) : null}
            </dl>

            {/* Every time on this page is the shop's own clock, never the
                browser's — a job at 09:00 must read 09:00 to the person who has
                to be there for it, wherever they open this. */}
            <p className="pt-4 text-xs text-steel-soft">
              Times shown in {shop.timezone.replace(/_/g, " ")}, your shop&apos;s clock.
            </p>
          </Panel>

          <Panel title="Private note" icon={NotebookPen}>
            <PrivateNoteEditor
              bookingId={booking.id}
              fixerId={shop.id}
              note={note ? { body: note.body, updatedAt: note.updated_at } : null}
              timezone={shop.timezone}
            />
          </Panel>
        </div>

        <aside className="flex flex-col gap-6 lg:col-span-2">
          {/*
            Above "Your answer" once the job is done, because at that point filing
            the bill IS the answer — the transition buttons have nothing left to
            offer on a completed job.
          */}
          {billable ? (
            <Panel title="Bill and rebate" icon={Receipt}>
              <BillForm
                bookingId={booking.id}
                quotedMinor={booking.final_amount ?? booking.quoted_amount}
                currency={booking.currency}
                existing={bill}
              />
            </Panel>
          ) : null}

          <Panel title="Your answer">
            <RequestActions
              bookingId={booking.id}
              status={booking.status}
              slot={booking.slot}
              warrantyExpiresAt={booking.warranty_expires_at}
              pricing={pricing}
              serviceName={booking.service?.name ?? null}
              deviceDetails={booking.device_details}
              timezone={shop.timezone}
              durationMinutes={durationMinutes}
              now={now}
              stacked
            />

            {booking.quoted_amount !== null ? (
              <p className="pt-4 text-xs leading-relaxed text-steel">
                Quoted{" "}
                <span className="font-mono tabular-nums text-enamel">
                  {formatMoney(booking.quoted_amount, booking.currency)}
                </span>
                {booking.responded_at
                  ? `, ${formatRelative(booking.responded_at, now)}.`
                  : "."}
              </p>
            ) : null}
          </Panel>

          <Panel title="Customer" icon={User}>
            <div className="flex items-center gap-3">
              <UserAvatar
                src={booking.customer?.avatar_url}
                name={customerName}
                size="lg"
              />
              <div className="min-w-0">
                <p className="truncate font-display text-base uppercase tracking-wide text-enamel">
                  {customerName}
                </p>
                {booking.customer?.full_name &&
                booking.customer.full_name !== customerName ? (
                  <p className="truncate pt-0.5 text-xs text-steel">
                    {booking.customer.full_name}
                  </p>
                ) : null}
              </div>
            </div>

            {booking.customer?.phone ? (
              <p className="pt-4">
                <a
                  href={`tel:${booking.customer.phone}`}
                  className="inline-flex items-center gap-2 font-mono tabular-nums text-sm text-enamel hover:text-signal"
                >
                  <Phone aria-hidden className="size-4 text-steel-soft" />
                  {booking.customer.phone}
                </a>
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-2 pt-4">
              <Metric
                value={String(earlier.length)}
                label={earlier.length === 1 ? "earlier booking" : "earlier bookings"}
              />
              <Metric
                value={String(earlierFinished)}
                label={earlierFinished === 1 ? "job finished" : "jobs finished"}
              />
            </div>

            {client && client.totalSpentPence > 0 ? (
              <p className="pt-3 text-xs text-steel">
                Spent{" "}
                <span className="font-mono tabular-nums text-enamel">
                  {formatMoney(client.totalSpentPence)}
                </span>{" "}
                with you across finished work.
              </p>
            ) : null}

            {rating ? (
              <div className="mt-4 rounded-machined border border-hairline bg-bench px-3 py-2.5">
                <p className="flex items-center gap-1.5 text-sm">
                  <Star aria-hidden className="size-3.5 text-signal" />
                  <span className="font-mono tabular-nums text-enamel">
                    {rating.rating}/5
                  </span>
                  <span className="text-xs text-steel">
                    left {formatDay(rating.createdAt, shop.timezone)}
                  </span>
                </p>
                {rating.text ? (
                  <p className="pt-1.5 text-xs leading-relaxed text-steel">
                    &ldquo;{rating.text}&rdquo;
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="pt-3 text-xs leading-relaxed text-steel-soft">
                {earlier.length > 0
                  ? "They have not reviewed your shop."
                  : "First time booking with you."}
              </p>
            )}

            <div className="pt-4">
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/dashboard/expert/clients">Your client book</Link>
              </Button>
            </div>
          </Panel>

          {earlier.length > 0 ? (
            <Panel title="History with you" icon={History}>
              <ul className="flex flex-col gap-2">
                {earlier.slice(0, HISTORY_SHOWN).map((row) => {
                  const rowStart = slotStart(row.slot);
                  return (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-machined bg-bench-sunk px-3 py-2"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm text-enamel">
                          {row.service?.name ?? "Repair"}
                        </span>
                        <span className="block pt-0.5 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                          {rowStart
                            ? formatDay(rowStart, shop.timezone)
                            : formatDay(row.created_at, shop.timezone)}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-steel">
                        {BOOKING_STATUS_LABELS[row.status]}
                      </span>
                    </li>
                  );
                })}
              </ul>

              {earlier.length > HISTORY_SHOWN ? (
                <p className="pt-3 text-xs text-steel-soft">
                  <span className="font-mono tabular-nums">
                    {earlier.length - HISTORY_SHOWN}
                  </span>{" "}
                  more in your client book.
                </p>
              ) : null}
            </Panel>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
