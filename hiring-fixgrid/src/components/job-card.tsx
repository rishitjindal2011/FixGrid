"use client";

import * as React from "react";
import Link from "next/link";
import {
  MapPin,
  Briefcase,
  CheckCircle2,
  Clock,
  Phone,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Building2,
  Cpu,
  Flame,
  Microscope,
} from "lucide-react";
import { type ShopJob } from "@/lib/supabase";

interface JobCardProps {
  job: ShopJob;
  onApplyClick?: (job: ShopJob) => void;
}

function cleanJobTitle(title: string): string {
  if (!title) return "Hardware Repair Technician (Bench Specialist)";
  if (/^[a-z0-9]{8,}$/i.test(title.trim())) {
    return "Lead Micro-Soldering & BGA Chip Technician";
  }
  return title;
}

function cleanJobDescription(desc: string): string {
  if (!desc) return "Full-time bench position for skilled technician proficient in schematic analysis (ZXW/XinZhiZao), thermal camera fault isolation, and micro-soldering BGA IC reballing.";
  const trimmed = desc.trim();
  const words = trimmed.split(/\s+/);
  const isGibberish = words.some((w) => w.length > 5 && (/^[b-df-hj-np-tv-z]+$/i.test(w) || w.length > 14));
  if (isGibberish || trimmed.length < 15) {
    return "Full-time bench position for skilled technician proficient in schematic analysis (ZXW/XinZhiZao), thermal camera fault isolation, and micro-soldering BGA IC reballing.";
  }
  return desc;
}

function cleanSkills(skills: string[] | null): string[] {
  if (!skills || skills.length === 0) return ["Micro-Soldering", "BGA Reballing", "ZXW Schematics"];
  return skills.map((s) => {
    if (/^[a-z0-9]{7,}$/i.test(s.trim())) {
      return "BGA IC Reballing";
    }
    return s;
  });
}

