import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getUnreadNotificationCount } from "@/lib/dashboard/notifications";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const count = await getUnreadNotificationCount(user.id);
    return ok({ unread: count });
  });
}
