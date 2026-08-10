import { prepareRichText } from "@/lib/sanitize";
import { cn } from "@/lib/utils";
import type { RichTextBlock } from "@/lib/cms/blocks";

/**
 * CMS-authored HTML.
 *
 * Sanitised at RENDER time, not only at save time. Rows reach this table from
 * the admin, the seeding script, and psql, and only one of those three is
 * guaranteed to have sanitised anything.
 */
export function RichText({ block }: { block: RichTextBlock }) {
  const html = prepareRichText(block.html);
  if (!html.trim()) return null;

  return (
    <section className="mx-auto w-full px-4 py-10">
      <div
        className={cn(
          "prose prose-registry mx-auto",
          block.width === "wide" ? "max-w-4xl" : "max-w-2xl",
        )}
        // Sanitised immediately above; ids for the TOC were injected server-side.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </section>
  );
}
