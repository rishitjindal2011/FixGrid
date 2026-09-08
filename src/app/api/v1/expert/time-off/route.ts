import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { readLimit } from "@/lib/api/validate";
import { listTimeOff } from "@/lib/dashboard/expert";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const timeOff = await listTimeOff(fixerId, {});
    return ok(timeOff);
  });
}
