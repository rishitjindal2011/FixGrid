import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getAccountSecurity } from "@/lib/dashboard/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    await requireApiUser(); // Ensures user is authenticated
    const security = await getAccountSecurity();
    return ok(security);
  });
}
