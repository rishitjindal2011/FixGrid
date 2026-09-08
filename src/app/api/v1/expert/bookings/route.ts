import { requireApiExpert } from "@/lib/api/context";
import { handle } from "@/lib/api/handler";
import { ok } from "@/lib/api/response";
import { parseWith, readLimit } from "@/lib/api/validate";
import { BOOKING_STATUSES } from "@/lib/bookings/core";
import { listExpertBookings } from "@/lib/dashboard/expert";
import type { NextRequest } from "next/server";
import { z } from "zod";

export const dynamic = "force-dynamic";

const StatusFilterSchema = z.array(z.enum(BOOKING_STATUSES));

export async function GET(request: NextRequest) {
  return handle(async () => {
    const { fixerId } = await requireApiExpert();
    const params = request.nextUrl.searchParams;

    const statuses = parseWith(
      StatusFilterSchema,
      params
        .getAll("status")
        .flatMap((value) => value.split(","))
        .map((value) => value.trim())
        .filter(Boolean),
    );

    const limit = readLimit(params, { fallback: 50, max: 200 });

    const bookings = await listExpertBookings(fixerId, { statuses, limit });
    return ok(bookings);
  });
}
