"use client";

import * as React from "react";
import { LineChart as LineChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { EmptyState } from "@/components/dashboard/empty-state";
import { formatMoney, formatMoneyRounded } from "@/lib/format";

/**
 * Twelve months of takings, gross beside net.
 *
 * Recharts is a client library, so this is the one component on the earnings
 * screen that ships JavaScript. Three things it has to get right:
 *
 *   1. **Nothing may arrive from a server-only module.** `EarningsBucket` lives
 *      in `@/lib/dashboard/expert`, which imports `server-only`; restating its
 *      shape here keeps that import out of the browser bundle entirely, the
 *      same split `PendingRequestsPanel` makes for `BookingRow`.
 *
 *   2. **Every colour is a token.** Recharts' defaults are a purple nobody
 *      chose, and it applies them to bars, the grid, the axes and the tooltip
 *      independently — so each of those is passed an explicit `var(--color-…)`
 *      rather than left to the library.
 *
 *   3. **The chart is not the only way to read the numbers.** An SVG of
 *      rectangles says nothing to a screen reader, so the same data is emitted
 *      as a visually-hidden table with a one-sentence summary above it, and the
 *      drawing itself is `aria-hidden`.
 */

/**
 * One month of takings — structurally `EarningsBucket`, restated for the
 * client. Pence throughout, like everything else that touches money.
 */
export interface RevenuePoint {
  /** `YYYY-MM` in the shop's timezone. The identity, not a label. */
  month: string;
  /** "Aug 2026". */
  label: string;
  grossPence: number;
  netPence: number;
  jobs: number;
}

interface ChartRow extends RevenuePoint {
  /** "Aug" — the axis is 12 months wide and has no room for the year. */
  short: string;
  /** The month still being earned in, which is the one live figure here. */
  current: boolean;
}

/**
 * Axis labels. Mono because they are measured data, steel because they are
 * secondary to the bars they describe.
 */
const AXIS_TICK = {
  fill: "var(--color-steel)",
  fontFamily: "var(--font-mono)",
  fontSize: 11,
};

const HAIRLINE = "var(--color-hairline)";

/**
 * How far a gross bar is knocked back from its net sibling.
 *
 * Gross and net are the same money seen twice, not two independent series, so
 * they are one hue at two weights rather than two colours — which also keeps
 * signal orange meaning "this month" rather than "this series".
 */
const GROSS_OPACITY = 0.22;

export function RevenueChart({
  data,
  currency = "INR",
  currentMonth,
}: {
  data: RevenuePoint[];
  currency?: string;
  /** `YYYY-MM` for the month in progress, resolved in the shop's timezone. */
  currentMonth: string;
}) {
  const rows: ChartRow[] = data.map((point) => ({
    ...point,
    short: point.label.split(" ")[0] ?? point.label,
    current: point.month === currentMonth,
  }));

  const traded = rows.some((row) => row.grossPence > 0);

  return (
    <figure className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench sm:p-5">
      <figcaption className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <span className="eyebrow">Gross vs net · last {rows.length} months</span>
        {traded ? <ChartKey /> : null}
      </figcaption>

      {traded ? (
        <>
          <p className="sr-only">{summarise(rows, currency)}</p>

          {/* Hidden from assistive tech, and `accessibilityLayer` switched off
              with it: Recharts' layer makes the plot focusable, and a focusable
              element inside an aria-hidden subtree is a keyboard trap. The
              table below carries every value the drawing does. */}
          <div aria-hidden className="pt-5">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart
                data={rows}
                accessibilityLayer={false}
                margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                barGap={2}
                barCategoryGap="18%"
              >
                {/* Horizontal rules only. Vertical ones would fence off each
                    month and turn a trend into twelve separate readings. */}
                <CartesianGrid vertical={false} stroke={HAIRLINE} />

                <XAxis
                  dataKey="short"
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={{ stroke: HAIRLINE }}
                  tickMargin={8}
                />
                <YAxis
                  width={72}
                  tick={AXIS_TICK}
                  tickLine={false}
                  axisLine={false}
                  // Rounded to whole rupees: an axis is a sense of scale, and
                  // pence on it are noise. The tooltip carries the exact figure.
                  tickFormatter={(value) => formatMoneyRounded(Number(value), currency)}
                />

                <Tooltip
                  cursor={{ fill: "var(--color-bench-sunk)" }}
                  content={<RevenueTooltip rows={rows} currency={currency} />}
                />

                <Bar dataKey="grossPence" name="Gross" maxBarSize={14} radius={[2, 2, 0, 0]}>
                  {rows.map((row) => (
                    <Cell
                      key={row.month}
                      fill={row.current ? "var(--color-signal)" : "var(--color-enamel)"}
                      fillOpacity={GROSS_OPACITY}
                    />
                  ))}
                </Bar>

                <Bar dataKey="netPence" name="Net" maxBarSize={14} radius={[2, 2, 0, 0]}>
                  {rows.map((row) => (
                    <Cell
                      key={row.month}
                      fill={row.current ? "var(--color-signal)" : "var(--color-enamel)"}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          <RevenueDataTable rows={rows} currency={currency} />
        </>
      ) : (
        <EmptyState
          className="mt-4"
          icon={LineChartIcon}
          title="Nothing to chart yet"
          description="This fills in as jobs are completed. Each month shows what customers paid and what reached you after the platform fee."
        />
      )}
    </figure>
  );
}

/**
 * The key, in HTML rather than Recharts' `<Legend>`.
 *
 * Recharts draws its legend in SVG with its own type stack, which cannot be
 * given `font-display` or the eyebrow tracking — so it would be the one label
 * on the page in the wrong voice.
 */
function ChartKey() {
  return (
    <span className="flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <KeySwatch className="bg-enamel" style={{ opacity: GROSS_OPACITY }} label="Gross" />
      <KeySwatch className="bg-enamel" label="Net" />
      <KeySwatch className="bg-signal" label="This month" />
    </span>
  );
}

function KeySwatch({
  className,
  style,
  label,
}: {
  className: string;
  style?: React.CSSProperties;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      <span aria-hidden className={`size-2.5 rounded-[1px] ${className}`} style={style} />
      <span className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
        {label}
      </span>
    </span>
  );
}

/**
 * The hover card.
 *
 * Recharts clones this element and injects `active` and `label`, so the props
 * are optional. It looks the month back up in our own rows rather than reading
 * Recharts' payload: the payload carries the two plotted series and nothing
 * else, and the job count is worth more here than a second copy of the bars.
 */
function RevenueTooltip({
  rows,
  currency,
  active,
  label,
}: {
  rows: ChartRow[];
  currency: string;
  active?: boolean;
  label?: string;
}) {
  const row = active ? rows.find((entry) => entry.short === label) : undefined;
  if (!row) return null;

  return (
    <div className="rounded-machined border border-hairline bg-chalk px-3 py-2.5 shadow-lift">
      <p className="eyebrow">{row.label}</p>

      <dl className="grid grid-cols-[auto_auto] gap-x-5 gap-y-1 pt-2 text-xs">
        <dt className="text-steel">Gross</dt>
        <dd className="text-right font-mono tabular-nums text-enamel">
          {formatMoney(row.grossPence, currency)}
        </dd>

        <dt className="text-steel">Net</dt>
        <dd className="text-right font-mono tabular-nums text-enamel">
          {formatMoney(row.netPence, currency)}
        </dd>

        <dt className="text-steel">Jobs</dt>
        <dd className="text-right font-mono tabular-nums text-enamel">{row.jobs}</dd>
      </dl>
    </div>
  );
}

/** The chart's text alternative — the same twelve rows, read out in order. */
function RevenueDataTable({ rows, currency }: { rows: ChartRow[]; currency: string }) {
  return (
    <table className="sr-only">
      <caption>Monthly earnings, gross and net of the platform fee</caption>
      <thead>
        <tr>
          <th scope="col">Month</th>
          <th scope="col">Gross</th>
          <th scope="col">Net</th>
          <th scope="col">Jobs</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.month}>
            <th scope="row">
              {row.label}
              {row.current ? " (month in progress)" : ""}
            </th>
            <td>{formatMoney(row.grossPence, currency)}</td>
            <td>{formatMoney(row.netPence, currency)}</td>
            <td>{row.jobs}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * One sentence naming the window, the best month and where the current one
 * stands — what someone glancing at the bars would take away, written down.
 *
 * The comparison is against the previous month rather than the average, because
 * "up on last month" is the question a shop owner actually asks, and the current
 * month is still being earned in so it is described as standing rather than as
 * a total.
 */
function summarise(rows: ChartRow[], currency: string): string {
  const first = rows[0];
  const last = rows[rows.length - 1];
  if (!first || !last) return "No monthly earnings to chart yet.";

  const best = rows.reduce((peak, row) => (row.netPence > peak.netPence ? row : peak), first);
  const previous = rows[rows.length - 2];

  const window = `Net earnings by month, ${first.label} to ${last.label}.`;
  const peak = `Best month ${best.label} at ${formatMoney(best.netPence, currency)}.`;

  if (!previous) {
    return `${window} ${peak} ${last.label} stands at ${formatMoney(last.netPence, currency)}.`;
  }

  const change = last.netPence - previous.netPence;
  const direction =
    change === 0 ? "level with" : change > 0 ? "up on" : "down on";

  return (
    `${window} ${peak} ${last.label} stands at ${formatMoney(last.netPence, currency)}, ` +
    `${direction} ${previous.label} at ${formatMoney(previous.netPence, currency)}.`
  );
}
