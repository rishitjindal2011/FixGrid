import { cn } from "@/lib/utils";

/**
 * The empty state that every list in this console needs.
 *
 * It is load-bearing, not decoration. The marketplace migration is a separate
 * step, so on a fresh database *every* screen here is empty — and an empty
 * screen that says nothing is indistinguishable from a broken one. Each caller
 * passes a `description` that names the likely cause, which is almost always
 * "the migration has not run" rather than "there is no data".
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  /** A lucide icon component, e.g. `Inbox`. Rendered at `size-5`, steel-soft. */
  icon?: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-3 rounded-machined border border-hairline bg-chalk p-6 shadow-bench",
        className,
      )}
    >
      {Icon ? <Icon className="size-5 text-steel-soft" aria-hidden /> : null}
      <div>
        <p className="font-display text-lg uppercase text-enamel">{title}</p>
        {description ? (
          <p className="mt-1 max-w-prose text-sm leading-relaxed text-steel">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}
