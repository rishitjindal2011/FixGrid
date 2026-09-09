"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { HOME_FAQS, type FaqItem } from "@/lib/home/faq-data";
import { CheckCircle2, HelpCircle } from "lucide-react";

export function FaqSection({
  eyebrow = "Direct Answers & Knowledge Hub",
  heading = "Frequently Asked Questions",
  intro = "Engineered answers addressing repair authenticity, smart escrow security, verified bench diagnostics, and warranty policies.",
}: {
  eyebrow?: string;
  heading?: string;
  intro?: string;
}) {
  return (
    <section
      className="border-t border-hairline bg-bench-sunk/30 py-20"
      aria-labelledby="home-faq-heading"
    >
      <div className="mx-auto max-w-4xl px-4">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 text-steel">
            <HelpCircle className="size-3.5 text-signal" />
            <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
              {eyebrow}
            </span>
          </div>
          <h2 id="home-faq-heading" className="mt-3 text-display">
            {heading}
          </h2>
          <p className="mx-auto mt-3 max-w-[55ch] text-base leading-relaxed text-steel">
            {intro}
          </p>
        </div>

        <div className="mt-12 rounded-machined border border-hairline bg-chalk p-6 shadow-bench sm:p-8">
          <Accordion type="single" collapsible defaultValue="what-is-fixgrid" className="w-full">
            {HOME_FAQS.map((faq, index) => (
              <AccordionItem key={faq.id} value={faq.id} className="border-b border-hairline py-1 last:border-b-0">
                <AccordionTrigger className="text-left font-display text-lg tracking-wide hover:text-signal">
                  <span className="flex items-center gap-3">
                    <span className="font-mono text-xs font-semibold text-steel-soft">
                      0{index + 1}
                    </span>
                    <span>{faq.question}</span>
                  </span>
                </AccordionTrigger>
                <AccordionContent className="pt-2 text-sm leading-relaxed text-steel">
                  {/* The direct snippet answer optimized for Google AI Overviews */}
                  <p className="font-medium text-enamel bg-bench-sunk/40 p-3.5 rounded-machined border-l-2 border-signal">
                    {faq.shortAnswer}
                  </p>

                  {faq.detailedPoints && faq.detailedPoints.length > 0 && (
                    <ul className="mt-3.5 space-y-2">
                      {faq.detailedPoints.map((point, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-verdigris" />
                          <span>{point}</span>
                        </li>
                      ))}
                    </ul>
                  )}

                  {faq.citation && (
                    <p className="mt-3 font-mono text-xs text-steel-soft italic">
                      Coverage: {faq.citation}
                    </p>
                  )}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
}
