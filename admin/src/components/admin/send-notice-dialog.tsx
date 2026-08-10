"use client";

import { useActionState } from "react";
import { Mail } from "lucide-react";

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
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { sendShopNotice } from "@/lib/actions/admin";
import { ADMIN_INITIAL_STATE } from "@/lib/actions/state";

export function SendNoticeDialog({ fixerId }: { fixerId: string }) {
  const [state, sendNotice, isSending] = useActionState(sendShopNotice, ADMIN_INITIAL_STATE);
  const [open, setOpen] = useCloseOnSuccess(state);

  return (
    <>
      <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => setOpen(true)}>
        <Mail aria-hidden className="size-4" />
        Send Notice
      </Button>

      <Dialog open={open} onClose={() => setOpen(false)} labelledBy="send-notice-title">
        <DialogHeader>
          <DialogTitle id="send-notice-title">Send notice to shop owner</DialogTitle>
          <DialogDescription>
            This message will appear on the owner&rsquo;s dashboard and requires their
            acknowledgement.
          </DialogDescription>
        </DialogHeader>

        <DialogBody>
        <form id="send-notice-form" action={sendNotice} className="flex flex-col gap-4">
          <input type="hidden" name="fixerId" value={fixerId} />

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notice-severity" className="eyebrow text-steel">
              Severity
            </label>
            <Select name="severity" defaultValue="info" id="notice-severity">
              <option value="info">Info</option>
              <option value="warning">Warning</option>
              <option value="urgent">Urgent</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notice-subject" className="eyebrow text-steel">
              Subject
            </label>
            <Input
              id="notice-subject"
              name="subject"
              required
              minLength={2}
              maxLength={200}
              placeholder="e.g. Action required: Update your address"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="notice-body" className="eyebrow text-steel">
              Message
            </label>
            <Textarea
              id="notice-body"
              name="body"
              required
              minLength={2}
              maxLength={4000}
              placeholder="Type your message here..."
              className="min-h-[120px]"
            />
          </div>

          {state.error ? (
            <p role="alert" className="text-sm text-rust">
              {state.error}
            </p>
          ) : null}
        </form>
        </DialogBody>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSending}>
            Cancel
          </Button>
          <Button type="submit" form="send-notice-form" disabled={isSending}>
            {isSending ? "Sending…" : "Send notice"}
          </Button>
        </DialogFooter>
      </Dialog>
    </>
  );
}
