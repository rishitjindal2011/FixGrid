import { cn } from "@/lib/utils";

/**
 * Every screen in the admin opens the same way: eyebrow, title, one line of
 * orientation, actions on the right. Consistency here is what makes the tool
 * feel like one thing rather than five screens built on different days.
 */
export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  className,
}: {
  /**
   * `ReactNode` rather than `string` because the editor puts a status badge and
   * the resolved path up here. It still renders inside the `.eyebrow` type
   * treatment, so anything passed should be short and inline.
   */
  eyebrow?: React.ReactNode;
  title: string;
  description?: string;
  actions?: React.ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-hairline pb-5",
        className,
      )}
    >
      <div className="min-w-0">
        {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
        <h1 className="text-display-sm">{title}</h1>
        {description ? (
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-steel">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </header>
  );
}
