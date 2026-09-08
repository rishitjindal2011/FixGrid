import { requireApiUser } from "@/lib/api/context";
import { found, handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { getThread } from "@/lib/dashboard/messages";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const { id } = await params;
    const thread = found(
      await getThread(user.id, id),
      "That thread could not be found.",
    );
    return ok(thread);
  });
}
