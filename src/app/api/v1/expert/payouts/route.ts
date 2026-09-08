import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listPayouts } from "@/lib/dashboard/expert";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const payouts = await listPayouts(fixerId);
    return ok(payouts);
  });
}
