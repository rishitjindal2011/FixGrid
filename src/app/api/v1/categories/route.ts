import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getCategories } from "@/lib/queries/search";

export const dynamic = "force-dynamic";

export async function GET() {
  return handle(async () => {
    const categories = await getCategories();
    return ok(categories);
  });
}
