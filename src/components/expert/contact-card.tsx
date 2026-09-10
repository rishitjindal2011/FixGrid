"use client";

import Link from "next/link";
import {
  ArrowRight,
  Building2,
  Clock,
  Home,
  Mail,
  MapPin,
  Navigation,
  Phone,
  ShieldCheck,
  Truck,
  Zap,
} from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { WarrantyBadge } from "@/components/warranty-badge";
import { StatusStrip } from "@/components/status-strip";
import { formatClock, resolveWeek, type HoursInput, type ShopStatus } from "@/lib/hours";
import { cn, directionsUrl, telHref } from "@/lib/utils";
import { getZonedNow } from "@/lib/hours";
import type { ExpertProfile } from "@/lib/types/database";

/**
 * The executive booking & contact deck.
 * Everything a customer needs to book a diagnostic or reach the workshop.
 */
export function ContactCard({
  profile,
  hours,
  initialStatus,
  warrantyDays,
}: {
  profile: ExpertProfile;
  hours: HoursInput;
  initialStatus: ShopStatus;
  warrantyDays: number;
}) {
  const t = useTranslations("expert.contact");
  const ts = useTranslations("status");

  const week = resolveWeek(hours);
  const today = getZonedNow(profile.timezone).weekday;

  const services = [
    {
      key: "in_shop",
      label: "In-Shop Lab & Bench",
      icon: Building2,
      offered: profile.offers_in_shop,
    },
    {
      key: "home",
      label: "Home Visit Service",
      icon: Home,
      offered: profile.offers_home_service,
    },
    {
      key: "pickup",
      label: "Pickup & Return Courier",
      icon: Truck,
      offered: profile.offers_pickup_drop,
    },
  ].filter((service) => service.offered);

  const responseHours = (profile as { response_hours?: number }).response_hours ?? 24;

  return (
    <aside className="rounded-2xl border border-hairline bg-chalk shadow-bench overflow-hidden">
      {/* Live Status & Response Telemetry Header */}
      <div className="border-b border-hairline/60 bg-bench/40 p-5">
        <div className="flex items-center justify-between gap-2">
          <StatusStrip hours={hours} size="md" initialStatus={initialStatus} />
          <span className="inline-flex items-center gap-1 rounded bg-enamel/5 border border-enamel/10 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-enamel">
            <Zap className="size-3 text-signal" />
            ~{responseHours}h Response
          </span>
        </div>

        {warrantyDays > 0 ? (
          <div className="mt-3.5">
            <WarrantyBadge days={warrantyDays} variant="line" />
          </div>
        ) : null}

        {/* Action Buttons */}
        <div className="mt-4 flex flex-col gap-2.5">
          <Button
            asChild
            size="lg"
            className="w-full bg-signal hover:bg-signal-lift text-chalk font-display text-sm sm:text-base font-bold uppercase tracking-wider py-6 shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 group"
          >
            <Link href={`/dashboard/discover/${profile.slug}`}>
              <span>Request Diagnostic &amp; Book</span>
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </Button>

          {profile.contact_phone ? (
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full border-hairline font-mono text-xs font-bold uppercase tracking-wider hover:border-signal hover:text-signal transition-colors py-4"
            >
              <a href={telHref(profile.contact_phone)}>
                <Phone className="size-4 text-signal" />
                <span>Call Workshop · {profile.contact_phone}</span>
              </a>
            </Button>
          ) : null}

          {profile.lat !== null && profile.lng !== null ? (
            <Button
              asChild
              variant="ghost"
              size="sm"
              className="w-full text-steel hover:text-signal text-xs font-mono uppercase tracking-wider"
            >
              <a
                href={directionsUrl(profile.lat, profile.lng)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-1.5"
              >
                <Navigation className="size-3.5 text-signal" />
                <span>{t("getDirections")}</span>
              </a>
            </Button>
          ) : null}

          {profile.contact_email ? (
            <Button asChild variant="ghost" size="sm" className="w-full text-steel hover:text-signal text-xs font-mono uppercase tracking-wider">
              <a href={`mailto:${profile.contact_email}`} className="flex items-center justify-center gap-1.5">
                <Mail className="size-3.5 text-steel-soft" />
                <span>{t("emailShop")}</span>
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Escrow Guarantee Highlight */}
      <div className="border-b border-hairline/60 bg-verdigris-wash/60 p-4">
        <div className="flex items-start gap-2.5">
          <ShieldCheck className="size-4 text-verdigris shrink-0 mt-0.5" />
          <div className="text-xs">
            <p className="font-bold text-verdigris uppercase font-mono tracking-wide">
              Smart Escrow Protected
            </p>
            <p className="mt-0.5 text-steel leading-relaxed text-[11px]">
              0% Advance Risk. Your funds remain in secure escrow until you inspect and approve the completed repair.
            </p>
          </div>
        </div>
      </div>

      {/* Workshop Location */}
      <div className="border-b border-hairline/60 p-5">
        <p className="eyebrow mb-2 font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft">
          {t("address")}
        </p>
        <p className="flex items-start gap-2 text-xs leading-relaxed text-enamel font-medium">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-signal" />
          <span>{profile.address}</span>
        </p>
      </div>

      {/* Service Modalities */}
      {services.length > 0 ? (
        <div className="border-b border-hairline/60 p-5">
          <p className="eyebrow mb-2.5 font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft">
            {t("serviceOptions")}
          </p>
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.key} className="flex items-center gap-2 text-xs font-medium text-enamel">
                <service.icon aria-hidden className="size-3.5 shrink-0 text-signal" />
                <span>{service.label}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* Operating Hours */}
      <div className="p-5">
        <div className="flex items-center justify-between mb-3">
          <p className="eyebrow font-mono text-[10px] font-bold uppercase tracking-wider text-steel-soft">
            {t("openingHours")}
          </p>
          <Clock className="size-3.5 text-steel-soft" />
        </div>

        <table className="w-full font-mono text-xs">
          <tbody>
            {week.map((day) => {
              const isToday = day.day === today;
              return (
                <tr
                  key={day.day}
                  className={cn(
                    "border-b border-hairline/40 last:border-0 transition-colors",
                    isToday ? "bg-signal-wash/40 font-bold text-signal" : "text-steel",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "py-2 text-left font-normal uppercase tracking-wide",
                      isToday && "font-bold text-signal pl-1.5",
                    )}
                  >
                    {ts(`weekdayShort.${day.day}`)}
                    {isToday ? <span className="ml-1 text-[10px] font-bold uppercase tracking-wider text-signal">●</span> : null}
                  </th>
                  <td className={cn("py-2 text-right tabular-nums", isToday && "font-bold text-signal pr-1.5")}>
                    {day.schedule
                      ? `${formatClock(day.schedule.openMinutes)} – ${formatClock(day.schedule.closeMinutes)}`
                      : t("closed")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {profile.closed_on_holidays ? (
          <p className="mt-3 font-mono text-eyebrow uppercase text-steel-soft">
            {t("closedHolidays")}
          </p>
        ) : null}
      </div>
    </aside>
  );
}
