import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getNotificationPrefs } from "@/lib/dashboard/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const prefs = await getNotificationPrefs(user.id);
    return ok(prefs);
  });
}
