"use client";

import * as React from "react";
import { useState, useMemo } from "react";
import { type ShopJob } from "@/lib/supabase";
import { Navbar } from "@/components/navbar";
import { Hero } from "@/components/hero";
import { JobFilters } from "@/components/job-filters";
import { JobCard } from "@/components/job-card";
import { ApplyModal } from "@/components/apply-modal";
import { StandardsBanner } from "@/components/standards-banner";
import { Footer } from "@/components/footer";
import {
  Briefcase,
  RotateCcw,
  Sparkles,
  Building2,
  ArrowRight,
  Cpu,
  Flame,
  Smartphone,
  Gamepad2,
  Tv,
  Zap,
} from "lucide-react";

interface JobBoardProps {
  initialJobs: ShopJob[];
}

const SPECIALIZATIONS = [
  {
    icon: Flame,
    title: "Micro-Soldering & BGA",
    badge: "L3 CHIP",
    desc: "BGA reballing, PMIC diagnosis, trace jumping, and microscope rework.",
    filter: "Micro-Soldering",
  },
  {
    icon: Smartphone,
    title: "Apple Logic Board Lab",
    badge: "IPHONE/MAC",
    desc: "NAND memory upgrades, FaceID sensor repair, and audio IC triage.",
    filter: "Logic Board",
  },
  {
    icon: Cpu,
    title: "OLED Screen Refurbishing",
    badge: "OCA LAB",
    desc: "Cryo frame separation, OCA lamination, polarizer & debubbling.",
    filter: "Screen Refurbishing",
  },
  {
    icon: Gamepad2,
    title: "Gaming Console & GPU",
    badge: "WLOD / HDMI",
    desc: "PS5 HDMI port rebuilding, liquid metal re-application, and APU reballing.",
    filter: "Console HDMI",
  },
  {
    icon: Zap,
    title: "Inverter AC & Appliance PCB",
    badge: "HIGH VOLTAGE",
    desc: "IPM power modules, diode bridges, and split AC outdoor board troubleshooting.",
    filter: "Inverter PCB",
  },
  {
    icon: Tv,
    title: "Display T-CON & COF Bonding",
    badge: "PANEL LAB",
    desc: "Laser tab bonding, COF line replacement, and backlight string repair.",
    filter: "Display",
  },
];

