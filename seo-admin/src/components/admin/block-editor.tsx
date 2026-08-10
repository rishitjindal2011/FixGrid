"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Code2, Copy, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { BLOCK_TEMPLATES, BLOCK_TYPES, type BlockType } from "@/lib/cms/blocks";
import type { BlockValidationIssue } from "@/lib/cms/blocks";
import { cn } from "@/lib/utils";

/**
 * The block editor.
 *
 * Design decision worth stating plainly: this is a *structured JSON* editor,
 * not a WYSIWYG. Blocks are added, reordered and deleted with buttons; the
 * fields inside each block are edited as JSON in a textarea.
 *
 * That is a deliberate trade, not a shortcut. A form-per-block-type would need
 * nine bespoke forms that must be kept in lockstep with nine Zod schemas, and
 * every schema change would silently leave a form behind. The schema is already
 * the contract — the editor validates against it on save and points at the exact
 * block and field that failed, which is the part that actually prevents broken
 * pages. Content authors work in `rich_text` HTML anyway.
 *
 * What the UI does add over a single giant textarea, and why:
 *   • one textarea per block, so a syntax error is scoped to one block
 *   • move/duplicate/delete, so ordering never means cut-and-paste
 *   • per-block error display, driven by `validateContentSections` on the server
 *   • a live JSON-parse indicator per block, before you ever hit save
 */

interface EditorBlock {
  /** Stable key for React. Not persisted — the array index is the identity. */
  key: string;
  /** Raw JSON text. Kept as text so a half-typed edit is never lost. */
  text: string;
}

let keyCounter = 0;
function nextKey(): string {
  keyCounter += 1;
  return `block-${keyCounter}`;
}

function toEditorBlocks(value: unknown): EditorBlock[] {
  if (!Array.isArray(value)) return [];
  return value.map((block) => ({ key: nextKey(), text: JSON.stringify(block, null, 2) }));
}

/** The `type` field, if the text currently parses. Used for the block heading. */
function readType(text: string): { type: string; valid: boolean } {
  try {
    const parsed: unknown = JSON.parse(text);
    if (parsed && typeof parsed === "object" && "type" in parsed) {
      return { type: String((parsed as { type: unknown }).type), valid: true };
    }
    return { type: "(no type)", valid: true };
  } catch {
    return { type: "invalid JSON", valid: false };
  }
}

