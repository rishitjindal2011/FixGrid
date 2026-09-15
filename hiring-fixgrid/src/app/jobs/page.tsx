import { getActiveJobs } from "@/lib/supabase";
import { JobBoard } from "@/components/job-board";

export const revalidate = 60;

export const metadata = {
  title: "Active Bench Openings & Technician Jobs — FixGrid Careers",
  description: "Browse verified electronics technician, micro-soldering, and logic board repair jobs across India. 100% escrow backed with direct workshop contact.",
};

export default async function JobsPage() {
  const jobs = await getActiveJobs();

  return <JobBoard initialJobs={jobs} />;
}
