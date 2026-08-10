import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Inbox, Wrench } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  QuotedRow,
  RequestCard,
  buildPricingIndex,
} from "@/components/dashboard/expert/request-card";
import { PageHeader, SectionHeader } from "@/components/dashboard/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import {
  listExpertBookings,
  listPendingRequests,
  listShopServices,
} from "@/lib/dashboard/expert";

export const metadata: Metadata = {
  title: "Requests",
  robots: { index: false, follow: false },
};

/**
 * The queue of requests nobody has answered.
 *
 * The most valuable screen in the shop dashboard, because it is the only one
 * where the shop is the bottleneck. Everything on it serves one question — which
 * of these is costing me a customer right now — which is why the order is oldest
 * first and why the waiting time is the loudest thing on each card.
 *
 * Three reads, in parallel:
 *   • the queue itself, already sorted oldest-first by `listPendingRequests`;
 *   • the quotes sent but not yet accepted, which is where an answered request
 *     goes to be forgotten about;
 *   • the catalogue, because a request carries no price until somebody sets one
 *     and the Accept button behaves differently for a fixed price than for one
 *     quoted on inspection.
 *
 * `now` is captured once and threaded down so the waiting times, the expiry
 * countdowns and the action gating cannot disagree about the instant.
 */
export default async function ExpertRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/requests");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this narrows rather than re-queries. A null shop cannot reach here — the
  // gate renders the claim screen in place of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();

  const [requests, quoted, services] = await Promise.all([
    listPendingRequests(shop.id),
    listExpertBookings(shop.id, { statuses: ["accepted"], limit: 20 }),
    listShopServices(shop.id),
  ]);

  const pricing = buildPricingIndex(services);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={shop.shopName}
        title="Requests"
        description={
          requests.length > 0
            ? "Oldest first. The one at the top has waited longest, and it is the one most likely to go somewhere else."
            : "Every booking request lands here first, oldest at the top, and waits for you to accept, quote or decline it."
        }
        actions={
          <Button asChild variant="outline" size="sm">
            <Link href="/dashboard/expert/schedule">
              <CalendarClock aria-hidden />
              Schedule
            </Link>
          </Button>
        }
      />

      <section>
        <SectionHeader
          title="Needs your answer"
          action={
            requests.length > 0 ? (
              <Badge variant="signal">
                <span className="font-mono tabular-nums">{requests.length}</span>
                waiting
              </Badge>
            ) : null
          }
        />

        {requests.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="Nothing is waiting on you"
            description="Every request has an answer. New ones arrive here the moment a customer sends them, and you will get a notification."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/dashboard/expert/schedule">
                  <CalendarClock aria-hidden />
                  Open your schedule
                </Link>
              </Button>
            }
          />
        ) : (
          <ol className="flex flex-col gap-3">
            {requests.map((request) => (
              <RequestCard
                key={request.id}
                request={request}
                pricing={
                  request.service_id ? (pricing.get(request.service_id) ?? null) : null
                }
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ol>
        )}
      </section>

      {quoted.length > 0 ? (
        <section>
          <SectionHeader
            title="Waiting on the customer"
            action={
              <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                {quoted.length} quoted
              </span>
            }
          />
          <ul className="flex flex-col gap-2">
            {quoted.map((booking) => (
              <QuotedRow
                key={booking.id}
                booking={booking}
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ul>
          <p className="pt-3 text-xs leading-relaxed text-steel">
            These have your price and are with the customer. The slot is not held until
            they accept, so nothing here is on your schedule yet.
          </p>
        </section>
      ) : null}

      {services.length === 0 ? (
        <section className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
          <h2 className="eyebrow flex items-center gap-2">
            <Wrench aria-hidden className="size-3.5" />
            Your catalogue is empty
          </h2>
          <p className="max-w-prose pt-2 text-sm leading-relaxed text-steel">
            Requests can still reach you, but without a service to price them against every
            one has to be quoted by hand. Adding what you do — and what it costs — is the
            fastest way to answer a request in one press.
          </p>
          <div className="pt-4">
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/expert/services">
                <Inbox aria-hidden />
                Add a service
              </Link>
            </Button>
          </div>
        </section>
      ) : null}
    </div>
  );
}
