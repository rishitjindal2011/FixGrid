import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listPlans } from "@/lib/plans/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const plans = await listPlans();
    return ok(plans);
  });
}
