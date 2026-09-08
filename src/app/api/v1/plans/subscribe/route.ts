import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readJson } from "@/lib/api/validate";
import { SubscribeSchema, purchasePlanCore } from "@/lib/plans/core";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const input = await readJson(request, SubscribeSchema);
    
    const result = await purchasePlanCore(user.id, input);
    if (!result.ok) throw result;
    
    return ok(result.data);
  });
}
