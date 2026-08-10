import type { Thing, WithContext } from "@/lib/seo/jsonld";

/**
 * Emit a JSON-LD block.
 *
 * Next.js hoists `<script>` tags rendered from Server Components into the
 * document, so this is the supported way to inject structured data — no
 * `next/head`, no `useEffect` DOM mutation, and it survives streaming.
 *
 * `<` is escaped to `<` so a string field containing `</script>` cannot
 * break out of the tag.
 */
export function JsonLd({ data }: { data: WithContext<Thing> | WithContext<Thing>[] }) {
  const payload = JSON.stringify(data).replace(/</g, "\\u003c");

  return (
    <script
      type="application/ld+json"
      // Content is serialised by us from typed builders, never raw user input.
      dangerouslySetInnerHTML={{ __html: payload }}
    />
  );
}
