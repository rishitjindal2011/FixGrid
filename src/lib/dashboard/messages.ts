import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  BookingStatus,
  MessageAttachmentRow,
  MessageThreadRow,
} from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * The message inbox, for both sides of a booking.
 *
 * One decision shapes this whole file: **RLS is the scope, not a `where`
 * clause.** `message_threads` carries `customer_id` (a user) and `fixer_id` (a
 * shop), so "my threads" is `customer_id = auth.uid() OR owns_shop(fixer_id)` —
 * the second half needs a join to `fixer_profiles.owner_id` that no PostgREST
 * filter can express. The policy in `policies-marketplace.sql` already says
 * exactly that, so the queries here add no owner predicate and let it do the
 * work. That is also what makes one function serve a customer and a shop owner
 * without branching on who is asking.
 *
 * `userId` is still threaded through, for two things RLS cannot decide: which
 * party is "the other one", and which messages are unread (a message you sent
 * yourself is never unread to you).
 *
 * As everywhere in this directory, every read degrades to `[]`/`null`. Before
 * the migration these tables do not exist, and an inbox that renders "no
 * conversations yet" is a far better failure than a 500.
 */

/* ── Inbox list ───────────────────────────────────────────────────────────── */

export interface ThreadSummary {
  id: string;
  bookingId: string;
  bookingReference: string;
  /** The shop's name to a customer; the customer's name to a shop. */
  otherPartyName: string;
  otherPartyAvatar: string | null;
  lastMessageAt: string | null;
  /** Null when the thread is empty, or older than the preview window below. */
  lastMessagePreview: string | null;
  unreadCount: number;
  bookingStatus: BookingStatus;
}

interface ThreadJoinRow {
  id: string;
  booking_id: string;
  customer_id: string;
  fixer_id: string;
  last_message_at: string | null;
  created_at: string;
  bookings: {
    reference: string;
    status: BookingStatus;
    fixer_profiles: {
      shop_name: string;
      photos: string[];
    } | null;
  } | null;
}

/**
 * How many recent messages are pulled to build previews.
 *
 * Bounded because a preview is cosmetic: PostgREST has no `distinct on`, so
 * "the latest message per thread" means folding a recent slice in memory. A
 * thread whose last message falls outside the window renders without a preview
 * and is otherwise untouched — ordering comes from `last_message_at`, which the
 * `messages_touch_thread` trigger maintains, so a missing preview can never
 * reorder the inbox.
 */
const PREVIEW_WINDOW = 400;

/** Ceiling on the unread scan. Past this the badge would say "99+" anyway. */
const UNREAD_SCAN_LIMIT = 1000;

const PREVIEW_LENGTH = 140;

export async function listThreads(userId: string, limit = 50): Promise<ThreadSummary[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_threads")
    .select(
      `id, booking_id, customer_id, fixer_id, last_message_at, created_at,
       bookings!message_threads_booking_fkey (
         reference, status,
         fixer_profiles!bookings_fixer_fkey ( shop_name, photos )
       )`,
    )
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(limit)
    .returns<ThreadJoinRow[]>();

  if (error) {
    logReadFailure("[messages] thread list failed", error);
    return [];
  }

  const threads = data ?? [];
  if (threads.length === 0) return [];

  const threadIds = threads.map((thread) => thread.id);

  // The customer's name is only needed when the caller is the shop, but working
  // that out per-thread and issuing one lookup each would be N round-trips for
  // a table read that costs one.
  const customerIds = threads
    .filter((thread) => thread.customer_id !== userId)
    .map((thread) => thread.customer_id);

  const [previews, unread, people] = await Promise.all([
    fetchPreviews(threadIds),
    fetchUnreadCounts(threadIds, userId),
    fetchPeople(customerIds),
  ]);

  return (
    threads
      .map((thread) => {
        const viewerIsCustomer = thread.customer_id === userId;
        const shop = thread.bookings?.fixer_profiles ?? null;
        const person = people.get(thread.customer_id);

        const summary: ThreadSummary = {
          id: thread.id,
          bookingId: thread.booking_id,
          bookingReference: thread.bookings?.reference ?? "",
          otherPartyName: viewerIsCustomer
            ? (shop?.shop_name ?? "This shop")
            : (person?.displayName ?? "Customer"),
          otherPartyAvatar: viewerIsCustomer
            ? (shop?.photos?.[0] ?? null)
            : (person?.avatarUrl ?? null),
          lastMessageAt: thread.last_message_at,
          lastMessagePreview: previews.get(thread.id) ?? null,
          unreadCount: unread.get(thread.id) ?? 0,
          bookingStatus: thread.bookings?.status ?? "requested",
        };

        // A thread with no messages sorts by when it was opened, which is when
        // its booking was requested. `nullsFirst: false` above only pushes
        // those to the end; this puts them in the right place among the rest.
        return { summary, activity: thread.last_message_at ?? thread.created_at };
      })
      .sort((a, b) => b.activity.localeCompare(a.activity))
      .map((entry) => entry.summary)
  );
}

