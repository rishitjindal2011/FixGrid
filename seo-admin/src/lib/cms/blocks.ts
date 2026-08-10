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

/* ── Admin-side strict validation ─────────────────────────────────────────── */

/**
 * NOTE: this file is a byte-for-byte copy of `src/lib/cms/blocks.ts` in the
 * consumer app, plus the strict validator below. The two apps deploy
 * independently and cannot share a module, and a symlink would break on
 * Windows and in most CI checkouts. If a block schema changes, change both —
 * the consumer app is the source of truth.
 *
 * The renderer is lenient by design (drop the bad block, render the page). The
 * editor must be the opposite: refuse to save something the renderer will
 * silently discard, and say exactly which block and which field is wrong.
 * Lenient-in, strict-out — the leniency exists to survive bad data already in
 * the database, not to let more of it in.
 */

export interface BlockValidationIssue {
  /** Index in `content_sections`, or -1 for a whole-document problem. */
  index: number;
  type: string;
  message: string;
}

export type ValidationResult =
  | { ok: true; blocks: Block[] }
  | { ok: false; issues: BlockValidationIssue[] };

export function validateContentSections(input: unknown): ValidationResult {
  if (!Array.isArray(input)) {
    return {
      ok: false,
      issues: [{ index: -1, type: "document", message: "Content must be a JSON array of blocks." }],
    };
  }

  const blocks: Block[] = [];
  const issues: BlockValidationIssue[] = [];

  input.forEach((candidate, index) => {
    const type =
      candidate && typeof candidate === "object" && "type" in candidate
        ? String((candidate as { type: unknown }).type)
        : "(missing type)";

    const result = BlockSchema.safeParse(candidate);
    if (result.success) {
      blocks.push(result.data);
      return;
    }

    for (const issue of result.error.issues) {
      issues.push({
        index,
        type,
        message: `${issue.path.join(".") || "(root)"}: ${issue.message}`,
      });
    }
  });

  // More than one hero means more than one h1, which is a real SEO defect and
  // not something the renderer can fix on its own.
  const heroCount = blocks.filter((block) => block.type === "compact_hero").length;
  if (heroCount > 1) {
    issues.push({
      index: -1,
      type: "document",
      message: `Found ${heroCount} compact_hero blocks. A page must have exactly one h1.`,
    });
  }

  return issues.length > 0 ? { ok: false, issues } : { ok: true, blocks };
}

/** Every block type, for the editor's "insert block" menu. */
export const BLOCK_TYPES: readonly BlockType[] = [
  "compact_hero",
  "table_of_contents",
  "rich_text",
  "highlights_strip",
  "feature_grid",
  "text_image",
  "testimonials",
  "faq_accordion",
  "cta_banner",
];

/** Minimal valid instance of each block, used by the "add block" action. */
export const BLOCK_TEMPLATES: Record<BlockType, Block> = {
  compact_hero: { type: "compact_hero", eyebrow: "Section", heading: "Page heading" },
  table_of_contents: { type: "table_of_contents", title: "On this page" },
  rich_text: {
    type: "rich_text",
    html: "<h2>Section heading</h2>\n<p>Write the section here.</p>",
    width: "prose",
  },
  // These are typed as `Block`, i.e. the *output* of the schemas, so fields
  // with `.default()` must be written out explicitly here. That is deliberate:
  // if a default changes, this table stops compiling.
  highlights_strip: {
    type: "highlights_strip",
    items: [
      { label: "Typical cost", value: "$60–$120" },
      { label: "Turnaround", value: "1–3 days" },
    ],
  },
  feature_grid: {
    type: "feature_grid",
    title: "What's included",
    columns: 3,
    items: [{ title: "Item", body: "Describe it." }],
  },
  text_image: {
    type: "text_image",
    heading: "Heading",
    body: "<p>Body copy.</p>",
    image: { src: "https://example.com/image.jpg", alt: "" },
    side: "right",
  },
  testimonials: {
    type: "testimonials",
    items: [{ quote: "It was fixed the same day.", author: "Customer" }],
  },
  faq_accordion: {
    type: "faq_accordion",
    title: "Common questions",
    items: [{ question: "A question?", answer: "The answer." }],
  },
  cta_banner: {
    type: "cta_banner",
    heading: "Find a repair expert",
    cta: { label: "Browse the directory", href: "/search" },
    // `tone` carries a Zod `.default()`, so it is optional on the way in but
    // required on the way out — and `Block` is the *output* type. Templates
    // therefore have to spell out every defaulted field explicitly.
    tone: "enamel",
  },
};
