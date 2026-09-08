import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { listDiscoverExperts, parseDiscoverParams } from "@/lib/dashboard/discover";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    await requireApiUser();

    const rawParams: Record<string, string | string[] | undefined> = {};
    for (const key of request.nextUrl.searchParams.keys()) {
      const values = request.nextUrl.searchParams.getAll(key);
      if (values.length > 0) {
        rawParams[key] = values.length === 1 ? values[0] : values;
      }
    }

    const filters = parseDiscoverParams(rawParams);
    const experts = await listDiscoverExperts(filters);
    
    return ok(experts);
  });
}
