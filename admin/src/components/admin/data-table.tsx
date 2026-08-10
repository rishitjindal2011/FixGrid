import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A column definition. `cell` returns the rendered node for one row, so a
 * column can hold a badge, a link or a mono-formatted amount without this
 * component knowing anything about the row type.
 */
export interface DataColumn<T> {
  /** Stable key for React and for `key`-ing the header cell. */
  key: string;
  header: React.ReactNode;
  cell: (row: T) => React.ReactNode;
  /**
   * Right-align. Use it for every money and count column — a column of numbers
   * that does not align on the units digit cannot be scanned, which is the only
   * reason to put numbers in a table.
   */
  align?: "left" | "right";
  /** Extra classes on both the `<th>` and every `<td>` in the column. */
  className?: string;
  /** Hide below `md`. For columns that are context rather than identity. */
  hideOnMobile?: boolean;
}

/**
 * The list table every admin screen renders.
 *
 * A Server Component and generic over the row type, so a page passes its own
 * `ClaimRow[]` and gets compile-time checking on every `cell` callback. Nothing
 * here is interactive: sorting and filtering are URL state handled by the page,
 * which keeps a 200-row table at zero JavaScript.
 *
 * `empty` is required rather than optional. Every table in this app can be
 * empty on a database where the migration has not run, and a bare "No results"
 * cannot distinguish that from a filter that matched nothing.
 */
export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  empty,
  caption,
  className,
}: {
  columns: DataColumn<T>[];
  rows: readonly T[];
  /** Stable identity per row — the row's own id, never the array index. */
  getRowKey: (row: T) => string;
  /** Rendered in place of the table body when there are no rows. */
  empty: React.ReactNode;
  caption?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) return <>{empty}</>;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-machined border border-hairline bg-chalk shadow-bench",
        className,
      )}
    >
      <Table>
        {caption ? <caption className="mt-3 text-sm text-steel">{caption}</caption> : null}

        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead
                key={column.key}
                scope="col"
                className={cn(
                  column.align === "right" && "text-right",
                  column.hideOnMobile && "hidden md:table-cell",
                  column.className,
                )}
              >
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>

        <TableBody>
          {rows.map((row, index) => (
            <TableRow
              key={getRowKey(row)}
              // Zebra striping on the recessed token, not on an opacity. Dense
              // admin tables are the one place it earns its keep.
              className={index % 2 === 1 ? "bg-bench-sunk/40" : undefined}
            >
              {columns.map((column) => (
                <TableCell
                  key={column.key}
                  className={cn(
                    column.align === "right" && "text-right",
                    column.hideOnMobile && "hidden md:table-cell",
                    column.className,
                  )}
                >
                  {column.cell(row)}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
