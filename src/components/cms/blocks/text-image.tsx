import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TextImageBlock } from "@/lib/cms/blocks";

export function TextImage({ block }: { block: TextImageBlock }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <div className={cn(block.side === "left" && "lg:order-2")}>
          <h2 className="text-display-sm">{block.heading}</h2>
          {block.body ? (
            <p className="mt-4 leading-relaxed text-steel">{block.body}</p>
          ) : null}
          {block.cta ? (
            <Button asChild variant={block.cta.variant ?? "outline"} className="mt-6">
              <Link href={block.cta.href}>{block.cta.label}</Link>
            </Button>
          ) : null}
        </div>

        <div
          className={cn(
            "relative aspect-[4/3] overflow-hidden rounded-machined border border-hairline bg-bench-sunk",
            block.side === "left" && "lg:order-1",
          )}
        >
          <Image
            src={block.image.src}
            alt={block.image.alt}
            fill
            className="object-cover"
            sizes="(min-width: 1024px) 480px, 100vw"
          />
        </div>
      </div>
    </section>
  );
}
