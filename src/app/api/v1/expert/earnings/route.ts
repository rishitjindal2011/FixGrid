import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readLimit } from "@/lib/api/validate";
import { listExpertEarnings } from "@/lib/dashboard/expert";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { fixerId, shop } = await requireApiExpert();
    const limit = readLimit(request.nextUrl.searchParams, { fallback: 6, max: 24 });
    
    const earnings = await listExpertEarnings(fixerId, { months: limit, timezone: shop.timezone });
    return ok(earnings);
  });
}
