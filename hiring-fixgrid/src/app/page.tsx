import { getActiveJobs } from "@/lib/supabase";
import { JobBoard } from "@/components/job-board";

// Revalidate every 60 seconds or dynamic
export const revalidate = 60;

export default async function HiringHomePage() {
  const jobs = await getActiveJobs();

  return <JobBoard initialJobs={jobs} />;
}
