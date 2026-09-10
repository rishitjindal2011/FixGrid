"use client";

import * as React from "react";
import Link from "next/link";
import { Filter, Layers, Briefcase, MapPin, Sparkles, Plus } from "lucide-react";

interface JobFiltersProps {
  jobType: string;
  onJobTypeChange: (type: string) => void;
  workLocation: string;
  onWorkLocationChange: (loc: string) => void;
  experienceLevel: string;
  onExperienceLevelChange: (exp: string) => void;
  totalFiltered: number;
}

export function JobFilters({
  jobType,
  onJobTypeChange,
  workLocation,
  onWorkLocationChange,
  experienceLevel,
  onExperienceLevelChange,
  totalFiltered,
}: JobFiltersProps) {
  const jobTypes = [
    { id: "all", label: "All Engagements" },
    { id: "full_time", label: "Full Time" },
    { id: "part_time", label: "Part Time" },
    { id: "contract", label: "Contract" },
    { id: "apprenticeship", label: "Apprentice / Trainee" },
  ];

  const locations = [
    { id: "all", label: "All Modes" },
    { id: "in_shop", label: "In-Shop Lab" },
    { id: "on_field", label: "Field Ops" },
    { id: "hybrid", label: "Hybrid" },
  ];

  const experienceLevels = [
    { id: "all", label: "All Experience" },
    { id: "junior", label: "Junior (0-1 yr)" },
    { id: "mid", label: "Mid (1-3 yrs)" },
    { id: "senior", label: "Master Tech (3+ yrs)" },
  ];

  return (
    <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench flex flex-col gap-5">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <div className="flex items-center gap-2">
          <Filter className="size-4 text-signal" />
          <span className="font-display font-semibold text-base uppercase tracking-wider text-enamel">
            Filter Positions
          </span>
        </div>
        <span className="font-mono text-xs text-steel">
          Showing <strong className="text-signal">{totalFiltered}</strong>
        </span>
      </div>

      {/* Engagement Mode */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold">
          Engagement Type
        </span>
        <div className="flex flex-wrap gap-1.5">
          {jobTypes.map((t) => (
            <button
              key={t.id}
              onClick={() => onJobTypeChange(t.id)}
              className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                jobType === t.id
                  ? "bg-enamel text-bench border-enamel font-semibold shadow-xs"
                  : "bg-bench/60 text-steel border-hairline hover:bg-chalk hover:text-enamel"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Work Location Mode */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold">
          Work Modality
        </span>
        <div className="flex flex-wrap gap-1.5">
          {locations.map((loc) => (
            <button
              key={loc.id}
              onClick={() => onWorkLocationChange(loc.id)}
              className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                workLocation === loc.id
                  ? "bg-enamel text-bench border-enamel font-semibold shadow-xs"
                  : "bg-bench/60 text-steel border-hairline hover:bg-chalk hover:text-enamel"
              }`}
            >
              {loc.label}
            </button>
          ))}
        </div>
      </div>

      {/* Experience Level */}
      <div className="flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft font-bold">
          Bench Experience
        </span>
        <div className="flex flex-wrap gap-1.5">
          {experienceLevels.map((exp) => (
            <button
              key={exp.id}
              onClick={() => onExperienceLevelChange(exp.id)}
              className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                experienceLevel === exp.id
                  ? "bg-enamel text-bench border-enamel font-semibold shadow-xs"
                  : "bg-bench/60 text-steel border-hairline hover:bg-chalk hover:text-enamel"
              }`}
            >
              {exp.label}
            </button>
          ))}
        </div>
      </div>

      {/* Workshop Post Callout */}
      <div className="mt-2 rounded-machined border border-signal/20 bg-signal-wash p-3.5 flex flex-col gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-signal font-bold">
          Workshop Operations
        </span>
        <p className="font-display text-sm font-semibold uppercase text-enamel">
          Need to Hire Artisans for Your Bench?
        </p>
        <p className="text-xs text-steel leading-relaxed">
          Connect directly with verified micro-soldering, logic board, and screen technicians.
        </p>
        <Link
          href="/post"
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-machined bg-signal px-3 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white hover:bg-signal-lift transition-colors"
        >
          <Plus className="size-3.5" />
          <span>Post Open Position</span>
        </Link>
      </div>
    </div>
  );
}
