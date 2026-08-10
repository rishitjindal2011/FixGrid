"use client";

import { useActionState, useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { AlertTriangle, ArrowRight, Check, Pencil, Plus, Trash2, X } from "lucide-react";

import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { SelectField, TextField } from "@/components/admin/field";
import { Button } from "@/components/ui/button";
import { createRedirect, deleteRedirect, updateRedirect } from "@/lib/redirects/actions";
import { IDLE_FORM_STATE } from "@/lib/redirects/state";
import type { SeoRedirectRow } from "@/lib/types/database";
import { cn, formatDate } from "@/lib/utils";

/**
 * The redirect table, with inline editing.
 *
 * Editing in place rather than on a detail route because a redirect is two
 * fields and a status code — a full page for that would mean two navigations to
 * fix a typo. Only one row can be open at a time, which keeps the "which of
 * these forms am I about to submit" problem from existing at all.
 */
export function RedirectsTable({
  rows,
  canEdit,
  canDelete,
}: {
  rows: SeoRedirectRow[];
  /** Viewers still see the rules — they just get no write affordances. */
  canEdit: boolean;
  /** Deleting is owner-only; the action enforces it, this hides the button. */
  canDelete: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-steel">
          {rows.length === 0
            ? "No redirects yet."
            : `${rows.length} rule${rows.length === 1 ? "" : "s"}, newest first.`}
        </p>
        {!creating && canEdit ? (
          <Button type="button" onClick={() => setCreating(true)}>
            <Plus aria-hidden />
            New redirect
          </Button>
        ) : null}
      </div>

      {creating && canEdit ? (
        <RedirectForm
          row={null}
          onDone={() => setCreating(false)}
          onCancel={() => setCreating(false)}
        />
      ) : null}

      {rows.length > 0 ? (
        <div className="overflow-hidden rounded-machined border border-hairline bg-chalk">
          <table className="w-full border-collapse text-sm">
            <caption className="sr-only">Redirect rules</caption>
            <thead>
              <tr className="border-b border-hairline bg-bench text-left">
                <Th>Source</Th>
                <Th>Destination</Th>
                <Th className="w-20">Code</Th>
                <Th className="w-20 text-right">Hits</Th>
                <Th className="w-28">Created</Th>
                <Th className="w-px">
                  <span className="sr-only">Actions</span>
                </Th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) =>
                editing === row.id && canEdit ? (
                  <tr key={row.id}>
                    <td colSpan={6} className="border-b border-hairline p-3">
                      <RedirectForm
                        row={row}
                        onDone={() => setEditing(null)}
                        onCancel={() => setEditing(null)}
                      />
                    </td>
                  </tr>
                ) : (
                  <tr key={row.id} className="border-b border-hairline last:border-0">
                    <Td>
                      <span className="font-mono text-xs text-enamel">{row.source_url}</span>
                    </Td>
                    <Td>
                      <span className="flex min-w-0 items-center gap-1.5">
                        <ArrowRight className="size-3 shrink-0 text-steel-soft" aria-hidden />
                        <span className="truncate font-mono text-xs text-steel">
                          {row.destination_url}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <span
                        className={cn(
                          "font-mono text-xs tabular-nums",
                          row.status_code === 301 ? "text-rust" : "text-steel",
                        )}
                        title={
                          row.status_code === 301
                            ? "Permanent — browsers cache this aggressively"
                            : "Temporary"
                        }
                      >
                        {row.status_code}
                      </span>
                    </Td>
                    <Td className="text-right">
                      <span className="font-mono text-xs tabular-nums text-steel-soft">
                        {row.hit_count}
                      </span>
                    </Td>
                    <Td>
                      <span className="text-xs text-steel-soft">{formatDate(row.created_at)}</span>
                    </Td>
                    <Td>
                      <span className="flex items-center justify-end gap-1">
                        {canEdit ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditing(row.id)}
                          >
                            <Pencil aria-hidden />
                            <span className="sr-only">Edit {row.source_url}</span>
                          </Button>
                        ) : null}
                        {canDelete ? (
                          <form action={deleteRedirect}>
                            <input type="hidden" name="id" value={row.id} />
                            <ConfirmSubmit confirmLabel="Delete">
                              <Trash2 aria-hidden />
                              <span className="sr-only">Delete {row.source_url}</span>
                            </ConfirmSubmit>
                          </form>
                        ) : null}
                      </span>
                    </Td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  );
}

function RedirectForm({
  row,
  onDone,
  onCancel,
}: {
  row: SeoRedirectRow | null;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [state, formAction] = useActionState(
    row ? updateRedirect : createRedirect,
    IDLE_FORM_STATE,
  );

  /**
   * The row closes itself once the server reports success. This has to be an
   * effect, not a check during render: closing means calling the parent's
   * `setState`, and doing that mid-render is the "Cannot update a component
   * while rendering a different component" warning — plus StrictMode's double
   * render would fire it twice.
   *
   * `updateRedirect` is an edit of an existing row, so collapsing back to the
   * read-only row is right. A create keeps the form open instead, since adding
   * several redirects in a row is the common case.
   */
  useEffect(() => {
    if (state.status === "success" && row !== null) onDone();
  }, [state, row, onDone]);

  return (
    <form
      action={formAction}
      className="rounded-machined border border-hairline bg-bench p-4"
    >
      {row ? <input type="hidden" name="id" value={row.id} /> : null}

      {state.status === "error" && state.message ? (
        <p
          role="alert"
          className="mb-3 flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2 text-sm text-rust"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      ) : null}

      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_8rem]">
        <TextField
          label="Source path"
          name="source_url"
          required
          defaultValue={row?.source_url ?? ""}
          error={state.fieldErrors.source_url}
          placeholder="/old-page"
          hint="Path only, on this site."
        />
        <TextField
          label="Destination"
          name="destination_url"
          required
          defaultValue={row?.destination_url ?? ""}
          error={state.fieldErrors.destination_url}
          placeholder="/repair/phones or https://…"
          hint="A path here, or a full URL elsewhere."
        />
        <SelectField
          label="Code"
          name="status_code"
          defaultValue={String(row?.status_code ?? 301)}
          error={state.fieldErrors.status_code}
        >
          <option value="301">301 permanent</option>
          <option value="302">302 temporary</option>
          <option value="307">307 temporary</option>
          <option value="308">308 permanent</option>
        </SelectField>
      </div>

      <div className="mt-4 flex items-center gap-2">
        <SaveRedirect isNew={row === null} />
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X aria-hidden />
          Cancel
        </Button>
        {state.status === "success" && state.message ? (
          <span className="flex items-center gap-1.5 text-sm text-verdigris">
            <Check className="size-4" aria-hidden />
            {state.message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function SaveRedirect({ isNew }: { isNew: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="sm" disabled={pending}>
      {pending ? "Saving…" : isNew ? "Create redirect" : "Save"}
    </Button>
  );
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <th scope="col" className={cn("px-3 py-2 font-display text-xs uppercase tracking-wide text-steel", className)}>
      {children}
    </th>
  );
}

function Td({ children, className }: { children: React.ReactNode; className?: string }) {
  return <td className={cn("max-w-0 px-3 py-2.5 align-middle", className)}>{children}</td>;
}
