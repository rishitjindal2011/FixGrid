import type { Metadata } from "next";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Settings",
  robots: { index: false, follow: false },
};

/**
 * `/dashboard/settings` is a section, not a page.
 *
 * The sidebar already points at `/dashboard/settings/profile`, but bookmarks,
 * typed URLs and the browser's own back-stack all land on the bare section
 * path — without this file that is a 404 for a route the nav says exists.
 *
 * `redirect` is a permanent-in-spirit but temporary-in-status 307 here, which
 * is what we want: which tab is "first" is a product decision that may change,
 * and a 308 would be cached by the browser forever.
 */
export default function SettingsIndexPage() {
  redirect("/dashboard/settings/profile");
}
