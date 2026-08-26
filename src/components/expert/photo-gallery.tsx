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
      <div className="schematic grid aspect-[16/9] place-items-center rounded-machined border border-hairline bg-chalk">
        <p className="flex items-center gap-2 font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
          <ImageOff aria-hidden className="size-4" />
          {t("noPhotos")}
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
      className="rounded-machined focus-visible:outline-2"
    >
      <div className="relative aspect-[16/9] overflow-hidden rounded-machined border border-hairline bg-bench-sunk">
        <Image
          src={current}
          alt={t("photoAlt", { shopName, index: index + 1, count })}
          fill
          priority={index === 0}
          className="object-cover"
          sizes="(min-width: 1024px) 640px, 100vw"
        />

        {count > 1 ? (
          <>
            <CarouselButton side="left" onClick={() => go(index - 1)} label={t("previousPhoto")} />
            <CarouselButton side="right" onClick={() => go(index + 1)} label={t("nextPhoto")} />
            <span className="absolute bottom-3 right-3 rounded-machined bg-enamel/85 px-2 py-1 font-mono text-eyebrow tabular-nums text-bench">
              {index + 1} / {count}
            </span>
          </>
        ) : null}
      </div>

      <p aria-live="polite" className="sr-only">
        {t("photoPosition", { index: index + 1, count })}
      </p>

      {count > 1 ? (
        <ul className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {photos.map((photo, thumbIndex) => (
            <li key={`${photo}-${thumbIndex}`}>
              <button
                type="button"
                onClick={() => go(thumbIndex)}
                aria-label={t("showPhoto", { index: thumbIndex + 1 })}
                aria-current={thumbIndex === index}
                className={cn(
                  "relative size-16 shrink-0 overflow-hidden rounded-machined border-2 transition-colors",
                  thumbIndex === index
                    ? "border-signal"
                    : "border-hairline hover:border-steel-soft",
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
  /** Passed in rather than looked up here, so the parent owns the one namespace. */
  label: string;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        "absolute top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-machined bg-chalk/90 text-enamel shadow-bench transition-colors hover:bg-chalk",
        side === "left" ? "left-3" : "right-3",
      )}
    >
      <Icon aria-hidden className="size-5" />
    </button>
  );
}
