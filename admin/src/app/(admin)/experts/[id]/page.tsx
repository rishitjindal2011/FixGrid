import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ArrowLeft, ExternalLink } from "lucide-react";

import { PageHeader } from "@/components/admin/page-header";
import { StatTile } from "@/components/admin/stat-tile";
import { VerifyToggle } from "@/components/admin/verify-toggle";
import { SuspendShopDialog } from "@/components/admin/suspend-shop-dialog";
import { SendNoticeDialog } from "@/components/admin/send-notice-dialog";
import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/auth/session";
import { getExpert } from "@/lib/queries/experts";
import { formatDuration, formatMoney, formatPriceRange, formatRelative } from "@/lib/format";
import type { BookingStatus } from "@/lib/types/marketplace";

export const metadata: Metadata = {
  title: "Expert",
  robots: { index: false, follow: false },
};

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

const STATUS_VARIANT: Partial<Record<BookingStatus, "neutral" | "verified" | "signal" | "danger">> = {
  requested: "signal",
  accepted: "signal",
  in_progress: "signal",
  completed: "verified",
  closed: "neutral",
  disputed: "danger",
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1 border-b border-hairline py-2.5 last:border-b-0 sm:flex-row sm:items-baseline sm:gap-4">
      <dt className="eyebrow w-36 shrink-0 text-steel">{label}</dt>
      <dd className="text-sm text-enamel">{children}</dd>
    </div>
  );
}

export default async function ExpertDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [expert, session] = await Promise.all([getExpert(id), getSession()]);
  if (!expert) notFound();

  const canEditShop = session !== null && session.role !== "viewer";

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Link
          href="/experts"
          className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel transition-colors hover:text-enamel"
        >
          <ArrowLeft aria-hidden className="size-3.5" />
          All experts
        </Link>
      </div>

      <PageHeader
        eyebrow={expert.verified ? <Badge variant="verified">Verified</Badge> : "Unverified"}
        title={expert.shopName}
        description={expert.address}
        actions={
          expert.slug ? (
            <a
              href={`${SITE_URL}/expert/${expert.slug}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-signal hover:underline"
            >
              Public page
              <ExternalLink aria-hidden className="size-3.5" />
            </a>
          ) : null
        }
      />

      {expert.ownerId === null ? (
        <p className="flex items-start gap-2 rounded-machined border border-signal/30 bg-signal-wash px-4 py-3 text-sm text-enamel">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <span>
            This shop is unclaimed, so no one can accept a booking for it. It still appears in
            search and can receive requests, which will go unanswered until someone claims it.
          </span>
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-4">
        <StatTile label="Jobs" value={String(expert.bookingCount)} />
        <StatTile label="Revenue" value={formatMoney(expert.grossPence)} />
        <StatTile
          label="Rating"
          value={expert.ratingCount > 0 ? expert.ratingAvg.toFixed(1) : "—"}
          hint={expert.ratingCount > 0 ? `${expert.ratingCount} reviews` : "No reviews"}
        />
        <StatTile label="Services" value={String(expert.serviceCount)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_18rem]">
        <div className="flex flex-col gap-6">
          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-2 font-display text-sm uppercase tracking-wide text-enamel">
              Profile
            </h2>
            <dl>
              <Field label="Owner">
                {expert.ownerId ? (
                  <Link href={`/customers/${expert.ownerId}`} className="hover:text-signal">
                    {expert.ownerName}
                  </Link>
                ) : (
                  <Badge variant="signal">Unclaimed</Badge>
                )}
              </Field>
              <Field label="Accepts bookings">
                {expert.acceptsBookings ? "Yes" : <span className="text-rust">No</span>}
              </Field>
              <Field label="Timezone">
                <span className="font-mono text-xs">{expert.timezone}</span>
              </Field>
              <Field label="Phone">
                {expert.contactPhone ? (
                  <span className="font-mono">{expert.contactPhone}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
              <Field label="Email">
                {expert.contactEmail ? (
                  <span className="font-mono text-xs">{expert.contactEmail}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
              <Field label="Opening hours">
                {expert.workingDays.length > 0 ? (
                  <span className="font-mono text-xs">
                    {expert.workingDays.join(", ")} · {expert.openingTime ?? "?"}–
                    {expert.closingTime ?? "?"}
                  </span>
                ) : (
                  <span className="text-steel">Not set</span>
                )}
              </Field>
              <Field label="Bio">
                {expert.bio ? (
                  <span className="whitespace-pre-wrap">{expert.bio}</span>
                ) : (
                  <span className="text-steel">—</span>
                )}
              </Field>
            </dl>
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
              Services
            </h2>
            {expert.services.length === 0 ? (
              <p className="text-sm text-steel">
                No services. A shop with an empty catalogue cannot be booked — customers book a
                service, not a shop.
              </p>
            ) : (
              <ul className="flex flex-col gap-2">
                {expert.services.map((service) => (
                  <li
                    key={service.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
                  >
                    <span className="flex flex-col">
                      <span className="text-sm text-enamel">
                        {service.name}
                        {!service.is_active ? (
                          <span className="ml-2 text-xs text-steel-soft">(inactive)</span>
                        ) : null}
                      </span>
                      <span className="font-mono text-xs text-steel">
                        {formatDuration(service.duration_minutes)}
                      </span>
                    </span>
                    <span className="font-mono text-sm text-enamel">
                      {formatPriceRange(
                        service.price_type,
                        service.price_min,
                        service.price_max,
                        service.currency,
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
              Recent bookings
            </h2>
            {expert.recentBookings.length === 0 ? (
              <p className="text-sm text-steel">No bookings yet.</p>
            ) : (
              <ul className="flex flex-col gap-2">
                {expert.recentBookings.map((booking) => (
                  <li
                    key={booking.id}
                    className="flex flex-wrap items-center justify-between gap-3 border-b border-hairline pb-2 last:border-b-0 last:pb-0"
                  >
                    <Link
                      href={`/bookings/${booking.reference}`}
                      className="font-mono text-xs text-enamel hover:text-signal"
                    >
                      {booking.reference}
                    </Link>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-steel">
                        {formatRelative(booking.createdAt)}
                      </span>
                      <span className="font-mono text-sm text-enamel">
                        {formatMoney(booking.amountPence)}
                      </span>
                      <Badge variant={STATUS_VARIANT[booking.status] ?? "neutral"}>
                        {booking.status}
                      </Badge>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <aside className="flex flex-col gap-4">
          <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
            <h2 className="mb-3 font-display text-sm uppercase tracking-wide text-enamel">
              Verification
            </h2>
            {canEditShop ? (
              <VerifyToggle fixerId={expert.id} verified={expert.verified} />
            ) : (
              <p className="text-sm text-steel">
                Viewer access — verification needs editor access.
              </p>
            )}
          </div>

          <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench flex flex-col gap-3">
            <h2 className="font-display text-sm uppercase tracking-wide text-enamel">
              Moderation
            </h2>
            {canEditShop ? (
              <div className="flex flex-col gap-2">
                <SendNoticeDialog fixerId={expert.id} />
                {session.role === "owner" ? (
                  <SuspendShopDialog fixerId={expert.id} isSuspended={expert.suspendedAt !== null} />
                ) : (
                  <p className="text-sm text-steel">Owner access needed to suspend.</p>
                )}
              </div>
            ) : (
              <p className="text-sm text-steel">
                Viewer access — moderation needs editor/owner access.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
