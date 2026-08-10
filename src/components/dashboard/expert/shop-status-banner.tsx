import { AlertTriangle, Clock, ShieldOff } from "lucide-react";

import type { ShopStatus } from "@/lib/dashboard/shop-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Why customers can or cannot see this shop, stated in full on the dashboard.
 *
 * This replaces a bare "Not yet verified" badge that told an owner nothing
 * useful. The three things someone needs to know are whether they are findable,
 * why not, and what happens next — a badge can carry none of them, so this is a
 * banner with room for a sentence.
 *
 * Renders nothing when the shop is live. A permanent "everything is fine" strip
 * is noise that trains people to skip the region entirely, which is exactly
 * where the suspension notice will later appear.
 */
export function ShopStatusBanner({ status }: { status: ShopStatus }) {
  if (status.visibility === "live") return null;

  const suspended = status.visibility === "suspended";
  const Icon = suspended ? ShieldOff : Clock;

  return (
    <section
      // `alert` for a suspension — it is a change of circumstances the owner has
      // not seen before and needs announced. A pending review is expected and
      // gets `status`, which does not interrupt.
      role={suspended ? "alert" : "status"}
      className={cn(
        "flex items-start gap-3 rounded-machined border p-4",
        suspended
          ? "border-rust/30 bg-rust-wash"
          : "border-signal/30 bg-signal-wash",
      )}
    >
      <span
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-machined",
          suspended ? "bg-rust text-white" : "bg-signal text-white",
        )}
      >
        <Icon aria-hidden className="size-4" />
      </span>

      <div className="min-w-0 flex-1">
        <h2 className="font-display text-sm uppercase tracking-wide text-enamel">
          {suspended ? "Your shop is suspended" : "Your shop is not public yet"}
        </h2>

        {suspended ? (
          <>
            <p className="mt-1 text-sm leading-relaxed text-enamel">
              Customers cannot find or book you while this is in place. Your
              existing bookings and messages are unaffected.
            </p>

            {status.suspendedReason ? (
              <figure className="mt-3 border-l-2 border-rust/40 pl-3">
                <figcaption className="eyebrow text-steel">Reason given</figcaption>
                <blockquote className="mt-1 whitespace-pre-wrap text-sm text-enamel">
                  {status.suspendedReason}
                </blockquote>
              </figure>
            ) : (
              <p className="mt-3 text-sm text-steel">
                No reason was recorded. Reply to your last message from us and we
                will explain.
              </p>
            )}

            {status.suspendedAt ? (
              <p className="mt-3 font-mono text-xs text-steel">
                Suspended {formatDateTime(status.suspendedAt)}
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p className="mt-1 text-sm leading-relaxed text-enamel">
              We are checking the details you submitted. Until that is done your
              shop will not appear in search and customers cannot book you.
            </p>
            <p className="mt-2 text-sm leading-relaxed text-steel">
              Nothing is wrong and there is nothing to send us. Reviews usually
              finish within a working day. Meanwhile you can add your services,
              opening hours and photos — everything you set up now goes live the
              moment you are approved.
            </p>
          </>
        )}
      </div>
    </section>
  );
}

/**
 * The compact form, for the shop header beside the name.
 *
 * Kept in the same file as the banner on purpose: they describe one concept in
 * two densities, and splitting them is how the wording drifts apart.
 */
export function ShopStatusPill({ status }: { status: ShopStatus }) {
  if (status.visibility === "live") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-machined border border-verdigris/30 bg-verdigris-wash px-2 py-0.5 font-display text-xs uppercase tracking-wide text-verdigris">
        Live in the directory
      </span>
    );
  }

  const suspended = status.visibility === "suspended";

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-machined border px-2 py-0.5 font-display text-xs uppercase tracking-wide",
        suspended
          ? "border-rust/30 bg-rust-wash text-rust"
          : "border-signal/30 bg-signal-wash text-signal",
      )}
    >
      <AlertTriangle aria-hidden className="size-3" />
      {suspended ? "Suspended" : "Awaiting review"}
    </span>
  );
}
