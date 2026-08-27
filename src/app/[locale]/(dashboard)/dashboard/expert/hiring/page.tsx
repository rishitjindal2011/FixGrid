import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, Briefcase, ExternalLink, Plus } from "lucide-react";

import { JobForm } from "@/components/dashboard/expert/job-form";
import { JobList } from "@/components/dashboard/expert/job-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listShopJobs } from "@/lib/dashboard/expert";

export const metadata: Metadata = {
  title: "Hiring & Job Openings",
  robots: { index: false, follow: false },
};

export default async function ExpertHiringPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/hiring");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const jobs = await listShopJobs(shop.id);

  const activeCount = jobs.filter((j) => j.is_active).length;
  const allPaused = jobs.length > 0 && activeCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Hiring & Job Openings"
        description={
          jobs.length === 0
            ? "Post technician openings, apprenticeships, and shop assistant jobs. Candidates in your area can discover and apply for free."
            : "Manage your open vacancies, update salaries, and toggle listings. Active jobs appear on your public shop profile."
        }
        actions={
          <>
            <JobForm fixerId={shop.id}>
              <Button variant="primary" size="sm">
                <Plus className="size-4" />
                Post Opening
              </Button>
            </JobForm>
            <Button asChild variant="outline" size="sm">
              <Link href={`/expert/${shop.slug}?tab=jobs`}>
                <ExternalLink className="size-4" />
                Public Page
              </Link>
            </Button>
          </>
        }
      />

      {jobs.length > 0 ? (
        <div className="flex items-center gap-3">
          <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
            {activeCount} of {jobs.length} vacancies active
          </p>
        </div>
      ) : null}

      {allPaused ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
        >
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          All job postings are currently paused, so none appear on your public shop profile.
        </p>
      ) : null}

      <JobList fixerId={shop.id} jobs={jobs} />
    </div>
  );
}
