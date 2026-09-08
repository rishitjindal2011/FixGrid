import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readLimit } from "@/lib/api/validate";
import { listNotifications } from "@/lib/dashboard/notifications";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const limit = readLimit(request.nextUrl.searchParams, { fallback: 50, max: 200 });
    
    const notifications = await listNotifications(user.id, limit);
    return ok(notifications);
  });
}
