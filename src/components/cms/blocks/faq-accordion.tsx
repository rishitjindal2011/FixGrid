"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { FaqAccordionBlock } from "@/lib/cms/blocks";

/**
 * Only the open/close behaviour is client-side.
 *
 * The FAQPage JSON-LD for this content is emitted once, server-side, by the
 * route — see `collectFaqItems`. Answers are rendered as text in the DOM
 * regardless of open state, so crawlers and Ctrl+F both find them.
 */
export function FaqAccordion({ block }: { block: FaqAccordionBlock }) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12">
      <h2 className="text-display-sm">{block.title ?? "Common questions"}</h2>

      <Accordion
        type="multiple"
        className="mt-6 rounded-machined border border-hairline bg-chalk px-5"
      >
        {block.items.map((item, index) => (
          <AccordionItem key={`${item.question}-${index}`} value={`faq-${index}`}>
            <AccordionTrigger>{item.question}</AccordionTrigger>
            <AccordionContent>{item.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
