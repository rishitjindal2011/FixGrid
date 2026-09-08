import type { NextRequest } from "next/server";

import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseSearchParams, searchFixers } from "@/lib/queries/search";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const rawParams: Record<string, string | string[] | undefined> = {};
    for (const key of request.nextUrl.searchParams.keys()) {
      const values = request.nextUrl.searchParams.getAll(key);
      if (values.length > 0) {
        rawParams[key] = values.length === 1 ? values[0] : values;
      }
    }

    const filters = parseSearchParams(rawParams);
    const results = await searchFixers(filters);
    
    return ok(results);
  });
}
