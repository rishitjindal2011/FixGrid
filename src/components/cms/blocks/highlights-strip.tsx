import type { HighlightsStripBlock } from "@/lib/cms/blocks";

/**
 * A row of measured values, set as a machine readout: mono figures over mono
 * labels, divided by hairlines. No cards, no icons — the numbers are the
 * content and anything else would compete with them.
 */
export function HighlightsStrip({ block }: { block: HighlightsStripBlock }) {
  return (
    <section className="border-y border-hairline bg-chalk">
      <div className="mx-auto max-w-5xl px-4">
        <dl className="grid grid-cols-2 divide-y divide-hairline sm:grid-cols-4 sm:divide-y-0 sm:divide-x">
          {block.items.map((item, index) => (
            <div key={`${item.label}-${index}`} className="px-2 py-7 text-center">
              <dt className="sr-only">{item.label}</dt>
              <dd>
                <span className="block font-mono text-2xl font-semibold tabular-nums text-enamel">
                  {item.value}
                </span>
                <span className="mt-1.5 block font-mono text-eyebrow uppercase tracking-[0.14em] text-steel-soft">
                  {item.label}
                </span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
