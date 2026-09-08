import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getExpertBySlug, getPublicInventory } from "@/lib/queries/expert";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  return handle(async () => {
    const { slug } = await params;
    const expert = found(
      await getExpertBySlug(slug),
      "That expert could not be found.",
    );
    const inventory = await getPublicInventory(expert.id);
    return ok(inventory);
  });
}
