"use client";

import React, { useState } from "react";
import {
  X,
  Building2,
  Wrench,
  ShieldCheck,
  ArrowRight,
  Plus,
  Trash2,
  DollarSign,
  MapPin,
  Clock,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface PostJobModalProps {
  isOpen: boolean;
  onClose: () => void;
  onJobPosted?: () => void;
  onOpenAuth?: () => void;
}

const PRESET_SKILLS = [
  "Micro-Soldering 0201/01005",
  "BGA Reballing",
  "Schematic & Boardview (ZXW)",
  "Thermal Camera Diagnostics",
  "Oscilloscope Signal Tracing",
  "MacBook T2/M-Series Rework",
  "iPhone Logic Board Repair",
  "Display IC Transfer & Flex Repair",
  "Short-to-Ground Tracing",
];

export function PostJobModal({
  isOpen,
  onClose,
  onJobPosted,
  onOpenAuth,
}: PostJobModalProps) {
  const { user, workshop, createWorkshop } = useAuth();

  const [title, setTitle] = useState("");
  const [jobType, setJobType] = useState<"full_time" | "part_time" | "contract" | "apprenticeship">("full_time");
  const [workLocation, setWorkLocation] = useState<"in_shop" | "on_field" | "hybrid">("in_shop");
  const [experienceLevel, setExperienceLevel] = useState("mid");
  const [salaryType, setSalaryType] = useState<"range" | "fixed" | "negotiable">("range");
  const [salaryMin, setSalaryMin] = useState("35000");
  const [salaryMax, setSalaryMax] = useState("65000");
  const [salaryPeriod, setSalaryPeriod] = useState<"month" | "week" | "day" | "per_job">("month");
  const [description, setDescription] = useState("");
  const [skills, setSkills] = useState<string[]>([
    "Micro-Soldering 0201/01005",
    "BGA Reballing",
  ]);
  const [customSkill, setCustomSkill] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactEmail, setContactEmail] = useState("");

  // Workshop setup fallback state if user is logged in without workshop
  const [tempShopName, setTempShopName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const togglePresetSkill = (skill: string) => {
    if (skills.includes(skill)) {
      setSkills(skills.filter((s) => s !== skill));
    } else {
      setSkills([...skills, skill]);
    }
  };

  const addCustomSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (customSkill.trim() && !skills.includes(customSkill.trim())) {
      setSkills([...skills, customSkill.trim()]);
      setCustomSkill("");
    }
  };

  const removeSkill = (skillToRemove: string) => {
    setSkills(skills.filter((s) => s !== skillToRemove));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      setError("Please sign in as a workshop owner or bench technician to post.");
      return;
    }

    let activeFixerId = workshop?.id;

    // Auto-create workshop if missing
    if (!activeFixerId) {
      if (!tempShopName.trim()) {
        setError("Please provide your workshop or lab name to publish this seat.");
        return;
      }
      setSubmitting(true);
      const wsRes = await createWorkshop(tempShopName.trim());
      if (wsRes.error || !wsRes.workshop) {
        setError(wsRes.error || "Failed to initialize workshop profile.");
        setSubmitting(false);
        return;
      }
      activeFixerId = wsRes.workshop.id;
    }

    setSubmitting(true);

    try {
      const payload = {
        fixerId: activeFixerId,
        title,
        jobType,
        workLocation,
        experienceLevel,
        salaryType,
        salaryMin: salaryMin ? parseInt(salaryMin, 10) : null,
        salaryMax: salaryMax ? parseInt(salaryMax, 10) : null,
        salaryPeriod,
        salaryNegotiable: salaryType === "negotiable",
        description,
        skillsRequired: skills,
        contactPhone: contactPhone || workshop?.contact_phone || null,
        contactWhatsapp: contactWhatsapp || contactPhone || null,
        contactEmail: contactEmail || user.email || null,
      };

      const res = await fetch("/api/jobs/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to publish job opening.");
      }

      setSuccess(true);
      if (onJobPosted) {
        onJobPosted();
      }
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setTitle("");
        setDescription("");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error posting job";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/80 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal Card */}
      <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl border border-zinc-700 bg-zinc-950 shadow-2xl z-10 font-sans text-zinc-100">
        {/* Header Schematic Strip */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-zinc-800 bg-zinc-900/95 px-6 py-4 backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
              <Wrench className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                  BENCH RECRUITMENT DESK
                </span>
                <span className="rounded bg-zinc-800 px-1.5 py-0.2 font-mono text-[9px] text-zinc-300">
                  hiring.vytron.me
                </span>
              </div>
              <h2 className="text-base font-bold text-white tracking-tight">
                Post a Hardware Bench Seat
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Content Container */}
        <div className="p-6">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3.5 text-xs text-rose-300">
              <AlertCircle className="size-4.5 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="mb-5 flex items-center gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-300">
              <CheckCircle2 className="size-5 shrink-0 text-emerald-400" />
              <div>
                <p className="font-semibold text-emerald-200">Bench Opening Published Live!</p>
                <p className="text-emerald-300/80 mt-0.5">
                  Your technician vacancy has been recorded to Supabase and is now broadcasting across hiring.vytron.me.
                </p>
              </div>
            </div>
          )}

          {/* Authentication Gate Prompt if not logged in */}
          {!user && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-5 mb-6">
              <div className="flex items-start gap-3.5">
                <Building2 className="size-5 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-semibold text-white">
                    Authentication Required to Broadcast Vacancies
                  </h3>
                  <p className="text-xs text-zinc-300 mt-1">
                    To maintain verified lab credentials, bench seats can only be posted by authenticated workshop owners or leads.
                  </p>
                  <div className="mt-3.5 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        if (onOpenAuth) onOpenAuth();
                      }}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-amber-400 bg-amber-400 px-3.5 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-amber-300 shadow transition-colors cursor-pointer"
                    >
                      <span>Bench Sign In / Register</span>
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Workshop Details if user is signed in */}
          {user && (
            <div className="mb-5 rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <div className="size-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="font-mono text-xs font-semibold text-zinc-200">
                    Workshop Profile:
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-400">
                    {workshop ? workshop.shop_name : "Unregistered Bench"}
                  </span>
                </div>
                <span className="font-mono text-[11px] text-zinc-400">
                  User: {user.email}
                </span>
              </div>

              {!workshop && (
                <div className="mt-3 pt-3 border-t border-zinc-800">
                  <label className="block font-mono text-[11px] text-zinc-400 uppercase mb-1">
                    Set Workshop / Lab Name for this Listing:
                  </label>
                  <input
                    type="text"
                    required
                    value={tempShopName}
                    onChange={(e) => setTempShopName(e.target.value)}
                    placeholder="e.g. Apex Hardware Diagnostics Lab"
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                  />
                </div>
              )}
            </div>
          )}

          {/* JOB SUBMISSION FORM */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Title */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Bench Seat Title <span className="text-amber-400">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!user || submitting}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Senior Micro-Soldering Specialist & BGA Rework Lead"
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
              />
            </div>

            {/* Employment Type & Location */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Job Type
                </label>
                <select
                  disabled={!user || submitting}
                  value={jobType}
                  onChange={(e) => setJobType(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                >
                  <option value="full_time">Full Time (Bench)</option>
                  <option value="part_time">Part Time / Weekend</option>
                  <option value="contract">Contract / Project Basis</option>
                  <option value="apprenticeship">Apprenticeship / Trainee</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Work Location
                </label>
                <select
                  disabled={!user || submitting}
                  value={workLocation}
                  onChange={(e) => setWorkLocation(e.target.value as any)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                >
                  <option value="in_shop">In-Shop Bench Lab</option>
                  <option value="on_field">Field / Client Site</option>
                  <option value="hybrid">Hybrid Bench</option>
                </select>
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Experience Level
                </label>
                <select
                  disabled={!user || submitting}
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                >
                  <option value="entry">Entry Level (0-1 yr)</option>
                  <option value="junior">Junior Tech (1-2 yrs)</option>
                  <option value="mid">Mid-Level Artisan (2-4 yrs)</option>
                  <option value="senior">Senior Specialist (5+ yrs)</option>
                  <option value="lead">Lab Lead / Master Tech</option>
                  <option value="any">Any Experience Level</option>
                </select>
              </div>
            </div>

            {/* Compensation Band */}
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300">
                  Compensation Band (₹ INR)
                </span>
                <div className="flex gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => setSalaryType("range")}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                      salaryType === "range" ? "bg-amber-400 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType("fixed")}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                      salaryType === "fixed" ? "bg-amber-400 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType("negotiable")}
                    className={`px-2 py-0.5 rounded font-mono text-[11px] ${
                      salaryType === "negotiable" ? "bg-amber-400 text-zinc-950 font-bold" : "text-zinc-400 hover:text-white"
                    }`}
                  >
                    Negotiable
                  </button>
                </div>
              </div>

              {salaryType !== "negotiable" && (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">
                      Min (₹)
                    </label>
                    <input
                      type="number"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="30000"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    />
                  </div>

                  {salaryType === "range" && (
                    <div>
                      <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">
                        Max (₹)
                      </label>
                      <input
                        type="number"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder="65000"
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[10px] text-zinc-400 uppercase mb-1">
                      Period
                    </label>
                    <select
                      value={salaryPeriod}
                      onChange={(e) => setSalaryPeriod(e.target.value as any)}
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white focus:border-amber-400 focus:outline-none"
                    >
                      <option value="month">Per Month</option>
                      <option value="week">Per Week</option>
                      <option value="per_job">Per Board / Job</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Required Bench Skills */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-2">
                Required Technical Skills &amp; Badges
              </label>

              {/* Selected Badges */}
              <div className="flex flex-wrap gap-1.5 mb-2.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/40 bg-amber-500/15 px-2.5 py-1 text-xs font-mono text-amber-300"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="text-amber-400/80 hover:text-amber-200"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>

              {/* Preset Chips */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {PRESET_SKILLS.filter((ps) => !skills.includes(ps)).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePresetSkill(preset)}
                    className="rounded border border-zinc-700/80 bg-zinc-900/90 px-2 py-1 text-[11px] font-mono text-zinc-400 hover:border-amber-500/40 hover:text-amber-300 transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Add Custom Skill */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add custom skill (e.g., JTAG Debugging, NAND Programmer)"
                  className="flex-1 rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
                >
                  Add Skill
                </button>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                Bench Responsibilities &amp; Role Details <span className="text-amber-400">*</span>
              </label>
              <textarea
                required
                rows={4}
                disabled={!user || submitting}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Detail what equipment the technician will operate (JBC soldering iron, Quick hot air station, thermal imager), types of boards serviced, and day-to-day bench goals..."
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 p-3 text-xs text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400 disabled:opacity-50"
              />
            </div>

            {/* Direct Contact Options */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Direct WhatsApp / Contact Number
                </label>
                <input
                  type="tel"
                  disabled={!user || submitting}
                  value={contactWhatsapp}
                  onChange={(e) => setContactWhatsapp(e.target.value)}
                  placeholder="+91 98765 43210"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-300 mb-1.5">
                  Applicant Contact Email
                </label>
                <input
                  type="email"
                  disabled={!user || submitting}
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder={user?.email || "jobs@yourworkshop.com"}
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs text-white focus:border-amber-400 focus:outline-none disabled:opacity-50"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="pt-3 border-t border-zinc-800 flex items-center justify-between">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg px-4 py-2 font-mono text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!user || submitting}
                className="inline-flex items-center gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400 to-amber-500 px-6 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-zinc-950 shadow hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-40 transition-all cursor-pointer"
              >
                {submitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Broadcasting Opening...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="size-4" />
                    <span>Publish Vacancy to Hiring Grid</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