export function JobBoard({ initialJobs }: JobBoardProps) {
  const [jobs, setJobs] = useState<ShopJob[]>(initialJobs);
  const [roleInput, setRoleInput] = useState("");
  const [locationInput, setLocationInput] = useState("");
  const [jobType, setJobType] = useState("all");
  const [workLocation, setWorkLocation] = useState("all");
  const [experienceLevel, setExperienceLevel] = useState("all");

  const [activeJobForApply, setActiveJobForApply] = useState<ShopJob | null>(null);

  const refreshJobs = async () => {
    try {
      const { getActiveJobs } = await import("@/lib/supabase");
      const latest = await getActiveJobs();
      if (latest && latest.length > 0) {
        setJobs(latest);
      }
    } catch (e) {
      console.error("Failed to refresh jobs:", e);
    }
  };

  // Filter computation
  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      // Role filter (title, description, skills)
      if (roleInput.trim()) {
        const q = roleInput.toLowerCase().trim();
        const matchesTitle = job.title.toLowerCase().includes(q);
        const matchesDesc = (job.description || "").toLowerCase().includes(q);
        const matchesSkills = (job.skills_required || []).some((s) =>
          s.toLowerCase().includes(q)
        );
        const matchesShop = (job.fixer_profiles?.shop_name || "")
          .toLowerCase()
          .includes(q);

        if (!matchesTitle && !matchesDesc && !matchesSkills && !matchesShop) {
          return false;
        }
      }

      // Location filter
      if (locationInput.trim()) {
        const l = locationInput.toLowerCase().trim();
        const address = (job.fixer_profiles?.address || "").toLowerCase();
        if (!address.includes(l)) {
          return false;
        }
      }

      // Job Type filter
      if (jobType !== "all" && job.job_type !== jobType) {
        return false;
      }

      // Work Location filter
      if (workLocation !== "all" && job.work_location !== workLocation) {
        return false;
      }

      // Experience Level filter
      if (experienceLevel !== "all") {
        const exp = (job.experience_level || "").toLowerCase();
        if (experienceLevel === "junior" && !exp.includes("junior") && !exp.includes("fresher") && !exp.includes("any")) {
          return false;
        }
        if (experienceLevel === "senior" && !exp.includes("senior") && !exp.includes("lead") && !exp.includes("master")) {
          return false;
        }
      }

      return true;
    });
  }, [jobs, roleInput, locationInput, jobType, workLocation, experienceLevel]);

  const handleResetFilters = () => {
    setRoleInput("");
    setLocationInput("");
    setJobType("all");
    setWorkLocation("all");
    setExperienceLevel("all");
  };

  return (
    <div className="flex min-h-screen flex-col bg-bench text-enamel">
      <Navbar />

      <Hero
        onSearch={(role, loc) => {
          setRoleInput(role);
          setLocationInput(loc);
        }}
        roleInput={roleInput}
        setRoleInput={setRoleInput}
        locationInput={locationInput}
        setLocationInput={setLocationInput}
        totalJobs={jobs.length}
      />

      {/* Specialization Explorer Grid */}
      <section className="border-b border-hairline bg-chalk py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
            <div>
              <span className="font-mono text-eyebrow uppercase tracking-wider text-steel-soft font-semibold block">
                Technical Bench Specializations
              </span>
              <h2 className="font-display text-2xl font-semibold uppercase text-enamel">
                Explore High-Value Repair Disciplines
              </h2>
            </div>
            <span className="font-mono text-xs text-steel">
              100% Escrow-Backed Bench Seats
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {SPECIALIZATIONS.map((spec) => {
              const Icon = spec.icon;
              return (
                <button
                  key={spec.title}
                  onClick={() => setRoleInput(spec.filter)}
                  className="group flex flex-col justify-between rounded-machined border border-hairline bg-bench p-5 text-left transition-all hover:border-signal/40 hover:bg-chalk hover:shadow-lift cursor-pointer"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench group-hover:bg-signal group-hover:text-white transition-colors">
                        <Icon className="size-4.5" />
                      </div>
                      <span className="font-mono text-[9px] font-bold tracking-widest text-signal border border-signal/20 bg-signal-wash px-2 py-0.5 rounded uppercase">
                        {spec.badge}
                      </span>
                    </div>

                    <h3 className="mt-4 font-display text-base font-semibold uppercase tracking-tight text-enamel group-hover:text-signal transition-colors">
                      {spec.title}
                    </h3>
                    <p className="mt-1 text-xs text-steel leading-relaxed">
                      {spec.desc}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-1 font-mono text-[11px] font-semibold text-signal uppercase tracking-wider">
                    <span>Filter Discipline</span>
                    <ArrowRight className="size-3 group-hover:translate-x-1 transition-transform" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* Main Jobs Feed Area */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
          {/* Left Column: Technical Filters */}
          <aside className="lg:col-span-1">
            <div className="sticky top-20">
              <JobFilters
                jobType={jobType}
                onJobTypeChange={setJobType}
                workLocation={workLocation}
                onWorkLocationChange={setWorkLocation}
                experienceLevel={experienceLevel}
                onExperienceLevelChange={setExperienceLevel}
                totalFiltered={filteredJobs.length}
              />

            </div>
          </aside>

          {/* Right Column: Live Jobs Feed */}
          <section className="lg:col-span-3">
            {/* Telemetry Header */}
            <div className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl font-bold uppercase tracking-tight text-enamel">
                    Active Workshop Bench Seats
                  </h2>
                  <span className="rounded-full bg-enamel px-2 py-0.5 font-mono text-[10px] font-bold text-bench">
                    {filteredJobs.length} Live
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-steel">
                  Verified hardware openings with direct workshop WhatsApp &amp; escrow-backed contracts.
                </p>
              </div>

              {(roleInput || locationInput || jobType !== "all" || workLocation !== "all" || experienceLevel !== "all") && (
                <button
                  onClick={handleResetFilters}
                  className="inline-flex items-center gap-1.5 self-start sm:self-auto rounded-machined border border-hairline bg-chalk px-2.5 py-1 font-mono text-xs text-steel hover:text-enamel transition-colors cursor-pointer"
                >
                  <RotateCcw className="size-3" />
                  <span>Reset All</span>
                </button>
              )}
            </div>

            {/* Job Cards Stream */}
            {filteredJobs.length > 0 ? (
              <div className="space-y-3">
                {filteredJobs.map((job) => (
                  <JobCard
                    key={job.id}
                    job={job}
                    onApplyClick={(j) => setActiveJobForApply(j)}
                  />
                ))}
              </div>
            ) : (
              /* Zero Results */
              <div className="rounded-machined border border-hairline bg-chalk p-16 text-center shadow-bench flex flex-col items-center">
                <div className="flex size-14 items-center justify-center rounded-machined bg-bench text-steel mb-4 border border-hairline">
                  <Briefcase className="size-7" />
                </div>
                <h3 className="font-display text-xl font-semibold uppercase text-enamel">
                  No Matching Bench Openings
                </h3>
                <p className="mt-1.5 max-w-sm text-xs text-steel">
                  No positions matched your selected filter criteria. Try adjusting your query or resetting all filters.
                </p>
                <button
                  onClick={handleResetFilters}
                  className="mt-5 rounded-machined bg-signal text-white font-display font-semibold uppercase tracking-wider px-5 py-2.5 text-xs shadow-sm hover:bg-signal-lift transition-all cursor-pointer"
                >
                  Clear All Filters
                </button>
              </div>
            )}
          </section>
        </div>
      </main>

      <StandardsBanner />
      <Footer />

      {/* Candidate Quick Application Modal */}
      <ApplyModal
        job={activeJobForApply}
        onClose={() => setActiveJobForApply(null)}
      />
    </div>
  );
}
