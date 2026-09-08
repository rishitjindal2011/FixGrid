import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getTodaySchedule } from "@/lib/dashboard/expert";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { fixerId, shop } = await requireApiExpert();
    const schedule = await getTodaySchedule(fixerId, shop.timezone);
    return ok(schedule);
  });
}
