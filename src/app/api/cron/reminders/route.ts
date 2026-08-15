import { NextResponse, type NextRequest } from "next/server";

import { sendScheduledReminders } from "@/lib/notifications/reminders";

export const dynamic = "force-dynamic";

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Scheduled reminder worker.
 *
 * Call hourly from your host's cron (Vercel Cron, GitHub Actions, etc.):
 *   GET /api/cron/reminders?secret=<CRON_SECRET>
 */
export async function GET(request: NextRequest) {
  const expected = process.env.CRON_SECRET?.trim();
  if (!expected) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 500 });
  }

  const secret = request.nextUrl.searchParams.get("secret") ?? "";
  if (!timingSafeEqual(secret, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const result = await sendScheduledReminders();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("[cron/reminders] failed", error);
    return NextResponse.json({ error: "Reminder job failed." }, { status: 500 });
  }
}
