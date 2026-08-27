"use client";

import { Printer } from "lucide-react";

import { Button } from "@/components/ui/button";

/**
 * The only interactive thing on the invoice, so the only thing that ships
 * JavaScript. Everything else on this route stays a Server Component.
 *
 * `window.print()` rather than a PDF library: the browser's own print dialogue
 * already offers "Save as PDF" on every platform the site supports, and a
 * client-side renderer would add hundreds of kilobytes to reproduce — worse —
 * the layout the print stylesheet already produces.
 */
export function PrintInvoiceButton() {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => window.print()}
      // Hidden on paper: a button printed onto an invoice is a dead control.
      className="print:hidden"
    >
      <Printer aria-hidden />
      Print / Save as PDF
    </Button>
  );
}
