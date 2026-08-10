import { CompactHero } from "@/components/cms/blocks/compact-hero";
import { CtaBanner } from "@/components/cms/blocks/cta-banner";
import { FaqAccordion } from "@/components/cms/blocks/faq-accordion";
import { FeatureGrid } from "@/components/cms/blocks/feature-grid";
import { HighlightsStrip } from "@/components/cms/blocks/highlights-strip";
import { RichText } from "@/components/cms/blocks/rich-text";
import { Testimonials } from "@/components/cms/blocks/testimonials";
import { TextImage } from "@/components/cms/blocks/text-image";
import { TableOfContents } from "@/components/cms/table-of-contents";

import { deriveContent } from "@/lib/cms/headings";
import type { Block } from "@/lib/cms/blocks";

/**
 * Renders a `content_sections` array.
 *
 * Dispatch is a `switch` over the discriminated union rather than a lookup
 * object keyed by string. The `never` case at the bottom makes it a COMPILE
 * error to add a block type to the schema without adding a renderer — the
 * failure mode we actually care about, since the alternative is a block that
 * silently disappears from a thousand generated pages.
 */
export function DynamicRenderer({ blocks }: { blocks: Block[] }) {
  const { blocks: prepared, headings } = deriveContent(blocks);

  return (
    <>
      {prepared.map((block, index) => {
        const key = `${block.type}-${index}`;

        switch (block.type) {
          case "compact_hero":
            return <CompactHero key={key} block={block} />;

          case "table_of_contents":
            return (
              <TableOfContents
                key={key}
                headings={headings}
                title={block.title}
                includeSubheadings={block.includeSubheadings ?? false}
              />
            );

          case "faq_accordion":
            return <FaqAccordion key={key} block={block} />;

          case "rich_text":
            return <RichText key={key} block={block} />;

          case "feature_grid":
            return <FeatureGrid key={key} block={block} />;

          case "text_image":
            return <TextImage key={key} block={block} />;

          case "testimonials":
            return <Testimonials key={key} block={block} />;

          case "cta_banner":
            return <CtaBanner key={key} block={block} />;

          case "highlights_strip":
            return <HighlightsStrip key={key} block={block} />;

          default: {
            const exhaustive: never = block;
            void exhaustive;
            return null;
          }
        }
      })}
    </>
  );
}
