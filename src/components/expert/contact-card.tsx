import { Mail, MapPin, Navigation, PackageCheck, Phone, Store, Truck } from "lucide-react";

import { Button } from "@/components/ui/button";
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
}: {
  profile: ExpertProfile;
  hours: HoursInput;
  initialStatus: ShopStatus;
}) {
  const week = resolveWeek(hours);
  const today = getZonedNow(profile.timezone).weekday;

  const services = [
    { key: "in_shop", label: "In-shop repair", icon: Store, offered: profile.offers_in_shop },
    {
      key: "home",
      label: "Home visits",
      icon: Truck,
      offered: profile.offers_home_service,
    },
    {
      key: "pickup",
      label: "Pickup and drop-off",
      icon: PackageCheck,
      offered: profile.offers_pickup_drop,
    },
  ].filter((service) => service.offered);

  return (
    <aside className="rounded-machined border border-hairline bg-chalk shadow-bench">
      <div className="border-b border-hairline p-5">
        <StatusStrip hours={hours} size="md" initialStatus={initialStatus} />

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
                Get directions
              </a>
            </Button>
          ) : null}

          {profile.contact_email ? (
            <Button asChild variant="ghost">
              <a href={`mailto:${profile.contact_email}`}>
                <Mail aria-hidden />
                Email the shop
              </a>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="border-b border-hairline p-5">
        <p className="eyebrow mb-3">Address</p>
        <p className="flex gap-2 text-sm leading-relaxed text-steel">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-steel-soft" />
          {profile.address}
        </p>
      </div>

      {services.length > 0 ? (
        <div className="border-b border-hairline p-5">
          <p className="eyebrow mb-3">Service options</p>
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
        <p className="eyebrow mb-3">Opening hours</p>
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
                    {day.label.slice(0, 3)}
                    {isToday ? <span className="sr-only"> (today)</span> : null}
                  </th>
                  <td className={cn("py-1.5 text-right tabular-nums", isToday && "font-semibold")}>
                    {day.schedule
                      ? `${formatClock(day.schedule.openMinutes)} – ${formatClock(day.schedule.closeMinutes)}`
                      : "Closed"}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {profile.closed_on_holidays ? (
          <p className="mt-3 font-mono text-eyebrow uppercase text-steel-soft">
            Closed on public holidays
          </p>
        ) : null}
      </div>
    </aside>
  );
}
