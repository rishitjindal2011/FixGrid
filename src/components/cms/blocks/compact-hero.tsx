import Link from "next/link";
import { Button } from "@/components/ui/button";
import type { CompactHeroBlock } from "@/lib/cms/blocks";

/**
 * The page's h1. The schematic grid appears here and on cta_banner only —
 * used everywhere it would stop reading as a workshop drawing and start
 * reading as wallpaper.
 */
export function CompactHero({ block }: { block: CompactHeroBlock }) {
  return (
    <section className="relative border-b border-hairline bg-chalk">
      <div aria-hidden className="schematic schematic-fade absolute inset-0" />

      <div className="relative mx-auto max-w-4xl px-4 py-16 sm:py-20">
        {block.eyebrow ? <p className="eyebrow mb-4">{block.eyebrow}</p> : null}

        <h1 className="max-w-3xl text-display sm:text-display-lg">{block.heading}</h1>

        {block.subtitle ? (
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-steel">{block.subtitle}</p>
        ) : null}

        {block.ctas && block.ctas.length > 0 ? (
          <div className="mt-8 flex flex-wrap gap-3">
            {block.ctas.map((cta, index) => (
              <Button
                key={`${cta.href}-${index}`}
                asChild
                size="lg"
                variant={cta.variant ?? (index === 0 ? "primary" : "outline")}
              >
                <Link href={cta.href}>{cta.label}</Link>
              </Button>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}
