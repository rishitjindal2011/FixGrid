import type { ComponentType } from "react";
import Link from "next/link";
import { CalendarOff, ExternalLink, Plus, Store } from "lucide-react";

/**
 * The four things a shop owner starts a session to do.
 *
 * "View public page" points out of the dashboard at the live listing, which is
 * why it carries an explicit external mark — everything else here stays inside.
 */
export function QuickActions({ slug }: { slug: string }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <QuickAction
        href="/dashboard/expert/services"
        icon={Plus}
        title="Add a service"
        description="Price, duration and warranty"
      />
      <QuickAction
        href="/dashboard/expert/schedule"
        icon={CalendarOff}
        title="Block time off"
        description="Close a day or a fortnight"
      />
      <QuickAction
        href="/dashboard/expert/profile"
        icon={Store}
        title="Edit shop profile"
        description="Hours, contact and about"
      />
      <QuickAction
        href={`/expert/${slug}`}
        icon={ExternalLink}
        title="View public page"
        description="What customers see"
      />
    </div>
  );
}

function QuickAction({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-machined border border-hairline bg-chalk p-4 shadow-bench transition-shadow hover:border-steel-soft hover:shadow-lift"
    >
      <span className="grid size-9 shrink-0 place-items-center rounded-machined bg-bench text-enamel transition-colors group-hover:bg-enamel group-hover:text-bench">
        <Icon aria-hidden className="size-4" />
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-sm uppercase tracking-wide text-enamel">
          {title}
        </span>
        <span className="block truncate text-xs text-steel">{description}</span>
      </span>
    </Link>
  );
}
