import { requireApiUser } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readJson, readLimit } from "@/lib/api/validate";
import { listMyReviews } from "@/lib/dashboard/reviews";
import { ReviewSchema, submitReviewCore } from "@/lib/reviews/core";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const limit = readLimit(request.nextUrl.searchParams, { fallback: 50, max: 200 });
    
    const reviews = await listMyReviews(user.id, limit);
    return ok(reviews);
  });
}

export async function POST(request: Request) {
  return handle(async () => {
    const { user } = await requireApiUser();
    const input = await readJson(request, ReviewSchema);
    
    const result = await submitReviewCore(user.id, input);
    if (!result.ok) throw result;
    
    return ok(result.data);
  });
}
