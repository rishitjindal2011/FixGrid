import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readLimit } from "@/lib/api/validate";
import { listDisputes } from "@/lib/dashboard/warranty";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const limit = readLimit(request.nextUrl.searchParams, { fallback: 50, max: 200 });
    
    const disputes = await listDisputes(user.id, limit);
    return ok(disputes);
  });
}
