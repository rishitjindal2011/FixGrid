"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Building2,
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
  ChevronRight,
  Eye,
  Lock,
  Phone,
  MessageSquare,
  Briefcase,
  Store,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

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
  "Console HDMI 2.1 Rebuild",
];

export default function PostJobPage() {
  const router = useRouter();
  const { user, workshop, createWorkshop } = useAuth();

  const [title, setTitle] = useState("Senior Micro-Soldering Specialist & BGA Rework Lead");
  const [jobType, setJobType] = useState<"full_time" | "part_time" | "contract" | "apprenticeship">("full_time");
  const [workLocation, setWorkLocation] = useState<"in_shop" | "on_field" | "hybrid">("in_shop");
  const [experienceLevel, setExperienceLevel] = useState("senior");
  const [salaryType, setSalaryType] = useState<"range" | "fixed" | "negotiable">("range");
  const [salaryMin, setSalaryMin] = useState("45000");
  const [salaryMax, setSalaryMax] = useState("75000");
  const [salaryPeriod, setSalaryPeriod] = useState<"month" | "week" | "day" | "per_job">("month");
  const [description, setDescription] = useState(
    "Operate JBC micro-soldering bench stations, stereomicroscope with 4K HDMI simul-focus, and thermal camera. Responsible for short circuit diagnostics, 0201 chip replacement, and BGA reballing on Apple and PC logic boards."
  );
  const [skills, setSkills] = useState<string[]>([
    "Micro-Soldering 0201/01005",
    "BGA Reballing",
    "Thermal Camera Diagnostics",
  ]);
  const [customSkill, setCustomSkill] = useState("");
  const [contactPhone, setContactPhone] = useState("+91 98765 43210");
  const [contactWhatsapp, setContactWhatsapp] = useState("+91 98765 43210");
  const [contactEmail, setContactEmail] = useState("");

  // Workshop fallback creation if user is signed in without shop
  const [tempShopName, setTempShopName] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
      router.push("/login?next=/post");
      return;
    }

    let activeFixerId = workshop?.id;

    if (!activeFixerId) {
      if (!tempShopName.trim()) {
        setError("Please provide your workshop or bench name to register the listing.");
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
        contactPhone: contactPhone || null,
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
        throw new Error(resData.error || "Failed to publish opening.");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/");
      }, 1500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error publishing job";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Portal Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench group-hover:bg-enamel-lift transition-colors">
              <Wrench className="size-4 text-signal" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl font-bold tracking-tight text-enamel uppercase">
                  FIX<span className="text-signal">GRID</span>
                </span>
                <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                  BENCH PORTAL
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                hiring.vytron.me/post
              </span>
            </div>
          </Link>

          {/* User / Workshop Identity */}
          <div className="flex items-center gap-4">
            {user ? (
              <div className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-3 py-1.5">
                <div className="size-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-mono text-xs font-bold text-enamel">
                  {workshop ? workshop.shop_name : "Bench Lead"}
                </span>
                <span className="hidden sm:inline font-mono text-[10px] text-steel-soft">
                  ({user.email})
                </span>
              </div>
            ) : (
              <Link
                href="/login?next=/post"
                className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench hover:bg-chalk px-3 py-1.5 font-mono text-xs font-medium text-enamel transition-colors shadow-sm"
              >
                <Lock className="size-3 text-signal" />
                <span>Sign In First</span>
              </Link>
            )}

            <Link
              href="/"
              className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider hidden sm:inline"
            >
              Exit Studio
            </Link>
          </div>
        </div>
      </header>

      {/* Main Studio Body */}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        {/* Technical Breadcrumbs */}
        <nav className="mb-6 flex items-center gap-2 font-mono text-xs text-steel-soft">
          <Link href="/" className="hover:text-enamel">FixGrid Careers</Link>
          <ChevronRight className="size-3.5" />
          <span className="text-steel">Workshop Recruitment Desk</span>
          <ChevronRight className="size-3.5" />
          <span className="text-signal font-semibold">Broadcast Vacancy</span>
        </nav>

        {/* Studio Heading Strip */}
        <div className="mb-8 border-b border-hairline pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <span className="font-mono text-eyebrow uppercase tracking-wider text-signal font-bold flex items-center gap-1.5">
              <Store className="size-3.5" /> Hardware Workshop Recruitment Studio
            </span>
            <h1 className="mt-1 font-display text-3xl sm:text-4xl font-bold uppercase tracking-tight text-enamel">
              Post a Hardware Bench Seat
            </h1>
            <p className="mt-1.5 max-w-2xl text-xs sm:text-sm text-steel">
              Broadcast verified technician openings to thousands of micro-soldering, boardview diagnostics, and consumer electronics repair specialists across India.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-signal-wash border border-signal/20 px-3 py-1 font-mono text-xs font-semibold text-signal">
              <Sparkles className="size-3.5" />
              Direct WhatsApp Routing
            </span>
          </div>
        </div>

        {/* Auth Gate Banner if unauthenticated */}
        {!user && (
          <div className="mb-8 rounded-machined border border-amber-400/40 bg-amber-500/10 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-3">
                <Building2 className="size-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-display text-base font-semibold uppercase text-enamel">
                    Sign In to Broadcast Vacancies
                  </h3>
                  <p className="text-xs text-steel mt-0.5">
                    Bench openings are strictly bound to verified workshop profiles to ensure zero counterfeit or agency postings.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href="/login?next=/post"
                  className="rounded-machined bg-signal px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white hover:bg-signal-lift transition-colors"
                >
                  Workshop Sign In
                </Link>
                <Link
                  href="/signup?next=/post"
                  className="rounded-machined border border-hairline bg-chalk px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:bg-bench transition-colors"
                >
                  Register Workshop
                </Link>
              </div>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {success && (
          <div className="mb-8 rounded-machined border border-verdigris/40 bg-verdigris-wash p-5 flex items-center gap-3 text-verdigris">
            <CheckCircle2 className="size-6 shrink-0" />
            <div>
              <p className="font-display font-semibold uppercase tracking-wide text-base">
                Bench Opening Successfully Broadcasted!
              </p>
              <p className="text-xs mt-0.5 text-steel">
                Your position has been recorded to Supabase and is now active across the live feed. Redirecting to the board...
              </p>
            </div>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-8 rounded-machined border border-rust/40 bg-rust-wash p-5 flex items-center gap-3 text-rust">
            <AlertCircle className="size-6 shrink-0" />
            <div>
              <p className="font-display font-semibold uppercase tracking-wide text-sm">
                Listing Error
              </p>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Studio Workspace: 2-Column Split */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Form Column (7 cols) */}
          <form onSubmit={handleSubmit} className="lg:col-span-7 flex flex-col gap-6">
            {/* Section 1: Role Specification */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-enamel border-b border-hairline pb-3 mb-4">
                1. Role Specification
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                    Position Title <span className="text-signal">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Senior Micro-Soldering & Thermal Diagnostics Specialist"
                    className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                      Engagement Mode
                    </label>
                    <select
                      value={jobType}
                      onChange={(e) => setJobType(e.target.value as any)}
                      className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                    >
                      <option value="full_time">Full Time (Bench)</option>
                      <option value="part_time">Part Time / Weekend</option>
                      <option value="contract">Contract / Project Basis</option>
                      <option value="apprenticeship">Apprenticeship / Trainee</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                      Facility Location
                    </label>
                    <select
                      value={workLocation}
                      onChange={(e) => setWorkLocation(e.target.value as any)}
                      className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                    >
                      <option value="in_shop">In-Shop Clean Bench</option>
                      <option value="on_field">Field / Client Site</option>
                      <option value="hybrid">Hybrid Bench</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                      Experience Band
                    </label>
                    <select
                      value={experienceLevel}
                      onChange={(e) => setExperienceLevel(e.target.value)}
                      className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                    >
                      <option value="entry">Entry (0-1 yr)</option>
                      <option value="junior">Junior Tech (1-2 yrs)</option>
                      <option value="mid">Mid-Level Artisan (2-4 yrs)</option>
                      <option value="senior">Senior Specialist (5+ yrs)</option>
                      <option value="lead">Lab Lead / Master Tech</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* Section 2: Compensation Architecture */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                <h2 className="font-display text-lg font-bold uppercase tracking-tight text-enamel">
                  2. Compensation Architecture
                </h2>
                <div className="flex gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSalaryType("range")}
                    className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                      salaryType === "range"
                        ? "bg-signal text-white font-bold shadow-xs"
                        : "bg-bench text-steel hover:text-enamel"
                    }`}
                  >
                    Range
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType("fixed")}
                    className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                      salaryType === "fixed"
                        ? "bg-signal text-white font-bold shadow-xs"
                        : "bg-bench text-steel hover:text-enamel"
                    }`}
                  >
                    Fixed
                  </button>
                  <button
                    type="button"
                    onClick={() => setSalaryType("negotiable")}
                    className={`px-2.5 py-1 rounded font-mono text-xs transition-colors ${
                      salaryType === "negotiable"
                        ? "bg-signal text-white font-bold shadow-xs"
                        : "bg-bench text-steel hover:text-enamel"
                    }`}
                  >
                    Negotiable
                  </button>
                </div>
              </div>

              {salaryType !== "negotiable" ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                      Min Payout (₹)
                    </label>
                    <input
                      type="number"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      placeholder="45000"
                      className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                    />
                  </div>

                  {salaryType === "range" && (
                    <div>
                      <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                        Max Payout (₹)
                      </label>
                      <input
                        type="number"
                        value={salaryMax}
                        onChange={(e) => setSalaryMax(e.target.value)}
                        placeholder="75000"
                        className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                      />
                    </div>
                  )}

                  <div>
                    <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5">
                      Disbursement Period
                    </label>
                    <select
                      value={salaryPeriod}
                      onChange={(e) => setSalaryPeriod(e.target.value as any)}
                      className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                    >
                      <option value="month">Per Month</option>
                      <option value="week">Per Week</option>
                      <option value="per_job">Per Board / Job</option>
                    </select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-steel italic">
                  Salary is marked negotiable. Candidates can propose rates during inquiry.
                </p>
              )}
            </div>

            {/* Section 3: Technical Skills Badges */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-enamel border-b border-hairline pb-3 mb-4">
                3. Required Technical Badges &amp; Tool Proficiencies
              </h2>

              {/* Selected Badges */}
              <div className="flex flex-wrap gap-2 mb-3">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="inline-flex items-center gap-1.5 rounded bg-signal-wash border border-signal/30 px-3 py-1 text-xs font-mono font-bold text-signal"
                  >
                    <span>{skill}</span>
                    <button
                      type="button"
                      onClick={() => removeSkill(skill)}
                      className="hover:text-signal-lift transition-colors cursor-pointer"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>

              {/* Presets */}
              <div className="flex flex-wrap gap-1.5 mb-4">
                {PRESET_SKILLS.filter((ps) => !skills.includes(ps)).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => togglePresetSkill(preset)}
                    className="rounded border border-hairline bg-bench px-2.5 py-1 text-xs font-mono text-steel hover:border-signal/40 hover:text-enamel transition-colors cursor-pointer"
                  >
                    + {preset}
                  </button>
                ))}
              </div>

              {/* Custom Adder */}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={customSkill}
                  onChange={(e) => setCustomSkill(e.target.value)}
                  placeholder="Add custom bench credential (e.g. NAND JCID Programmer, JTAG)"
                  className="flex-1 rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none"
                />
                <button
                  type="button"
                  onClick={addCustomSkill}
                  className="rounded-machined bg-enamel px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-colors"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Section 4: Bench Duties & Diagnostic Equipment */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-enamel border-b border-hairline pb-3 mb-4">
                4. Bench Duties &amp; Diagnostic Responsibilities
              </h2>

              <textarea
                required
                rows={5}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe day-to-day bench tasks, specific station tools (Quick 861DW, Weller, Fluke DMM), and candidate expectations..."
                className="w-full rounded-machined border border-hairline bg-bench/50 p-3.5 text-xs sm:text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal"
              />
            </div>

            {/* Section 5: Direct Workshop Routing */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
              <h2 className="font-display text-lg font-bold uppercase tracking-tight text-enamel border-b border-hairline pb-3 mb-4">
                5. Direct Candidate Communication Channels
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5 flex items-center gap-1.5">
                    <Phone className="size-3 text-verdigris" />
                    Direct Workshop WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={contactWhatsapp}
                    onChange={(e) => setContactWhatsapp(e.target.value)}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-mono text-[11px] font-semibold uppercase tracking-wider text-enamel mb-1.5 flex items-center gap-1.5">
                    <MessageSquare className="size-3 text-signal" />
                    Applicant Contact Email
                  </label>
                  <input
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder={user?.email || "careers@yourworkshop.com"}
                    className="w-full rounded-machined border border-hairline bg-bench/50 px-3 py-2 text-xs text-enamel focus:border-signal focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Submit Action Strip */}
            <div className="flex items-center justify-between pt-2">
              <Link
                href="/"
                className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider"
              >
                &larr; Cancel &amp; Discard
              </Link>

              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center gap-2 rounded-machined bg-signal px-8 py-3.5 font-display text-sm font-bold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-98"
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

          {/* Preview Column (5 cols) */}
          <aside className="lg:col-span-5 sticky top-24 space-y-4">
            <div className="flex items-center justify-between px-1">
              <span className="font-mono text-xs font-bold uppercase tracking-wider text-steel flex items-center gap-1.5">
                <Eye className="size-3.5 text-signal" />
                Live Candidate Card Preview
              </span>
              <span className="font-mono text-[10px] text-verdigris font-semibold">
                ● Live Sync
              </span>
            </div>

            {/* Candidate Card Live Mockup */}
            <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench hover:border-steel-soft transition-all">
              <div className="flex flex-col gap-4">
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] font-bold uppercase tracking-wider text-signal bg-signal-wash border border-signal/20 px-2 py-0.5 rounded">
                        {jobType.replace("_", " ").toUpperCase()}
                      </span>
                      <span className="font-mono text-[10px] text-steel-soft">
                        {experienceLevel.toUpperCase()} BAND
                      </span>
                    </div>

                    <h3 className="font-display text-xl font-bold uppercase tracking-tight text-enamel">
                      {title || "Untitled Position"}
                    </h3>

                    <div className="mt-1 flex items-center gap-2 text-xs font-mono text-steel">
                      <span className="font-bold text-enamel">
                        {workshop ? workshop.shop_name : "Your Workshop Lab"}
                      </span>
                      <span>&middot;</span>
                      <span className="flex items-center gap-1">
                        <MapPin className="size-3 text-signal" />
                        {workshop?.address || "Clean Room Bench"}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compensation Banner */}
                <div className="rounded-machined border border-hairline bg-bench/60 p-3 flex items-center justify-between">
                  <span className="font-mono text-[11px] uppercase tracking-wider text-steel font-semibold">
                    Offered Payout
                  </span>
                  <div className="text-right">
                    <span className="font-display text-lg font-bold text-signal">
                      {salaryType === "negotiable"
                        ? "Negotiable Rate"
                        : salaryType === "fixed"
                        ? `₹${salaryMin} / ${salaryPeriod}`
                        : `₹${salaryMin} – ₹${salaryMax} / ${salaryPeriod}`}
                    </span>
                    <span className="block font-mono text-[9px] text-steel-soft">
                      100% Escrow Protected
                    </span>
                  </div>
                </div>

                {/* Description Preview */}
                <p className="text-xs text-steel leading-relaxed line-clamp-3">
                  {description || "No role duties provided yet."}
                </p>

                {/* Badges Preview */}
                <div className="flex flex-wrap gap-1.5 pt-2 border-t border-hairline">
                  {skills.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-bench border border-hairline px-2 py-0.5 font-mono text-[10px] font-semibold text-enamel"
                    >
                      {s}
                    </span>
                  ))}
                </div>

                {/* Apply Button Simulation */}
                <div className="pt-2">
                  <button
                    type="button"
                    disabled
                    className="w-full rounded-machined bg-enamel px-4 py-2.5 font-display text-xs font-bold uppercase tracking-wider text-bench flex items-center justify-center gap-2 opacity-90"
                  >
                    <span>Connect with Workshop (WhatsApp)</span>
                    <ArrowRight className="size-3.5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Diagnostic Guarantee Box */}
            <div className="rounded-machined border border-hairline bg-bench p-4 text-xs font-mono text-steel space-y-2">
              <div className="flex items-center gap-2 text-enamel font-bold">
                <ShieldCheck className="size-4 text-verdigris" />
                <span>FixGrid Verification Guarantee</span>
              </div>
              <p className="leading-relaxed">
                Vacancies published on hiring.vytron.me are automatically verified against workshop trade records. No candidate fees or agency commissions are ever charged.
              </p>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
