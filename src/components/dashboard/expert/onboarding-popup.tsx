"use client";

import { useState } from "react";
import Link from "next/link";
import { Camera, ExternalLink, PenSquare, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ExpertOnboardingPopup({
  hasPhotos,
  hasBio,
  shopSlug,
}: {
  hasPhotos: boolean;
  hasBio: boolean;
  shopSlug: string;
}) {
  // Only show the popup if either photos or bio is missing, and the user hasn't dismissed it this session.
  const isComplete = hasPhotos && hasBio;
  const [open, setOpen] = useState(!isComplete);

  if (isComplete) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-md p-6">
        <div className="absolute right-4 top-4">
          <Button
            variant="ghost"
            size="icon"
            className="size-8 text-steel hover:text-enamel"
            onClick={() => setOpen(false)}
          >
            <X aria-hidden className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>

        <div className="flex flex-col gap-1.5 pt-2">
          <span className="eyebrow text-signal">Set up your shop</span>
          <DialogTitle className="font-display text-2xl uppercase tracking-tight text-enamel">
            Complete your profile
          </DialogTitle>
          <p className="text-sm leading-relaxed text-steel">
            To attract more customers and build trust, make sure your shop looks great. We recommend adding a few photos and a short description of what you do.
          </p>
        </div>

        <ul className="mt-6 flex flex-col gap-3">
          {!hasPhotos && (
            <li className="flex items-start gap-3 rounded-machined border border-hairline bg-bench p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-chalk text-steel">
                <Camera aria-hidden className="size-4" />
              </span>
              <div>
                <p className="font-display text-sm uppercase tracking-wide text-enamel">
                  Add shop photos
                </p>
                <p className="text-xs text-steel">
                  Customers are more likely to book shops they can see.
                </p>
              </div>
            </li>
          )}
          {!hasBio && (
            <li className="flex items-start gap-3 rounded-machined border border-hairline bg-bench p-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-machined bg-chalk text-steel">
                <PenSquare aria-hidden className="size-4" />
              </span>
              <div>
                <p className="font-display text-sm uppercase tracking-wide text-enamel">
                  Write a short bio
                </p>
                <p className="text-xs text-steel">
                  Tell people about your experience and what you specialize in.
                </p>
              </div>
            </li>
          )}
        </ul>

        <div className="mt-8 flex flex-col gap-2">
          <Button asChild size="lg" onClick={() => setOpen(false)}>
            <Link href="/dashboard/expert/profile">Go to shop profile</Link>
          </Button>
          <Button asChild variant="ghost" className="text-steel" onClick={() => setOpen(false)}>
            <Link href={`/expert/${shopSlug}`}>
              <ExternalLink aria-hidden className="mr-2 size-4" />
              Preview public page
            </Link>
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
