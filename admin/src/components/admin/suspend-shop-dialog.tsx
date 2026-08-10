"use client";

import { useActionState } from "react";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogBody,
  DialogFooter,
  useCloseOnSuccess,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { suspendShop, unsuspendShop } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";

/**
 * Suspend / lift-suspension for one shop.
 *
 * Both directions live in the same component because they are the same control
 * in two states, and because the suspended branch has to explain itself: an
 * admin looking at a shop with no bookings needs to know whether it is quiet or
 * switched off.
 *
 * Suspending asks for a reason and lifting does not. The reason is shown to the
 * owner, so it is the whole point of the action; there is nothing equivalent to
 * say when service is restored.
 */
export function SuspendShopDialog({
  fixerId,
  isSuspended,
}: {
  fixerId: string;
  isSuspended: boolean;
}) {
  const [suspendState, suspend, isSuspending] = useActionState(suspendShop, ADMIN_INITIAL_STATE);
  const [unsuspendState, unsuspend, isUnsuspending] = useActionState(
    unsuspendShop,
    ADMIN_INITIAL_STATE,
  );
  const [open, setOpen] = useCloseOnSuccess(suspendState);

  if (isSuspended) {
    return (
      <div className="flex flex-col gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3">
        <p className="flex items-start gap-2 text-sm text-enamel">
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-rust" />
          <span>
            This shop is currently <strong>suspended</strong>. They cannot receive bookings and do not appear in search.
          </span>
        </p>
        <form action={unsuspend} className="flex flex-col gap-2">
          <input type="hidden" name="fixerId" value={fixerId} />
          {unsuspendState.error ? (
            <p role="alert" className="text-xs text-rust">
              {unsuspendState.error}
            </p>
          ) : null}
          <Button type="submit" size="sm" variant="outline" disabled={isUnsuspending}>
            {isUnsuspending ? "Lifting suspension…" : "Lift suspension"}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <>
      <Button variant="danger" size="sm" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <AlertTriangle aria-hidden className="size-4" />
        Suspend shop
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="suspend-shop-title">
        <DialogHeader>
          <DialogTitle id="suspend-shop-title">Suspend this shop</DialogTitle>
          <DialogDescription>
            Suspension takes the shop offline immediately. They will be removed from search and cannot accept bookings.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <form id="suspend-shop-form" action={suspend} className="flex flex-col gap-4">
          <input type="hidden" name="fixerId" value={fixerId} />
          
          <div className="flex flex-col gap-1.5">
            <label htmlFor="suspend-reason" className="eyebrow text-steel">
              Reason (shown to shop owner)
            </label>
            <Textarea
              id="suspend-reason"
              name="reason"
              required
              minLength={10}
              maxLength={2000}
              placeholder="e.g. We have received multiple reports of..."
              className="min-h-[100px]"
            />
          </div>

          {suspendState.error ? (
            <p role="alert" className="text-sm text-rust">
              {suspendState.error}
            </p>
          ) : null}
        </form>
        </DialogBody>
        <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={isSuspending}
            >
              Cancel
            </Button>
            <Button type="submit" form="suspend-shop-form" variant="danger" disabled={isSuspending}>
              {isSuspending ? "Suspending…" : "Suspend shop"}
            </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
