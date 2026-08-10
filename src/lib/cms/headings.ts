import { slugifyHeading } from "@/lib/utils";
import type { Block } from "@/lib/cms/blocks";

/**
 * Heading extraction for the table of contents.
 *
 * The original spec had the TOC "auto-scan the DOM for h2/h3 IDs" on the
 * client. That approach has three failure modes we hit immediately at scale:
 * the scan runs after paint so the nav visibly pops in, the ids have to be
 * authored by hand in the CMS HTML (they never are), and server and client
 * disagree during hydration.
 *
 * Instead we do it once, on the server: walk the rich_text HTML, inject a
 * deterministic id into every h2/h3, and return the same list we injected.
 * The ids and the nav are produced by a single pass, so they cannot drift.
 */

export interface Heading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface DerivedContent {
  /** Blocks with ids injected into rich_text HTML. */
  blocks: Block[];
  headings: Heading[];
}

/** Strip tags and decode the handful of entities that appear in headings. */
function toText(html: string): string {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const HEADING_RE = /<(h2|h3)(\s[^>]*)?>([\s\S]*?)<\/\1>/gi;
const EXISTING_ID_RE = /\sid\s*=\s*["']([^"']+)["']/i;

/**
 * Inject ids into h2/h3 elements and collect them.
 *
 * Runs on server-rendered CMS HTML that has already been sanitised, so a regex
 * is adequate here and avoids shipping a full HTML parser. Ids already present
 * in the source are respected rather than overwritten, so an author can pin a
 * permalink.
 */
export function deriveContent(blocks: Block[]): DerivedContent {
  const headings: Heading[] = [];
  const used = new Set<string>();

  const uniqueId = (base: string): string => {
    const seed = base || "section";
    if (!used.has(seed)) {
      used.add(seed);
      return seed;
    }
    let counter = 2;
    while (used.has(`${seed}-${counter}`)) counter += 1;
    const id = `${seed}-${counter}`;
    used.add(id);
    return id;
  };

  const nextBlocks = blocks.map((block) => {
    if (block.type !== "rich_text") return block;

    const html = block.html.replace(
      HEADING_RE,
      (match, tag: string, attrs: string | undefined, inner: string) => {
        const text = toText(inner);
        if (!text) return match;

        const level = tag.toLowerCase() === "h2" ? 2 : 3;
        const existing = attrs ? EXISTING_ID_RE.exec(attrs) : null;
        const id = existing?.[1] ? uniqueId(existing[1]) : uniqueId(slugifyHeading(text));

        headings.push({ id, text, level: level as 2 | 3 });

        if (existing) return match;

        const rest = attrs ?? "";
        return `<${tag}${rest} id="${id}">${inner}</${tag}>`;
      },
    );

    return { ...block, html };
  });

  return { blocks: nextBlocks, headings };
}
