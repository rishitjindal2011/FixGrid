import { Mail, MapPin, Navigation, PackageCheck, Phone, Store, Truck } from "lucide-react";
import { useTranslations } from "next-intl";

import { Button } from "@/components/ui/button";
import { WarrantyBadge } from "@/components/warranty-badge";
import { StatusStrip } from "@/components/status-strip";
import { formatClock, resolveWeek, type HoursInput, type ShopStatus } from "@/lib/hours";
import { cn, directionsUrl, telHref } from "@/lib/utils";
import { getZonedNow } from "@/lib/hours";
import type { ExpertProfile } from "@/lib/types/database";

/**
 * The sticky panel. Everything a visitor needs to actually make contact, in
 * the order they need it: is it open, how do I reach it, how do I get there.
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
  /**
   * The shop's standard warranty in days. 0 renders nothing.
   *
   * An explicit prop rather than read off `profile`, because `ExpertProfile` is
   * built on the *generated* row type, which predates migration 001 and has no
   * `default_warranty_days`. Adding it there would be erased the next time
   * `supabase gen types` runs — the same trap `marketplace.ts` exists to avoid.
   */
  warrantyDays: number;
}) {
  /*
   * `useTranslations` rather than `getTranslations`, even though this is a Server
   * Component — next-intl supports the hook in any component that is not `async`,
   * and this one has no reason to be. Keeping it synchronous means the sticky
   * panel renders in the same pass as the profile around it.
   */
  const t = useTranslations("expert.contact");
  const ts = useTranslations("status");

  const week = resolveWeek(hours);
  const today = getZonedNow(profile.timezone).weekday;

  const services = [
    { key: "in_shop", label: t("inShop"), icon: Store, offered: profile.offers_in_shop },
    {
      key: "home",
      label: t("homeVisits"),
      icon: Truck,
      offered: profile.offers_home_service,
    },
    {
      key: "pickup",
      label: t("pickupDrop"),
      icon: PackageCheck,
      offered: profile.offers_pickup_drop,
    },
  ].filter((service) => service.offered);

  return (
    <aside className="rounded-machined border border-hairline bg-chalk shadow-bench">
      <div className="border-b border-hairline p-5">
        <StatusStrip hours={hours} size="md" initialStatus={initialStatus} />

        {/*
          Above the call button, not below it.

          This card is where somebody decides whether to trust the shop with their
          device, and the warranty is the strongest thing we can tell them at that
          moment. Putting it under the buttons would make it a footnote to an action
          they have already taken or abandoned.

          Renders nothing when the shop offers no warranty — see `WarrantyBadge`.
        */}
        <div className="mt-4 empty:mt-0">
          <WarrantyBadge days={warrantyDays} variant="line" />
        </div>

        <div className="mt-4 flex flex-col gap-2">
          {profile.contact_phone ? (
            <Button asChild size="lg">
              <a href={telHref(profile.contact_phone)}>
                <Phone aria-hidden />
                {profile.contact_phone}
              </a>
            </Button>
          ) : null}

          {profile.lat !== null && profile.lng !== null ? (
            <Button asChild variant="outline">
              <a
                href={directionsUrl(profile.lat, profile.lng)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Navigation aria-hidden />
                {t("getDirections")}
              </a>
            </Button>
          ) : null}

          {profile.contact_email ? (
            <Button asChild variant="ghost">
              <a href={`mailto:${profile.contact_email}`}>
                <Mail aria-hidden />
                {t("emailShop")}
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-hairline p-5">
        <p className="eyebrow mb-3">{t("address")}</p>
        <p className="flex gap-2 text-sm leading-relaxed text-steel">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          {profile.address}
        </p>
      </div>

      {services.length > 0 ? (
        <div className="border-b border-hairline p-5">
          <p className="eyebrow mb-3">{t("serviceOptions")}</p>
          <ul className="space-y-2">
            {services.map((service) => (
              <li key={service.key} className="flex items-center gap-2 text-sm text-steel">
                <service.icon aria-hidden className="size-4 shrink-0 text-verdigris" />
                {service.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="p-5">
        <p className="eyebrow mb-3">{t("openingHours")}</p>
        <table className="w-full font-mono text-xs">
          <tbody>
            {week.map((day) => {
              const isToday = day.day === today;
              return (
                <tr
                  key={day.day}
                  className={cn(
                    "border-b border-hairline/60 last:border-0",
                    isToday && "text-enamel",
                    !isToday && "text-steel",
                  )}
                >
                  <th
                    scope="row"
                    className={cn(
                      "py-1.5 text-left font-normal uppercase tracking-wide",
                      isToday && "font-semibold",
                    )}
                  >
                    {/*
                      A catalogue lookup, not `label.slice(0, 3)`. Slicing works on
                      "Monday" and destroys "ಸೋಮವಾರ" — three UTF-16 units land
                      mid-conjunct and leave a stranded vowel sign on screen.
                    */}
                    {ts(`weekdayShort.${day.day}`)}
                    {isToday ? <span className="sr-only"> {t("today")}</span> : null}
                  </th>
                  <td className={cn("py-1.5 text-right tabular-nums", isToday && "font-semibold")}>
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
