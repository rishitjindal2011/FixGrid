import { z } from "zod";

/**
 * Schemas for `seo_pages.content_sections`.
 *
 * These pages are generated in bulk by the seeding engine and hand-edited in
 * the admin, so malformed blocks are a matter of when, not if. The parser is
 * built to survive them: one bad block is dropped, the rest of the page still
 * renders. A programmatic SEO surface that 500s on a typo is worse than one
 * that quietly renders eight of nine sections.
 */

const CtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().min(1),
  variant: z.enum(["primary", "secondary", "outline", "ghost"]).optional(),
});

const ImageSchema = z.object({
  src: z.string().min(1),
  alt: z.string().default(""),
  width: z.number().optional(),
  height: z.number().optional(),
});

/* ── Block schemas ────────────────────────────────────────────────────────── */

export const CompactHeroSchema = z.object({
  type: z.literal("compact_hero"),
  eyebrow: z.string().optional(),
  heading: z.string().min(1),
  subtitle: z.string().optional(),
  ctas: z.array(CtaSchema).max(3).optional(),
});

export const TableOfContentsSchema = z.object({
  type: z.literal("table_of_contents"),
  title: z.string().optional(),
  /** Include h3s beneath each h2. Off by default — long pages get noisy. */
  includeSubheadings: z.boolean().optional(),
});

export const FaqAccordionSchema = z.object({
  type: z.literal("faq_accordion"),
  title: z.string().optional(),
  items: z
    .array(z.object({ question: z.string().min(1), answer: z.string().min(1) }))
    .min(1),
});

export const RichTextSchema = z.object({
  type: z.literal("rich_text"),
  html: z.string(),
  width: z.enum(["prose", "wide"]).default("prose"),
});

export const FeatureGridSchema = z.object({
  type: z.literal("feature_grid"),
  title: z.string().optional(),
  intro: z.string().optional(),
  columns: z.union([z.literal(2), z.literal(3), z.literal(4)]).default(3),
  items: z
    .array(
      z.object({
        icon: z.string().optional(),
        title: z.string().min(1),
        body: z.string().default(""),
      }),
    )
    .min(1),
});

export const TextImageSchema = z.object({
  type: z.literal("text_image"),
  heading: z.string().min(1),
  body: z.string().default(""),
  image: ImageSchema,
  side: z.enum(["left", "right"]).default("right"),
  cta: CtaSchema.optional(),
});

export const TestimonialsSchema = z.object({
  type: z.literal("testimonials"),
  title: z.string().optional(),
  items: z
    .array(
      z.object({
        quote: z.string().min(1),
        author: z.string().min(1),
        role: z.string().optional(),
        rating: z.number().min(1).max(5).optional(),
      }),
    )
    .min(1),
});

export const CtaBannerSchema = z.object({
  type: z.literal("cta_banner"),
  heading: z.string().min(1),
  body: z.string().optional(),
  cta: CtaSchema,
  tone: z.enum(["signal", "enamel"]).default("enamel"),
});

export const HighlightsStripSchema = z.object({
  type: z.literal("highlights_strip"),
  items: z
    .array(z.object({ value: z.string().min(1), label: z.string().min(1) }))
    .min(2)
    .max(5),
});

export const BlockSchema = z.discriminatedUnion("type", [
  CompactHeroSchema,
  TableOfContentsSchema,
  FaqAccordionSchema,
  RichTextSchema,
  FeatureGridSchema,
  TextImageSchema,
  TestimonialsSchema,
  CtaBannerSchema,
  HighlightsStripSchema,
]);

export const ContentSectionsSchema = z.array(BlockSchema);

/* ── Inferred types ───────────────────────────────────────────────────────── */

export type Block = z.infer<typeof BlockSchema>;
export type BlockType = Block["type"];
export type CompactHeroBlock = z.infer<typeof CompactHeroSchema>;
export type TableOfContentsBlock = z.infer<typeof TableOfContentsSchema>;
export type FaqAccordionBlock = z.infer<typeof FaqAccordionSchema>;
export type RichTextBlock = z.infer<typeof RichTextSchema>;
export type FeatureGridBlock = z.infer<typeof FeatureGridSchema>;
export type TextImageBlock = z.infer<typeof TextImageSchema>;
export type TestimonialsBlock = z.infer<typeof TestimonialsSchema>;
export type CtaBannerBlock = z.infer<typeof CtaBannerSchema>;
export type HighlightsStripBlock = z.infer<typeof HighlightsStripSchema>;

/* ── Parsing ──────────────────────────────────────────────────────────────── */

/**
 * Parse `content_sections` leniently.
 *
 * Validates block-by-block so a single bad entry is dropped instead of taking
 * the page down. Failures are logged server-side with the index and the reason
 * so they're findable in logs rather than silently invisible.
 */
export function parseContentSections(input: unknown): Block[] {
  if (!Array.isArray(input)) {
    if (input != null) {
      console.warn("[cms] content_sections is not an array; rendering nothing.");
    }
    return [];
  }

  const blocks: Block[] = [];

  input.forEach((candidate, index) => {
    const result = BlockSchema.safeParse(candidate);
    if (result.success) {
      blocks.push(result.data);
      return;
    }

    const reason = result.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("; ");
    const type =
      candidate && typeof candidate === "object" && "type" in candidate
        ? String((candidate as { type: unknown }).type)
        : "unknown";
    console.warn(`[cms] Dropped block #${index} (type="${type}") — ${reason}`);
  });

  return blocks;
}

/**
 * Gather every FAQ item across the page.
 *
 * The original spec had the accordion inject its own FAQPage JSON-LD from the
 * client. Two problems: client-injected structured data is unreliable for
 * crawlers, and two accordions on one page would emit two competing FAQPage
 * nodes. Collecting here lets the page emit exactly one, server-side.
 */
export function collectFaqItems(blocks: Block[]): Array<{ question: string; answer: string }> {
  return blocks.flatMap((block) => (block.type === "faq_accordion" ? block.items : []));
}

/** True when the page supplies its own h1, so the route shouldn't add one. */
export function hasHeroBlock(blocks: Block[]): boolean {
  return blocks.some((block) => block.type === "compact_hero");
}
