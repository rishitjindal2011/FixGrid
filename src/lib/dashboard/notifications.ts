import "server-only";

import { createClient } from "@/lib/supabase/server";
import type { NotificationRow } from "@/lib/types/marketplace";
import { logReadFailure } from "@/lib/dashboard/errors";

/**
 * Notification reads for the dashboard shell and the notifications page.
 *
 * RLS scopes every row to `auth.uid()`, so `userId` here is not the security
 * boundary — it is passed so the query is explicit about whose count it is and
 * so the index on `(user_id, read_at)` is used rather than a scan behind the
 * policy.
 */

/**
 * Unread count for the topbar bell.
 *
 * `head: true` sends no rows back, only the count — the bell needs a number,
 * and fetching the bodies to call `.length` on them would pull the whole inbox
 * into every page render.
 *
 * Failure returns 0 rather than throwing. A bell that silently shows no badge
 * is a far better outcome than a 500 on every dashboard page because the
 * migration has not been run yet.
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = await createClient();

  const { count, error } = await supabase
    .from("notifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .is("read_at", null);

  if (error) {
    logReadFailure("[dashboard] unread count failed", error);
    return 0;
  }

  return count ?? 0;
}

/** Most recent notifications, newest first. */
export async function listNotifications(
  userId: string,
  limit = 30,
): Promise<NotificationRow[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)
    .returns<NotificationRow[]>();

  if (error) {
    logReadFailure("[dashboard] notification list failed", error);
    return [];
  }

  return data ?? [];
}