async function fetchPreviews(threadIds: string[]): Promise<Map<string, string>> {
  const previews = new Map<string, string>();
  if (threadIds.length === 0) return previews;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("thread_id, body, created_at")
    .in("thread_id", threadIds)
    .order("created_at", { ascending: false })
    .limit(PREVIEW_WINDOW)
    .returns<Array<{ thread_id: string; body: string; created_at: string }>>();

  if (error) {
    logReadFailure("[messages] preview fold failed", error);
    return previews;
  }

  // Descending, so the first row seen for a thread is its latest message.
  for (const row of data ?? []) {
    if (previews.has(row.thread_id)) continue;
    previews.set(row.thread_id, row.body.replace(/\s+/g, " ").trim().slice(0, PREVIEW_LENGTH));
  }

  return previews;
}

async function fetchUnreadCounts(
  threadIds: string[],
  userId: string,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  if (threadIds.length === 0) return counts;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select("thread_id")
    .in("thread_id", threadIds)
    .is("read_at", null)
    .neq("sender_id", userId)
    .limit(UNREAD_SCAN_LIMIT)
    .returns<Array<{ thread_id: string }>>();

  if (error) {
    logReadFailure("[messages] unread counts failed", error);
    return counts;
  }

  for (const row of data ?? []) {
    counts.set(row.thread_id, (counts.get(row.thread_id) ?? 0) + 1);
  }

  return counts;
}

interface Person {
  displayName: string;
  avatarUrl: string | null;
}

/**
 * Display names for the customer side.
 *
 * `bookings.customer_id` and `message_threads.customer_id` both reference
 * `auth.users`, not `public.users`, so there is no foreign key for PostgREST to
 * embed through — the profile has to be looked up by id separately.
 */
async function fetchPeople(userIds: string[]): Promise<Map<string, Person>> {
  const people = new Map<string, Person>();
  const unique = Array.from(new Set(userIds));
  if (unique.length === 0) return people;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("users")
    .select("id, display_name, avatar_url")
    .in("id", unique);

  if (error) {
    logReadFailure("[messages] party lookup failed", error);
    return people;
  }

  for (const row of data ?? []) {
    people.set(row.id, { displayName: row.display_name, avatarUrl: row.avatar_url });
  }

  return people;
}

/* ── One conversation ─────────────────────────────────────────────────────── */

export interface ThreadMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderAvatar: string | null;
  /** True when the caller wrote it — decides which side of the transcript it sits on. */
  isMine: boolean;
  body: string;
  readAt: string | null;
  createdAt: string;
  attachments: MessageAttachmentRow[];
}

export interface ThreadDetail {
  id: string;
  bookingId: string;
  bookingReference: string;
  bookingStatus: BookingStatus;
  /** `tstzrange` text. Parse with `slotStart`/`slotEnd`. */
  bookingSlot: string;
  shopName: string;
  shopSlug: string;
  /** The shop's zone — the only correct one to render this booking's slot in. */
  shopTimezone: string;
  customerId: string;
  otherPartyName: string;
  otherPartyAvatar: string | null;
  /** True when the caller is looking at this as the shop. */
  viewerIsShop: boolean;
  messages: ThreadMessage[];
}

interface ThreadDetailRow {
  id: string;
  booking_id: string;
  customer_id: string;
  fixer_id: string;
  bookings: {
    reference: string;
    status: BookingStatus;
    slot: string;
    fixer_profiles: {
      owner_id: string | null;
      slug: string;
      shop_name: string;
      timezone: string;
      photos: string[];
    } | null;
  } | null;
}

interface MessageJoinRow {
  id: string;
  sender_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  message_attachments: MessageAttachmentRow[] | null;
}

/**
 * One thread and its transcript, or null.
 *
 * Null covers three different situations on purpose — no such thread, a thread
 * RLS refused, and a caller who is neither party — because the page's response
 * to all three is the same 404, and distinguishing them in the return type would
 * only invite a caller to leak which threads exist.
 *
 * The party check below is therefore a second belt, not the buckle: RLS has
 * already filtered the row out for anyone else. It exists so that a future
 * change to the policy cannot quietly turn this into a read of someone else's
 * conversation.
 */
