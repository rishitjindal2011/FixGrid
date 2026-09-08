import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getDirectoryStats } from "@/lib/queries/search";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const stats = await getDirectoryStats();
    return ok(stats);
  });
}
