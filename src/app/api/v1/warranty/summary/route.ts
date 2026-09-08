import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getWarrantySummary } from "@/lib/dashboard/warranty";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const summary = await getWarrantySummary(user.id);
    return ok(summary);
  });
}
