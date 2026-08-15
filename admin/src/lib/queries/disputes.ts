import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import {
  OPEN_DISPUTE_STATUSES,
  type BookingStatus,
  type DisputeResolution,
  type DisputeStatus,
} from "@/lib/types/marketplace";

/**
 * One evidence file attached to a claim.
 *
 * Declared here rather than in `marketplace.ts` because this app is the only
 * thing that reads the table — the customer uploads evidence but never lists it
 * back in this shape. `storage_path` is a path inside the private bucket, not a
 * URL; rendering it needs a signed URL.
 */
export interface DisputeEvidenceRow {
  id: string;
  dispute_id: string;
  uploaded_by: string;
  storage_path: string;
  file_name: string | null;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

/**
 * Dispute reads.
 *
 * A dispute is the one place on the platform where the operator decides an
 * outcome rather than recording one, so this is the screen that has to carry
 * enough context to make that decision defensible: what was bought, what the
 * customer says went wrong, what the shop says back, and the evidence both
 * attached.
 *
 * Ordered so unresolved work surfaces first. An open dispute is somebody's money
 * held up — newest-first would bury the oldest, which is exactly backwards.
 */

/** Anything not yet decided. Shared with the pages via `marketplace.ts`. */
const OPEN_STATUSES = OPEN_DISPUTE_STATUSES;

export interface DisputeRowView {
  id: string;
  status: DisputeStatus;
  reason: string;
  desiredOutcome: string | null;
  resolution: DisputeResolution | null;
  resolutionNote: string | null;
  refundPence: number | null;
  resolvedAt: string | null;
  createdAt: string;

  bookingId: string;
  reference: string;
  bookingStatus: BookingStatus;
  currency: string;
  finalPence: number | null;

  customerId: string;
  customerName: string;
  shopId: string;
  shopName: string;
}

interface DisputeJoinRow {
  id: string;
  booking_id: string;
  raised_by: string;
  status: DisputeStatus;
  reason: string;
  desired_outcome: string | null;
  resolution: DisputeResolution | null;
  resolution_note: string | null;
  refund_amount: number | null;
  resolved_at: string | null;
  created_at: string;
  bookings: {
    id: string;
    reference: string;
    status: BookingStatus;
    customer_id: string;
    fixer_id: string;
    currency: string;
    final_amount: number | null;
    quoted_amount: number | null;
    fixer_profiles: { id: string; shop_name: string } | null;
  } | null;
}

const DISPUTE_COLUMNS = `
  id, booking_id, raised_by, status, reason, desired_outcome,
  resolution, resolution_note, refund_amount, resolved_at, created_at,
  bookings!disputes_booking_fkey (
    id, reference, status, customer_id, fixer_id, currency, final_amount, quoted_amount,
    fixer_profiles!bookings_fixer_fkey ( id, shop_name )
  )
`;

async function namesFor(ids: string[]): Promise<Map<string, string>> {
  const names = new Map<string, string>();
  const unique = [...new Set(ids)];
  if (unique.length === 0) return names;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("users")
    .select("id, display_name")
    .in("id", unique)
    .returns<Array<{ id: string; display_name: string }>>();

  if (error) {
    console.error("[disputes] party names failed", error.message);
    return names;
  }

  for (const row of data ?? []) names.set(row.id, row.display_name);
  return names;
}

function toView(row: DisputeJoinRow, customerName: string): DisputeRowView {
  return {
    id: row.id,
    status: row.status,
    reason: row.reason,
    desiredOutcome: row.desired_outcome,
    resolution: row.resolution,
    resolutionNote: row.resolution_note,
    refundPence: row.refund_amount,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,

    bookingId: row.booking_id,
    reference: row.bookings?.reference ?? "",
    bookingStatus: row.bookings?.status ?? "disputed",
    currency: row.bookings?.currency ?? "INR",
    finalPence: row.bookings?.final_amount ?? row.bookings?.quoted_amount ?? null,

    customerId: row.bookings?.customer_id ?? row.raised_by,
    customerName,
    shopId: row.bookings?.fixer_id ?? "",
    shopName: row.bookings?.fixer_profiles?.shop_name ?? "Unknown shop",
  };
}

export async function listDisputes(
  options: { status?: DisputeStatus | "open" | "all"; q?: string } = {},
): Promise<DisputeRowView[]> {
  const supabase = createAdminClient();

  let query = supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .order("created_at", { ascending: true })
    .limit(500);

  if (options.status && options.status !== "all" && options.status !== "open") {
    query = query.eq("status", options.status);
  }

  const { data, error } = await query.returns<DisputeJoinRow[]>();

  if (error) {
    console.error("[disputes] list failed", error.message);
    return [];
  }

  const rows = data ?? [];
  const names = await namesFor(
    rows.map((row) => row.bookings?.customer_id ?? row.raised_by),
  );

  let views = rows.map((row) =>
    toView(row, names.get(row.bookings?.customer_id ?? row.raised_by) ?? "Unknown account"),
  );

  if (options.status === "open") {
    views = views.filter((view) => OPEN_STATUSES.includes(view.status));
  }

  const needle = options.q?.trim().toLowerCase();
  if (needle) {
    views = views.filter((view) =>
      [view.reference, view.customerName, view.shopName, view.reason]
        .filter((field): field is string => Boolean(field))
        .some((field) => field.toLowerCase().includes(needle)),
    );
  }

  // Unresolved first, each group already oldest-first from SQL.
  return [
    ...views.filter((view) => OPEN_STATUSES.includes(view.status)),
    ...views.filter((view) => !OPEN_STATUSES.includes(view.status)),
  ];
}

export interface DisputeMessageView {
  id: string;
  authorRole: "customer" | "shop" | "admin";
  authorName: string;
  body: string;
  createdAt: string;
}

export interface DisputeDetailView extends DisputeRowView {
  messages: DisputeMessageView[];
  evidence: DisputeEvidenceRow[];
}

export async function getDispute(id: string): Promise<DisputeDetailView | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("disputes")
    .select(DISPUTE_COLUMNS)
    .eq("id", id)
    .maybeSingle<DisputeJoinRow>();

