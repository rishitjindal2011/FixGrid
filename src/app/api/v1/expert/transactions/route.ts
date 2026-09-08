import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readLimit } from "@/lib/api/validate";
import { listTransactions } from "@/lib/dashboard/expert";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const limit = readLimit(request.nextUrl.searchParams, { fallback: 50, max: 200 });
    
    const transactions = await listTransactions(fixerId, limit);
    return ok(transactions);
  });
}
