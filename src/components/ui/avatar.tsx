"use client";

import * as React from "react";
import * as AvatarPrimitive from "@radix-ui/react-avatar";

import { cn } from "@/lib/utils";

/**
 * Square-cornered, per the token comment on `--radius-machined` — a circular
 * avatar would be the one pill on the site.
 *
 * `AvatarImage` swaps to the fallback on load failure rather than showing a
 * broken image, which matters because avatar URLs here come from user profiles
 * and Supabase storage, not from the build.
 */
export const Avatar = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>
>(function Avatar({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex size-9 shrink-0 overflow-hidden rounded-machined border border-hairline",
        className,
      )}
      {...props}
    />
  );
});

export const AvatarImage = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(function AvatarImage({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Image
      ref={ref}
      className={cn("aspect-square size-full object-cover", className)}
      {...props}
    />
  );
});

export const AvatarFallback = React.forwardRef<
  React.ComponentRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(function AvatarFallback({ className, ...props }, ref) {
  return (
    <AvatarPrimitive.Fallback
      ref={ref}
      className={cn(
        "flex size-full items-center justify-center bg-bench-sunk",
        "font-display text-sm uppercase text-steel",
        className,
      )}
      {...props}
    />
  );
});

/** First letters of up to two words — "Priya Raman" → "PR", "sam" → "S". */
export function initialsFrom(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return "?";
  return parts.map((part) => part[0]!.toUpperCase()).join("");
}

const SIZES = {
  sm: "size-8",
  md: "size-9",
  lg: "size-12",
} as const;

/**
 * The common case: one avatar, from a URL that may be null, falling back to
 * initials. Compose `Avatar`/`AvatarImage`/`AvatarFallback` directly when you
 * need something else in the fallback.
 */
export function UserAvatar({
  src,
  name,
  size = "md",
  className,
}: {
  src: string | null | undefined;
  name: string | null | undefined;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <Avatar className={cn(SIZES[size], className)}>
      {src ? <AvatarImage src={src} alt="" /> : null}
      <AvatarFallback>{initialsFrom(name)}</AvatarFallback>
    </Avatar>
  );
}
