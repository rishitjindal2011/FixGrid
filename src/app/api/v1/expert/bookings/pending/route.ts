import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listPendingRequests } from "@/lib/dashboard/expert";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const pending = await listPendingRequests(fixerId);
    return ok(pending);
  });
}
