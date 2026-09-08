import { requireApiUser } from "@/lib/api/context";
import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getDispute } from "@/lib/dashboard/warranty";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await params;
    const dispute = found(
      await getDispute(user.id, id),
      "That dispute could not be found.",
    );
    return ok(dispute);
  });
}
