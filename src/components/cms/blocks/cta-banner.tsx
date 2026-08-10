import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { CtaBannerBlock } from "@/lib/cms/blocks";

export function CtaBanner({ block }: { block: CtaBannerBlock }) {
  const isSignal = block.tone === "signal";

  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      <div
        className={cn(
          "relative overflow-hidden rounded-machined px-6 py-12 text-center sm:px-12",
          isSignal ? "bg-signal text-white" : "bg-enamel text-bench",
        )}
      >
        <div aria-hidden className="schematic schematic-fade absolute inset-0 opacity-40" />

        <div className="relative mx-auto max-w-2xl">
          <h2 className="text-display-sm sm:text-display">{block.heading}</h2>
          {block.body ? (
            <p className={cn("mt-4 leading-relaxed", isSignal ? "text-white/85" : "text-bench/75")}>
              {block.body}
            </p>
          ) : null}

          <Button
            asChild
            size="lg"
            variant={isSignal ? "secondary" : "primary"}
            className="mt-7"
          >
            <Link href={block.cta.href}>{block.cta.label}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
