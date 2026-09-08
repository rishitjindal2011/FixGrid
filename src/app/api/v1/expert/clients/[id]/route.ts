import { requireApiExpert } from "@/lib/api/context";
import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getClient } from "@/lib/dashboard/expert";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const { id } = await params;
    
    const client = found(
      await getClient(fixerId, id),
      "That client could not be found.",
    );
    return ok(client);
  });
}
