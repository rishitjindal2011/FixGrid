import { getActiveJobs } from "@/lib/supabase";
import { HiringLandingPage } from "@/components/landing-page";

export const revalidate = 60;

export const metadata = {
  title: "FixGrid Careers — India's Verified Hardware Artisan & Bench Exchange",
  description: "Connect directly with verified micro-soldering and repair labs across India. 100% escrow-backed pay, audited microscope benches, and zero recruiter commission markups.",
};

export default async function HiringHomePage() {
  const jobs = await getActiveJobs();

  return <HiringLandingPage featuredJobs={jobs} totalCount={jobs.length} />;
}
