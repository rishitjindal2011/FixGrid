import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { CalendarClock, CheckCircle2, Inbox, Wrench } from "lucide-react";

import { EmptyState } from "@/components/dashboard/empty-state";
import {
  ConfirmedRow,
  QuotedRow,
  RequestCard,
  InProgressRow,
  CompletedReviewRow,
  RevisionRequestRow,
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
};

export default async function ExpertRequestsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/requests");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const now = new Date();

  const [requests, inProgress, confirmed, completed, disputed, quoted, services] = await Promise.all([
    listPendingRequests(shop.id),
    listExpertBookings(shop.id, { statuses: ["in_progress"], limit: 30 }),
    listExpertBookings(shop.id, { statuses: ["confirmed"], limit: 20 }),
    listExpertBookings(shop.id, { statuses: ["completed"], limit: 20 }),
    listExpertBookings(shop.id, { statuses: ["disputed"], limit: 20 }),
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

      {/* 1. Action Needed: Customer Revision / Dispute */}
      {disputed.length > 0 ? (
        <section>
          <SectionHeader
            title="Action required: Customer revision / Dispute"
            action={
              <Badge variant="signal" className="bg-rose-500 text-white">
                <span className="font-mono tabular-nums">{disputed.length}</span>
                attention
              </Badge>
            }
          />
          <ul className="flex flex-col gap-3">
            {disputed.map((booking) => (
              <RevisionRequestRow
                key={booking.id}
                booking={booking}
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ul>
        </section>
      ) : null}

      {/* 2. On the Bench (In Progress) */}
      {inProgress.length > 0 ? (
        <section>
          <SectionHeader
            title="On the bench (In Progress)"
            action={
              <Badge variant="signal" className="bg-[#ea580c] text-white">
                <span className="font-mono tabular-nums">{inProgress.length}</span>
                active on bench
              </Badge>
            }
          />
          <ul className="flex flex-col gap-3">
            {inProgress.map((booking) => (
              <InProgressRow
                key={booking.id}
                booking={booking}
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ul>
          <p className="pt-3 text-xs leading-relaxed text-steel">
            Work underway. When finished, click <strong>Complete Work</strong> to verify the final bill and send it to the customer for review and payment.
          </p>
        </section>
      ) : null}

      {/* 3. Needs your answer (New Requests) */}
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

      {/* 4. Ready to start */}
      {confirmed.length > 0 ? (
        <section>
          <SectionHeader
            title="Ready to start"
            action={
              <Badge variant="verified">
                <span className="font-mono tabular-nums">{confirmed.length}</span>
                confirmed
              </Badge>
            }
          />
          <ul className="flex flex-col gap-2">
            {confirmed.map((booking) => (
              <ConfirmedRow
                key={booking.id}
                booking={booking}
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ul>
          <p className="pt-3 text-xs leading-relaxed text-steel">
            The customer has accepted your price and the slot is yours. Click <strong>Start work</strong> when the device is placed on the bench.
          </p>
        </section>
      ) : null}

      {/* 5. Work completed — Awaiting customer review & payment */}
      {completed.length > 0 ? (
        <section>
          <SectionHeader
            title="Work completed — Awaiting customer review & payment"
            action={
              <Badge variant="verified">
                <span className="font-mono tabular-nums">{completed.length}</span>
                completed
              </Badge>
            }
          />
          <ul className="flex flex-col gap-2">
            {completed.map((booking) => (
              <CompletedReviewRow
                key={booking.id}
                booking={booking}
                timezone={shop.timezone}
                now={now}
              />
            ))}
          </ul>
          <p className="pt-3 text-xs leading-relaxed text-steel">
            Customer has received the completion notice. Once they review and pay, your workshop wallet balance will be credited directly with your 5% Shop Pro cashback rebate.
          </p>
        </section>
      ) : null}

      {/* 6. Waiting on the customer */}
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
