import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getWallet } from "@/lib/wallet/server";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const { user } = await requireApiUser();
    const wallet = await getWallet("user", user.id);
    return ok(wallet);
  });
}