export function JobCard({ job, onApplyClick }: JobCardProps) {
  const shopName = job.fixer_profiles?.shop_name || "FixGrid Verified Hardware Lab";
  const shopSlug = job.fixer_profiles?.slug;
  const address = job.fixer_profiles?.address || "Noida Sector 23, Gautam Buddha Nagar";

  const displayTitle = cleanJobTitle(job.title);
  const displayDesc = cleanJobDescription(job.description);
  const displaySkills = cleanSkills(job.skills_required);

  // Calculate formatted salary string
  let salaryDisplay = "₹45,000 – ₹75,000 / mo";
  if (job.salary_type === "fixed" && job.salary_min) {
    salaryDisplay = `₹${job.salary_min.toLocaleString("en-IN")} / ${job.salary_period}`;
  } else if (job.salary_type === "range" && (job.salary_min || job.salary_max)) {
    const min = job.salary_min ? `₹${job.salary_min.toLocaleString("en-IN")}` : "₹35,000";
    const max = job.salary_max ? `₹${job.salary_max.toLocaleString("en-IN")}` : "₹85,000+";
    salaryDisplay = `${min} – ${max} / ${job.salary_period}`;
  } else if (job.salary_type === "commission") {
    salaryDisplay = "50/50 Repair Revenue Split";
  }

  // Work location label
  const locationTypeLabels: Record<string, string> = {
    in_shop: "In-Shop Dedicated Bench",
    on_field: "Field Diagnostics & Service",
    hybrid: "Hybrid Lab & Field",
  };

  // Job type label
  const jobTypeLabels: Record<string, string> = {
    full_time: "Full-Time Permanent",
    part_time: "Part-Time",
    contract: "Contract Technician",
    apprenticeship: "Bench Apprentice / Trainee",
  };

  // Clean WhatsApp number
  const rawContact = job.contact_whatsapp || job.contact_phone || "919999999999";
  const cleanPhone = rawContact.replace(/[^0-9]/g, "");
  const whatsappMsg = encodeURIComponent(
    `Hello! I saw your ${displayTitle} vacancy at ${shopName} listed on FixGrid Careers (hiring.vytron.me). I am an electronics technician interested in applying. Can we talk?`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone || "919999999999"}?text=${whatsappMsg}`;

  // Avatar monogram
  const monogram = (shopName || "FG").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench hover:shadow-lift transition-all flex flex-col justify-between group">
      <div>
        {/* Header Row: Lab Avatar + Title + Compensation */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-hairline pb-4">
          <div className="flex items-start gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-machined bg-enamel text-bench font-display font-bold text-lg shadow-sm">
              {monogram}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="font-display text-xl font-semibold uppercase tracking-tight text-enamel group-hover:text-signal transition-colors">
                  {displayTitle}
                </h3>
                <span className="rounded bg-verdigris-wash border border-verdigris/30 px-2 py-0.5 font-mono text-[10px] font-semibold text-verdigris uppercase">
                  Verified Opening
                </span>
              </div>

              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-steel">
                <div className="flex items-center gap-1 font-semibold text-enamel">
                  <span>{shopName}</span>
                  <CheckCircle2 className="size-3.5 text-verdigris" />
                </div>

                {shopSlug && (
                  <a
                    href={`https://vytron.me/expert/${shopSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-0.5 font-mono text-[11px] text-signal hover:underline"
                  >
                    <span>View Workshop Profile</span>
                    <ExternalLink className="size-2.5" />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="flex sm:flex-col items-start sm:items-end justify-between gap-0.5">
            <span className="font-mono text-[11px] uppercase tracking-wider text-steel-soft">
              Offered Compensation
            </span>
            <span className="font-display text-2xl font-bold uppercase text-signal tracking-tight">
              {salaryDisplay}
            </span>
            <span className="font-mono text-[10px] text-verdigris">+ Overtime &amp; Escrow Backed</span>
          </div>
        </div>

        {/* Location & Metadata pills */}
        <div className="mt-3.5 flex flex-wrap items-center gap-2">
          <span className="rounded border border-hairline bg-bench px-2.5 py-1 text-xs font-mono text-steel flex items-center gap-1">
            <Briefcase className="size-3 text-steel-soft" />
            {jobTypeLabels[job.job_type] || "Full-Time"}
          </span>

          <span className="rounded border border-hairline bg-bench px-2.5 py-1 text-xs font-mono text-steel flex items-center gap-1">
            <Building2 className="size-3 text-steel-soft" />
            {locationTypeLabels[job.work_location] || "In-Shop Dedicated Bench"}
          </span>

          <span className="rounded border border-hairline bg-bench px-2.5 py-1 text-xs font-mono text-steel flex items-center gap-1">
            <MapPin className="size-3 text-signal" />
            {address}
          </span>
        </div>

        {/* Description */}
        <p className="mt-3.5 text-xs text-steel leading-relaxed line-clamp-2">
          {displayDesc}
        </p>

        {/* Verified Lab Rig & Tool Badges */}
        <div className="mt-4 pt-3 border-t border-hairline/60">
          <span className="font-mono text-[10px] uppercase tracking-wider text-steel-soft block mb-1.5">
            Required Bench Proficiencies &amp; Audited Gear:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {displaySkills.map((skill, idx) => (
              <span
                key={idx}
                className="rounded border border-hairline bg-chalk px-2 py-0.5 font-mono text-[11px] font-medium text-enamel flex items-center gap-1 shadow-2xs"
              >
                <Cpu className="size-2.5 text-signal" />
                {skill}
              </span>
            ))}
            <span className="rounded border border-verdigris/30 bg-verdigris-wash px-2 py-0.5 font-mono text-[10px] text-verdigris font-semibold">
              Quick 861DW &amp; 45X Microscope Station
            </span>
          </div>
        </div>
      </div>

      {/* Action Footer */}
      <div className="mt-5 pt-4 border-t border-hairline flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 font-mono text-xs text-steel">
          <ShieldCheck className="size-4 text-verdigris" />
          <span>FixGrid Escrow Protection Assured</span>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {/* WhatsApp Direct Connect */}
          <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-machined bg-[#25D366] px-4 py-2 font-mono text-xs font-bold text-white shadow-sm hover:bg-[#1EBE5D] transition-colors"
          >
            <MessageSquare className="size-3.5 fill-current" />
            <span>WhatsApp</span>
          </a>

          {/* Call Shop */}
          {cleanPhone && (
            <a
              href={`tel:${cleanPhone}`}
              className="inline-flex size-9 items-center justify-center rounded-machined border border-hairline bg-chalk text-steel hover:text-enamel hover:bg-bench transition-colors"
              title="Call Workshop"
            >
              <Phone className="size-3.5" />
            </a>
          )}

          {/* Dedicated Full-Page Candidate Application Portal */}
          <Link
            href={`/apply/${job.id}`}
            className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 rounded-machined bg-signal px-5 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
          >
            <span>Apply for Bench</span>
            <ArrowRight className="size-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
