import {
  BadgeCheck,
  Clock,
  Hammer,
  MapPin,
  PackageCheck,
  Receipt,
  ShieldCheck,
  Smartphone,
  Truck,
  Wrench,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { FeatureGridBlock } from "@/lib/cms/blocks";

/**
 * Icons come from the CMS as strings, so they resolve through an allowlist.
 * Importing lucide dynamically by name would pull the entire icon set into the
 * bundle — roughly 1.5 MB — to render three glyphs.
 */
const ICONS: Record<string, LucideIcon> = {
  wrench: Wrench,
  hammer: Hammer,
  clock: Clock,
  shield: ShieldCheck,
  verified: BadgeCheck,
  pin: MapPin,
  truck: Truck,
  pickup: PackageCheck,
  receipt: Receipt,
  phone: Smartphone,
};

const COLUMN_CLASS: Record<2 | 3 | 4, string> = {
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-2 lg:grid-cols-3",
  4: "sm:grid-cols-2 lg:grid-cols-4",
};

export function FeatureGrid({ block }: { block: FeatureGridBlock }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {block.title ? <h2 className="text-display-sm">{block.title}</h2> : null}
      {block.intro ? (
        <p className="mt-3 max-w-2xl leading-relaxed text-steel">{block.intro}</p>
      ) : null}

      <div
        className={cn(
          "mt-8 grid gap-px overflow-hidden rounded-machined border border-hairline bg-hairline",
          COLUMN_CLASS[block.columns],
        )}
      >
        {block.items.map((item, index) => {
          const Icon = item.icon ? ICONS[item.icon] : undefined;
          return (
            <article key={`${item.title}-${index}`} className="bg-chalk p-6">
              {Icon ? (
                <span className="mb-4 grid size-9 place-items-center rounded-machined bg-bench text-signal">
                  <Icon aria-hidden className="size-5" />
                </span>
              ) : null}
              <h3 className="text-lg leading-tight">{item.title}</h3>
              {item.body ? (
                <p className="mt-2 text-sm leading-relaxed text-steel">{item.body}</p>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
