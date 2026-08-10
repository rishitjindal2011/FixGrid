/**
 * Keyword list conversion, both directions.
 *
 * `seo_pages.keywords` and `seo_global.default_keywords` are `text[]` in
 * schema.sql and `string[]` in database.ts, and the form round-trips them
 * through a single comma-separated input. None of that would need a helper if
 * the database always agreed with the schema.
 *
 * It does not. `alter table … add column if not exists` matches on the column
 * *name* and never inspects its type, so a project provisioned while `keywords`
 * was still `text` keeps a `text` column forever — and PostgREST hands a `text`
 * column back as a bare string. `row.keywords.join(", ")` is then a TypeError
 * on a value the types insist is an array, which is exactly how this surfaced:
 * the page editor crashed on load, so the only way to repair the row was the
 * thing that was broken.
 *
 * Both directions therefore accept `unknown` and are total. The editor is the
 * last thing between an operator and a page they cannot open, so it tolerates
 * the shapes reality produces on the way in and writes back the shape the
 * schema asks for on the way out. Converting the column is still worth doing —
 * see the `keywords` block in supabase/schema.sql — but the form no longer
 * depends on it having happened.
 */

/** Mirrors `MetaSchema.keywords.max(30)` in lib/pages/actions.ts. */
const MAX_KEYWORDS = 30;

/** How Postgres renders an array when it is coerced to text: `{a,b}`. */
const PG_ARRAY_LITERAL = /^\{[\s\S]*\}$/;

/**
 * Anything → the keyword list.
 *
 * Handles the array the schema promises, the comma string a `text` column or
 * the form produces, the `{a,b}` literal of an array read as text, and the JSON
 * of a `jsonb` column. Null, objects and everything else become an empty list
 * rather than throwing — an unreadable keyword field must not cost the operator
 * the whole screen.
 */
export function toKeywordList(value: unknown): string[] {
  const seen = new Set<string>();
  for (const part of collect(value)) {
    const keyword = part.trim();
    if (keyword) seen.add(keyword);
  }
  return [...seen].slice(0, MAX_KEYWORDS);
}

/** The list → the single input's value. Inverse of `toKeywordList`. */
export function formatKeywords(value: unknown): string {
  return toKeywordList(value).join(", ");
}

function collect(value: unknown): string[] {
  if (value === null || value === undefined) return [];

  // Recurse rather than assume `string[]`: a jsonb column can hold anything,
  // including nested arrays and numbers.
  if (Array.isArray(value)) return value.flatMap((item) => collect(item));

  if (typeof value === "number" || typeof value === "boolean") return [String(value)];
  if (typeof value !== "string") return [];

  const input = value.trim();
  if (input === "") return [];

  // A `jsonb` column, or a `text` one holding JSON. Falls through to the comma
  // split when the parse fails, because a keyword may legitimately start with
  // `[` and that is not a reason to lose the field.
  if (input.startsWith("[")) {
    try {
      const parsed: unknown = JSON.parse(input);
      if (Array.isArray(parsed)) return parsed.flatMap((item) => collect(item));
    } catch {
      /* not JSON after all */
    }
  }

  // Splitting `{a,b}` on the comma mangles a quoted member containing one —
  // but the form itself splits on commas, so a keyword with a comma in it is
  // not expressible through this UI and cannot be what is stored.
  const body = PG_ARRAY_LITERAL.test(input) ? input.slice(1, -1) : input;
  return body.split(",").map(unquote);
}

/** Postgres quotes array members that need it; the quotes are not the value. */
function unquote(part: string): string {
  const trimmed = part.trim();
  if (trimmed.length > 1 && trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/\\"/g, '"');
  }
  return trimmed;
}
