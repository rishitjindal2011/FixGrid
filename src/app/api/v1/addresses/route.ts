import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listAddresses } from "@/lib/dashboard/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const addresses = await listAddresses(user.id);
    return ok(addresses);
  });
}
