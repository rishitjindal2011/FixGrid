"use client";

import * as React from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Photo carousel.
 *
 * Keyboard-operable (arrow keys when focused), announces position through an
 * aria-live region, and wraps at both ends. The empty state is a schematic
 * panel rather than a broken image — a shop with no photos is common, not an
 * error.
 */
export function PhotoGallery({ photos, shopName }: { photos: string[]; shopName: string }) {
  const [index, setIndex] = React.useState(0);
  const t = useTranslations("expert");

  const count = photos.length;
  const go = React.useCallback(
    (next: number) => setIndex(((next % count) + count) % count),
    [count],
  );

  const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      go(index - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      go(index + 1);
    }
  };

  if (count === 0) {
    return (
      <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[340px] flex flex-col items-center justify-center rounded-2xl border border-hairline bg-gradient-to-br from-enamel to-enamel-lift p-6 text-center text-bench shadow-bench">
        <div className="size-14 rounded-2xl bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center">
          <ImageOff className="size-7 text-signal" />
        </div>
        <p className="mt-3 font-display text-lg font-bold uppercase tracking-wider text-bench">
          {shopName} Lab Facility
        </p>
        <p className="mt-1 max-w-sm text-xs text-bench/70 font-mono">
          Verified on-site hardware workbench &amp; diagnostics lab.
        </p>
      </div>
    );
  }

  const current = photos[index] ?? photos[0]!;

  return (
    <div
      role="group"
      aria-roledescription="carousel"
      aria-label={t("photosOf", { shopName })}
      tabIndex={0}
      onKeyDown={onKeyDown}
      className="rounded-2xl focus-visible:outline-2"
    >
      <div className="relative aspect-[16/10] sm:aspect-[16/9] max-h-[380px] overflow-hidden rounded-2xl border border-hairline bg-bench-sunk shadow-bench group">
        <Image
          src={current}
          alt={t("photoAlt", { shopName, index: index + 1, count })}
          fill
          priority={index === 0}
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(min-width: 1024px) 640px, 100vw"
        />

        {/* Subtle Vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20 pointer-events-none" />

        {count > 1 ? (
          <>
            <CarouselButton side="left" onClick={() => go(index - 1)} label={t("previousPhoto")} />
            <CarouselButton side="right" onClick={() => go(index + 1)} label={t("nextPhoto")} />
            <span className="absolute bottom-3 right-3 rounded-lg bg-black/80 backdrop-blur-md px-2.5 py-1 font-mono text-xs tabular-nums text-white border border-white/10 shadow-sm">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {t("photoPosition", { index: index + 1, count })}
      </p>

      {count > 1 ? (
        <ul className="mt-3 flex gap-2.5 overflow-x-auto pb-1">
          {photos.map((photo, thumbIndex) => (
            <li key={`${photo}-${thumbIndex}`}>
              <button
                type="button"
                onClick={() => go(thumbIndex)}
                aria-label={t("showPhoto", { index: thumbIndex + 1 })}
                aria-current={thumbIndex === index}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-all",
                  thumbIndex === index
                    ? "border-signal shadow-sm scale-105"
                    : "border-hairline opacity-70 hover:opacity-100 hover:border-steel-soft",
                )}
              >
                <Image
                  src={photo}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function CarouselButton({
  side,
  onClick,
  label,
}: {
  side: "left" | "right";
  onClick: () => void;
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-xl bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-bench transition-all hover:bg-black/80 hover:scale-110",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
