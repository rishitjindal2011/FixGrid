import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * Data table primitives — booking history, transactions, client lists.
 *
 * Server components (no `"use client"`): these are structural wrappers around
 * real table elements, so sorting or row selection belongs in whatever client
 * component renders the rows, not here. Keeping them on the server means a
 * static table costs no JavaScript.
 *
 * The horizontal scroll container lives in `Table` rather than at each call
 * site — a table that overflows its column on mobile is the default, not the
 * exception, and forgetting the wrapper breaks the page layout rather than the
 * table.
 */
export function Table({ className, ...props }: React.HTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto">
      <table
        className={cn("w-full caption-bottom border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function TableHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <thead className={cn("border-b border-hairline", className)} {...props} />;
}

export function TableBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("[&_tr:last-child]:border-0", className)} {...props} />;
}

export function TableRow({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("border-b border-hairline transition-colors hover:bg-bench", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      className={cn(
        "h-10 whitespace-nowrap px-3 text-left align-middle",
        "font-mono text-eyebrow uppercase tracking-[0.14em] text-steel",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return <td className={cn("px-3 py-3 align-middle text-enamel", className)} {...props} />;
}

export function TableCaption({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableCaptionElement>) {
  return <caption className={cn("mt-3 text-sm text-steel", className)} {...props} />;
}
