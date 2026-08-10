"use client";

import { useId } from "react";

import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

/**
 * Label + control + error + hint, wired together.
 *
 * The point of the wrapper is the wiring, not the layout: `useId` links the
 * label to the control and points `aria-describedby` at whichever of the hint
 * and error are actually present, and `aria-invalid` is set from the same error
 * that renders visually. Doing that by hand on forty fields is where
 * accessibility quietly gets dropped.
 */
interface FieldShellProps {
  label: string;
  hint?: string;
  error?: string;
  className?: string;
  children: (props: {
    id: string;
    "aria-describedby": string | undefined;
    "aria-invalid": boolean | undefined;
  }) => React.ReactNode;
}

export function FieldShell({ label, hint, error, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  const describedBy = [hint ? hintId : null, error ? errorId : null]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="eyebrow">
        {label}
      </label>

      {children({
        id,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}

      {hint ? (
        <p id={hintId} className="text-xs leading-relaxed text-steel-soft">
          {hint}
        </p>
      ) : null}

      {error ? (
        <p id={errorId} className="text-xs font-medium text-rust">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const invalidRing = "border-rust focus:border-rust";

export function TextField({
  label,
  hint,
  error,
  className,
  ...props
}: { label: string; hint?: string; error?: string } & React.ComponentProps<"input">) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(a11y) => <Input {...a11y} {...props} className={cn(error && invalidRing)} />}
    </FieldShell>
  );
}

export function TextareaField({
  label,
  hint,
  error,
  className,
  rows = 3,
  ...props
}: { label: string; hint?: string; error?: string } & React.ComponentProps<"textarea">) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(a11y) => (
        <textarea
          {...a11y}
          rows={rows}
          className={cn(
            "w-full rounded-machined border border-hairline bg-chalk px-3 py-2 text-[0.95rem] leading-relaxed text-enamel",
            "placeholder:text-steel-soft focus:border-signal focus:outline-none",
            error && invalidRing,
          )}
          {...props}
        />
      )}
    </FieldShell>
  );
}

export function SelectField({
  label,
  hint,
  error,
  className,
  children,
  ...props
}: { label: string; hint?: string; error?: string } & React.ComponentProps<"select">) {
  return (
    <FieldShell label={label} hint={hint} error={error} className={className}>
      {(a11y) => (
        <Select {...a11y} {...props} className={cn(error && invalidRing)}>
          {children}
        </Select>
      )}
    </FieldShell>
  );
}

/**
 * Checkbox, with the label to the right where people expect it.
 *
 * Note there is no hidden companion input: the actions read presence
 * (`value === "on"`) rather than a boolean string, precisely so an unchecked box
 * being absent from the payload is the correct signal instead of a bug.
 */
export function CheckboxField({
  label,
  hint,
  className,
  ...props
}: { label: string; hint?: string } & React.ComponentProps<"input">) {
  const id = useId();
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        id={id}
        type="checkbox"
        aria-describedby={hint ? hintId : undefined}
        className="mt-0.5 size-4 shrink-0 accent-signal"
        {...props}
      />
      <div className="min-w-0">
        <label htmlFor={id} className="block text-sm font-medium text-enamel">
          {label}
        </label>
        {hint ? (
          <p id={hintId} className="mt-0.5 text-xs leading-relaxed text-steel-soft">
            {hint}
          </p>
        ) : null}
      </div>
    </div>
  );
}