export async function getThread(
  threadId: string,
  userId: string,
): Promise<ThreadDetail | null> {
  const supabase = await createClient();

  const { data: thread, error } = await supabase
    .from("message_threads")
    .select(
      `id, booking_id, customer_id, fixer_id,
       bookings!message_threads_booking_fkey (
         reference, status, slot,
         fixer_profiles!bookings_fixer_fkey ( owner_id, slug, shop_name, timezone, photos )
       )`,
    )
    .eq("id", threadId)
    .maybeSingle<ThreadDetailRow>();

  if (error) {
    logReadFailure("[messages] thread lookup failed", error);
    return null;
  }
  if (!thread) return null;

  const viewerIsShop = thread.bookings?.fixer_profiles?.owner_id === userId;
  const viewerIsCustomer = thread.customer_id === userId;
  if (!viewerIsShop && !viewerIsCustomer) return null;

  const booking = thread.bookings;
  if (!booking) return null;

  // The counterparty's profile, and the caller's own, in one keyed read — the
  // transcript needs both to label every bubble.
  const parties = await fetchPeople([thread.customer_id, userId]);
  const customer = parties.get(thread.customer_id) ?? null;
  const shopName = booking.fixer_profiles?.shop_name ?? "The shop";

  const messages = await fetchMessages(threadId, userId, {
    shopName,
    shopAvatar: booking.fixer_profiles?.photos?.[0] ?? null,
    customerName: customer?.displayName ?? "Customer",
    customerAvatar: customer?.avatarUrl ?? null,
    customerId: thread.customer_id,
  });

  return {
    id: thread.id,
    bookingId: thread.booking_id,
    bookingReference: booking.reference,
    bookingStatus: booking.status,
    bookingSlot: booking.slot,
    shopName,
    shopSlug: booking.fixer_profiles?.slug ?? "",
    shopTimezone: booking.fixer_profiles?.timezone ?? "Europe/London",
    customerId: thread.customer_id,
    // Each side is shown the *other* party's name, so one query serves both.
    otherPartyName: viewerIsShop ? (customer?.displayName ?? "Customer") : shopName,
    otherPartyAvatar: viewerIsShop
      ? (customer?.avatarUrl ?? null)
      : (booking.fixer_profiles?.photos?.[0] ?? null),
    viewerIsShop,
    messages,
  };
}

/** Who wrote what, for labelling each bubble without a per-message lookup. */
interface TranscriptParties {
  shopName: string;
  shopAvatar: string | null;
  customerName: string;
  customerAvatar: string | null;
  customerId: string;
}

/**
 * The transcript, oldest first.
 *
 * Sender identity is resolved from the two parties already known to the thread
 * rather than joined per row: a conversation has exactly two participants, so a
 * join would repeat the same two profiles across every message. Anyone who is
 * not the customer is the shop — `messages` carries no role column, and the
 * thread's own `customer_id` is the only distinction that matters here.
 */
async function fetchMessages(
  threadId: string,
  userId: string,
  parties: TranscriptParties,
): Promise<ThreadMessage[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("messages")
    .select(
      `id, sender_id, body, read_at, created_at,
       message_attachments!message_attachments_message_fkey (
         id, message_id, storage_path, file_name, mime_type, size_bytes, created_at
       )`,
    )
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true })
    .returns<MessageJoinRow[]>();

  if (error) {
    logReadFailure("[messages] transcript failed", error);
    return [];
  }

  return (data ?? []).map((row) => {
    const fromCustomer = row.sender_id === parties.customerId;

    return {
      id: row.id,
      senderId: row.sender_id,
      senderName: fromCustomer ? parties.customerName : parties.shopName,
      senderAvatar: fromCustomer ? parties.customerAvatar : parties.shopAvatar,
      isMine: row.sender_id === userId,
      body: row.body,
      readAt: row.read_at,
      createdAt: row.created_at,
      attachments: row.message_attachments ?? [],
    };
  });
}

/**
 * The thread attached to a booking.
 *
 * Every booking has exactly one — `bookings_open_thread` creates it on insert
 * and `message_threads_booking_key` enforces the uniqueness — so a booking page
 * can link straight to the conversation without the inbox having to deal with
 * "no thread yet" as a state. Null here means the migration has not run or the
 * caller is not a party, both of which render as "messaging unavailable".
 */
export async function getThreadForBooking(
  bookingId: string,
): Promise<MessageThreadRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("message_threads")
    .select("id, booking_id, customer_id, fixer_id, last_message_at, created_at")
    .eq("booking_id", bookingId)
    .maybeSingle<MessageThreadRow>();

  if (error) {
    logReadFailure(`[messages] thread for booking failed (${bookingId})`, error);
    return null;
  }

  return data ?? null;
}

/**
 * Unread total for the sidebar badge.
 *
 * No `user_id` predicate is possible — `messages` has no such column — so this
 * leans entirely on `parties read thread messages`, which scopes the table to
 * threads the caller is on. `userId` supplies the other half of "unread":
 * messages you sent yourself have a null `read_at` too, and counting them would
 * make the badge permanent.
 */
export async function countUnreadMessages(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .is("read_at", null)
    .neq("sender_id", userId);

  if (error) {
    logReadFailure("[messages] unread total failed", error);
    return 0;
  }

  return count ?? 0;
}
