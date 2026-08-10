"use client";

import { useState, useTransition } from "react";
import { AlertTriangle, Info, ShieldAlert } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { acknowledgeNotice } from "@/lib/dashboard/notice-actions";
import type { ShopNotice } from "@/lib/dashboard/shop-status";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";

/**
 * Admin notices, shown one at a time until each is acknowledged.
 *
 * Modal because that is the point: the platform has said something to this shop
 * and needs to know it was seen. The bell menu exists for everything that does
 * not need that guarantee — this is deliberate, targeted, and must not be
 * skippable.
 *
 * The queue is walked locally rather than re-fetching after each dismissal.
 * Relying on the server to return the next notice would flash the whole page
 * between two dialogs; local state advances immediately while the acknowledgement
 * write lands in the background.
 */

const SEVERITY = {
  info: { icon: Info, accent: "bg-enamel text-bench", ring: "" },
  warning: { icon: AlertTriangle, accent: "bg-signal text-white", ring: "border-signal/30" },
  urgent: { icon: ShieldAlert, accent: "bg-rust text-white", ring: "border-rust/30" },
} as const;

export function NoticeDialog({ notices }: { notices: ShopNotice[] }) {
  const [index, setIndex] = useState(0);
  const [pending, startTransition] = useTransition();

  const notice = notices[index];
  if (!notice) return null;

  const severity = SEVERITY[notice.severity] ?? SEVERITY.info;
  const Icon = severity.icon;
  const remaining = notices.length - index - 1;

  // Read out here, while `notice` is still narrowed. Inside `dismiss` it is not:
  // the transition advances `index`, which `notice` derives from, so by the time
  // the callback runs the element may be gone — and a hoisted function body does
  // not inherit the guard above either way.
  const noticeId = notice.id;

  function dismiss() {
    startTransition(async () => {
      await acknowledgeNotice(noticeId);
      // Advance regardless of write result. If it failed, the notice is still
      // unacknowledged server-side and comes back on the next page load — better
      // than trapping someone in a dialog they can never close.
      setIndex((i) => i + 1);
    });
  }

  return (
    <Dialog open onOpenChange={() => {}}>
      <DialogContent
        hideClose
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
        className={cn("max-w-md", severity.ring && `border ${severity.ring}`)}
      >
        <DialogHeader>
          <DialogTitle className="pr-0">{notice.subject}</DialogTitle>
        </DialogHeader>

        <DialogBody>
          <div className="flex items-start gap-3">
            <span
              className={cn(
                "grid size-9 shrink-0 place-items-center rounded-machined",
                severity.accent,
              )}
            >
              <Icon aria-hidden className="size-4" />
            </span>
            <div className="min-w-0">
              <p className="eyebrow text-steel">
                Notice from FixGrid
                {notice.severity !== "info" ? ` — ${notice.severity}` : ""}
              </p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-enamel">
                {notice.body}
              </p>
              <p className="mt-3 font-mono text-xs text-steel-soft">
                Sent {formatDateTime(notice.createdAt)}
              </p>
            </div>
          </div>
        </DialogBody>

        <DialogFooter>
          <span className="mr-auto font-mono text-xs text-steel">
            {remaining > 0 ? `${remaining} more notice${remaining === 1 ? "" : "s"}` : ""}
          </span>
          <Button variant="primary" onClick={dismiss} disabled={pending}>
            {pending ? "Saving…" : remaining > 0 ? "Next →" : "I understand"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
