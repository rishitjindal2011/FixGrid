import { RatingStars } from "@/components/rating-stars";
import type { TestimonialsBlock } from "@/lib/cms/blocks";

export function Testimonials({ block }: { block: TestimonialsBlock }) {
  return (
    <section className="mx-auto max-w-5xl px-4 py-12">
      {block.title ? <h2 className="text-display-sm">{block.title}</h2> : null}

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {block.items.map((item, index) => (
          <figure
            key={`${item.author}-${index}`}
            className="flex flex-col rounded-machined border border-hairline bg-chalk p-6 shadow-bench"
          >
            {typeof item.rating === "number" ? (
              <RatingStars rating={item.rating} count={1} showCount={false} className="mb-3" />
            ) : null}

            <blockquote className="flex-1 leading-relaxed text-enamel">
              {item.quote}
            </blockquote>

            <figcaption className="mt-5 border-t border-hairline pt-4">
              <span className="block font-display text-base uppercase text-enamel">
                {item.author}
              </span>
              {item.role ? (
                <span className="font-mono text-eyebrow uppercase text-steel-soft">
                  {item.role}
                </span>
              ) : null}
            </figcaption>
          </figure>
        ))}
      </div>
    </section>
  );
}