export function BlockEditor({
  name,
  initialValue,
  issues,
}: {
  /** Form field name — the whole array is submitted as one JSON string. */
  name: string;
  initialValue: unknown;
  issues: BlockValidationIssue[];
}) {
  const [blocks, setBlocks] = useState<EditorBlock[]>(() => toEditorBlocks(initialValue));
  const [adding, setAdding] = useState(false);

  /**
   * The hidden field is what actually submits. Each block's text is spliced
   * into an array literal rather than `JSON.parse`d and re-stringified, so a
   * block that does not currently parse still round-trips to the server and
   * comes back as a legible error instead of vanishing on save.
   */
  const serialized = useMemo(
    () => `[${blocks.map((block) => block.text.trim()).filter(Boolean).join(",")}]`,
    [blocks],
  );

  /** Server issues, grouped by the block index they refer to. */
  const issuesByIndex = useMemo(() => {
    const map = new Map<number, BlockValidationIssue[]>();
    for (const issue of issues) {
      const list = map.get(issue.index);
      if (list) list.push(issue);
      else map.set(issue.index, [issue]);
    }
    return map;
  }, [issues]);

  const documentIssues = issuesByIndex.get(-1) ?? [];

  function update(index: number, text: string) {
    setBlocks((current) =>
      current.map((block, i) => (i === index ? { ...block, text } : block)),
    );
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    setBlocks((current) => {
      if (target < 0 || target >= current.length) return current;
      const next = [...current];
      const a = next[index];
      const b = next[target];
      if (!a || !b) return current;
      next[index] = b;
      next[target] = a;
      return next;
    });
  }

  function remove(index: number) {
    setBlocks((current) => current.filter((_, i) => i !== index));
  }

  function duplicate(index: number) {
    setBlocks((current) => {
      const source = current[index];
      if (!source) return current;
      const next = [...current];
      next.splice(index + 1, 0, { key: nextKey(), text: source.text });
      return next;
    });
  }

  function add(type: BlockType) {
    setBlocks((current) => [
      ...current,
      { key: nextKey(), text: JSON.stringify(BLOCK_TEMPLATES[type], null, 2) },
    ]);
    setAdding(false);
  }

  return (
    <div className="flex flex-col gap-3">
      <input type="hidden" name={name} value={serialized} />

      {documentIssues.length > 0 ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm text-rust"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <ul className="min-w-0 space-y-1">
            {documentIssues.map((issue, i) => (
              <li key={i}>{issue.message}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {blocks.length === 0 ? (
        <p className="rounded-machined border border-dashed border-hairline bg-bench px-4 py-8 text-center text-sm text-steel">
          No blocks yet. Add a compact hero first — it supplies the page&rsquo;s h1.
        </p>
      ) : null}

      {blocks.map((block, index) => {
        const { type, valid } = readType(block.text);
        const blockIssues = issuesByIndex.get(index) ?? [];

        return (
          <div
            key={block.key}
            className={cn(
              "rounded-machined border bg-chalk",
              blockIssues.length > 0 || !valid ? "border-rust/50" : "border-hairline",
            )}
          >
            <div className="flex flex-wrap items-center gap-2 border-b border-hairline px-3 py-2">
              <span className="font-mono text-xs tabular-nums text-steel-soft">
                {String(index + 1).padStart(2, "0")}
              </span>
              <Code2 className="size-3.5 shrink-0 text-steel-soft" aria-hidden />
              <span
                className={cn(
                  "min-w-0 flex-1 truncate font-mono text-xs uppercase tracking-[0.14em]",
                  valid ? "text-enamel" : "text-rust",
                )}
              >
                {type}
              </span>

              <span className="flex items-center gap-0.5">
                <IconButton
                  label={`Move block ${index + 1} up`}
                  onClick={() => move(index, -1)}
                  disabled={index === 0}
                >
                  <ChevronUp className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Move block ${index + 1} down`}
                  onClick={() => move(index, 1)}
                  disabled={index === blocks.length - 1}
                >
                  <ChevronDown className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Duplicate block ${index + 1}`}
                  onClick={() => duplicate(index)}
                >
                  <Copy className="size-4" aria-hidden />
                </IconButton>
                <IconButton
                  label={`Delete block ${index + 1}`}
                  onClick={() => remove(index)}
                  className="hover:bg-rust-wash hover:text-rust"
                >
                  <Trash2 className="size-4" aria-hidden />
                </IconButton>
              </span>
            </div>

            <textarea
              value={block.text}
              onChange={(event) => update(index, event.target.value)}
              spellCheck={false}
              aria-label={`Block ${index + 1} JSON`}
              rows={Math.min(24, Math.max(6, block.text.split("\n").length + 1))}
              className="w-full resize-y bg-transparent px-3 py-2.5 font-mono text-xs leading-relaxed text-enamel focus:outline-none"
            />

            {blockIssues.length > 0 ? (
              <ul className="border-t border-rust/20 bg-rust-wash px-3 py-2 text-xs text-rust">
                {blockIssues.map((issue, i) => (
                  <li key={i} className="font-mono">
                    {issue.message}
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}

      {adding ? (
        <div className="rounded-machined border border-hairline bg-chalk p-3">
          <p className="eyebrow mb-2">Insert block</p>
          <div className="flex flex-wrap gap-2">
            {BLOCK_TYPES.map((type) => (
              <Button key={type} type="button" variant="outline" size="sm" onClick={() => add(type)}>
                {type.replace(/_/g, " ")}
              </Button>
            ))}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2"
            onClick={() => setAdding(false)}
          >
            Cancel
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => setAdding(true)} className="self-start">
          <Plus aria-hidden />
          Add block
        </Button>
      )}
    </div>
  );
}

/**
 * `type="button"` matters more than it looks: inside a form, an unqualified
 * button submits, so "move block down" would save the page.
 */
function IconButton({
  label,
  onClick,
  disabled,
  className,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={label}
      aria-label={label}
      className={cn(
        "grid size-7 place-items-center rounded-machined text-steel transition-colors",
        "hover:bg-bench-sunk hover:text-enamel disabled:pointer-events-none disabled:opacity-30",
        className,
      )}
    >
      {children}
    </button>
  );
}
