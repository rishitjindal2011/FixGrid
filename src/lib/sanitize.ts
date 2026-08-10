import DOMPurify from "isomorphic-dompurify";

/**
 * HTML sanitisation for the `rich_text` CMS block.
 *
 * The block renders with `dangerouslySetInnerHTML`, so this is the only thing
 * standing between a compromised admin account (or a careless paste from Word)
 * and stored XSS on every programmatic page. Sanitise on render, not just on
 * save: rows can be written by the seeding script, by psql, or by a future
 * admin tool that forgets to sanitise.
 */

const ALLOWED_TAGS = [
  "p", "br", "hr", "span", "div",
  "h2", "h3", "h4", "h5", "h6",
  "strong", "b", "em", "i", "u", "s", "mark", "small", "sub", "sup",
  "ul", "ol", "li",
  "blockquote", "q", "cite",
  "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
  "code", "pre", "kbd", "abbr", "time",
];

const ALLOWED_ATTR = [
  "href", "target", "rel",
  "src", "alt", "width", "height", "loading", "decoding",
  "id", "class", "title",
  "colspan", "rowspan", "scope",
  "datetime", "cite", "lang", "dir",
];

/** Sanitise CMS-authored HTML for `dangerouslySetInnerHTML`. */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // h1 belongs to the page's hero block. Allowing a second one from body
    // copy is a real SEO regression, so it is stripped along with anything
    // that could execute or navigate the frame.
    FORBID_TAGS: ["h1", "script", "style", "iframe", "form", "input", "button", "object", "embed"],
    FORBID_ATTR: ["style", "srcset", "formaction", "ping"],
    ALLOW_DATA_ATTR: false,
    USE_PROFILES: { html: true },
  });
}

/**
 * Force every outbound link in sanitised HTML to open safely.
 * DOMPurify strips `javascript:` URLs; this adds the `rel` hardening that
 * `target="_blank"` requires.
 */
export function hardenLinks(html: string): string {
  return html.replace(/<a\s([^>]*)>/gi, (match, attrs: string) => {
    if (/\btarget\s*=/i.test(attrs) && !/\brel\s*=/i.test(attrs)) {
      return `<a ${attrs} rel="noopener noreferrer">`;
    }
    return match;
  });
}

/** Sanitise and harden in one pass — what the rich_text block calls. */
export function prepareRichText(dirty: string): string {
  return hardenLinks(sanitizeHtml(dirty));
}

/**
 * Strip all markup to produce meta descriptions / TOC labels from rich HTML.
 * Collapses whitespace so the result is single-line.
 */
export function toPlainText(dirty: string): string {
  const stripped = DOMPurify.sanitize(dirty, { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
  return stripped.replace(/\s+/g, " ").trim();
}