  if (error) {
    console.error("[disputes] detail failed", error.message);
    return null;
  }
  if (!data) return null;

  const customerId = data.bookings?.customer_id ?? data.raised_by;

  const [names, messagesResult, evidenceResult] = await Promise.all([
    namesFor([customerId]),
    supabase
      .from("dispute_messages")
      .select("id, author_id, author_role, body, created_at")
      .eq("dispute_id", id)
      .order("created_at", { ascending: true })
      .returns<
        Array<{
          id: string;
          author_id: string | null;
          author_role: "customer" | "shop" | "admin";
          body: string;
          created_at: string;
        }>
      >(),
    supabase
      .from("dispute_evidence")
      .select(
        "id, dispute_id, uploaded_by, storage_path, file_name, mime_type, size_bytes, created_at",
      )
      .eq("dispute_id", id)
      .order("created_at", { ascending: true })
      .returns<DisputeEvidenceRow[]>(),
  ]);

  if (messagesResult.error) {
    console.error("[disputes] transcript failed", messagesResult.error.message);
  }
  if (evidenceResult.error) {
    console.error("[disputes] evidence failed", evidenceResult.error.message);
  }

  const customerName = names.get(customerId) ?? "Unknown account";
  const shopName = data.bookings?.fixer_profiles?.shop_name ?? "The shop";

  return {
    ...toView(data, customerName),
    // Author names come from the role, not a per-message lookup: a shop answers
    // under its trading name rather than whichever member of staff typed, and
    // the platform answers as itself.
    messages: (messagesResult.data ?? []).map((message) => ({
      id: message.id,
      authorRole: message.author_role,
      authorName:
        message.author_role === "shop"
          ? shopName
          : message.author_role === "admin"
            ? "Fix-It Registry"
            : customerName,
      body: message.body,
      createdAt: message.created_at,
    })),
    evidence: evidenceResult.data ?? [],
  };
}

export interface DisputeSummary {
  open: number;
  awaiting: number;
  resolved: number;
  refundedPence: number;
}

export async function getDisputeSummary(): Promise<DisputeSummary> {
  const empty: DisputeSummary = { open: 0, awaiting: 0, resolved: 0, refundedPence: 0 };
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("disputes")
    .select("status, refund_amount")
    .limit(2000)
    .returns<Array<{ status: DisputeStatus; refund_amount: number | null }>>();

  if (error) {
    console.error("[disputes] summary failed", error.message);
    return empty;
  }

  const summary = { ...empty };
  for (const row of data ?? []) {
    if (row.status === "resolved") {
      summary.resolved += 1;
      summary.refundedPence += row.refund_amount ?? 0;
    } else if (row.status === "awaiting_customer" || row.status === "awaiting_shop") {
      summary.awaiting += 1;
      summary.open += 1;
    } else if (OPEN_STATUSES.includes(row.status)) {
      summary.open += 1;
    }
  }

  return summary;
}
