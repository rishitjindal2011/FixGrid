import { Badge } from "@/components/ui/badge";
import type { PageStatus } from "@/lib/types/database";
import { cn } from "@/lib/utils";

/**
 * Status colour is load-bearing in this tool — it is how you scan a list of two
 * hundred rows for the three that are still drafts. Defined once so published
 * is never teal in one table and grey in another.
 *
 * Draft uses signal orange because "unfinished, needs a decision" is exactly
 * what signal is reserved for; archived stays neutral because it is inert.
 */
const VARIANT: Record<PageStatus, "verified" | "signal" | "neutral"> = {
  published: "verified",
  draft: "signal",
  archived: "neutral",
};

export function StatusBadge({
  status,
  className,
}: {
  status: PageStatus;
  className?: string;
}) {
  return (
    <Badge variant={VARIANT[status]} className={cn("shrink-0", className)}>
      {status}
    </Badge>
  );
}
