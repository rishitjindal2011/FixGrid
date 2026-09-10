"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  ChevronRight,
  ShieldCheck,
  Building2,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Sparkles,
  Phone,
  MessageSquare,
  Briefcase,
  Layers,
  Award,
  Link2,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase, type ShopJob } from "@/lib/supabase";

const SPECIALTY_OPTIONS = [
  "Micro-Soldering 0201/01005",
  "BGA Reballing & Underfill Rework",
  "Schematic & Boardview Diagnostics (ZXW)",
  "Thermal Camera & Short Tracing",
  "Oscilloscope Signal Triage",
  "iPhone Logic Board & FaceID Lab",
  "MacBook T2 / M-Series Logic Repair",
  "OLED Frame Split & OCA Lamination",
  "Console HDMI 2.1 & APU Rework",
  "Inverter AC Power Board Repair",
];

export default function ApplyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const jobId = resolvedParams.id;
  const router = useRouter();
  const { user } = useAuth();

  const [job, setJob] = useState<ShopJob | null>(null);
  const [loadingJob, setLoadingJob] = useState(true);

  // Form State
  const [candidateName, setCandidateName] = useState("");
  const [candidatePhone, setCandidatePhone] = useState("");
  const [candidateWhatsapp, setCandidateWhatsapp] = useState("");
  const [experienceYears, setExperienceYears] = useState("2-4 years");
  const [specialties, setSpecialties] = useState<string[]>([
    "Micro-Soldering 0201/01005",
    "BGA Reballing & Underfill Rework",
  ]);
  const [portfolioUrl, setPortfolioUrl] = useState("");
  const [coverNote, setCoverNote] = useState(
    "Experienced bench technician skilled in micro-soldering, short-circuit diagnostics using thermal imaging, and BGA reballing. Ready for immediate bench deployment."
  );

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    async function loadJob() {
      try {
        const { data, error } = await supabase
          .from("shop_jobs")
          .select("*, fixer_profiles:fixer_id(shop_name, slug, address, verified)")
          .eq("id", jobId)
          .single();

        if (!error && data) {
          setJob(data as unknown as ShopJob);
        }
      } catch (err) {
        console.error("Error loading job details:", err);
      } finally {
        setLoadingJob(false);
      }
    }
    loadJob();
  }, [jobId]);

  const toggleSpecialty = (item: string) => {
    if (specialties.includes(item)) {
      setSpecialties(specialties.filter((s) => s !== item));
    } else {
      setSpecialties([...specialties, item]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!user) {
      router.push(`/login?next=/apply/${jobId}`);
      return;
    }

    if (!job) {
      setError("Job details not loaded. Please try again.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await fetch("/api/applications/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId: job.id,
          fixerId: job.fixer_id,
          jobTitle: job.title,
          candidateId: user.id,
          candidateName: candidateName.trim(),
          candidateEmail: user.email,
          candidatePhone: candidatePhone.trim(),
          candidateWhatsapp: candidateWhatsapp.trim() || candidatePhone.trim(),
          experienceYears,
          specialties,
          portfolioUrl: portfolioUrl.trim(),
          coverNote: coverNote.trim(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.error || "Failed to submit bench application");
      }

      setSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error submitting application";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingJob) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-steel">
          <Loader2 className="size-4 animate-spin text-signal" />
          <span>Loading Bench Opening Specifications...</span>
        </div>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center p-4">
        <div className="rounded-machined border border-hairline bg-chalk p-8 text-center max-w-md shadow-bench">
          <AlertCircle className="size-8 text-rust mx-auto mb-3" />
          <h2 className="font-display text-xl font-bold uppercase text-enamel">
            Bench Seat Not Found
          </h2>
          <p className="text-xs text-steel mt-2">
            The requested vacancy may have expired or been filled.
          </p>
          <Link
            href="/"
            className="mt-5 inline-block rounded-machined bg-signal px-5 py-2 font-display text-xs font-semibold uppercase text-white hover:bg-signal-lift transition-colors"
          >
            Browse Active Openings
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Top Header */}
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
                  CANDIDATE DESK
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                hiring.vytron.me
              </span>
            </div>
          </Link>

          <div className="hidden md:flex items-center gap-2 font-mono text-xs text-steel">
            <Link href="/" className="hover:text-enamel transition-colors">
              Bench Openings
            </Link>
            <ChevronRight className="size-3.5 text-steel-soft" />
            <span className="text-enamel font-medium truncate max-w-[200px]">{job.title}</span>
            <ChevronRight className="size-3.5 text-steel-soft" />
            <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 text-signal font-semibold">
              Candidate Application
            </span>
          </div>

          <Link
            href="/"
            className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider"
          >
            &larr; Back to Openings
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 py-8 sm:py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Vacancy Summary Card */}
          <div className="mb-8 rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="rounded bg-signal-wash border border-signal/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-signal">
                    {job.job_type.replace("_", " ")}
                  </span>
                  <span className="font-mono text-[11px] text-steel">
                    {job.fixer_profiles?.shop_name || "Verified Workshop Lab"}
                  </span>
                  {job.fixer_profiles?.verified && (
                    <span className="rounded bg-verdigris-wash border border-verdigris/30 px-1.5 py-0.2 font-mono text-[9px] text-verdigris font-semibold">
                      VERIFIED BENCH
                    </span>
                  )}
                </div>
                <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-enamel">
                  {job.title}
                </h1>
                <p className="mt-1 text-xs text-steel">
                  {job.work_location === "in_shop" ? "In-Shop Dedicated Clean Bench" : job.work_location} &middot; {job.fixer_profiles?.address || "Delhi NCR"}
                </p>
              </div>

              <div className="flex flex-col md:items-end shrink-0">
                <span className="font-mono text-[10px] text-steel-soft uppercase">Target Compensation</span>
                <span className="font-display text-xl sm:text-2xl font-bold text-signal">
                  {job.salary_type === "range" && job.salary_min && job.salary_max
                    ? `₹${job.salary_min.toLocaleString("en-IN")} – ₹${job.salary_max.toLocaleString("en-IN")}`
                    : job.salary_min
                    ? `₹${job.salary_min.toLocaleString("en-IN")}`
                    : "Competitive Trade Rate"}
                  <span className="font-mono text-xs text-steel font-normal"> / {job.salary_period}</span>
                </span>
                <span className="font-mono text-[10px] text-steel-soft">Escrow-backed monthly payouts</span>
              </div>
            </div>
          </div>

          {/* Mandatory Candidate Auth Check */}
          {!user ? (
            <div className="rounded-machined border border-signal/40 bg-signal-wash p-8 shadow-bench max-w-2xl mx-auto text-center">
              <div className="size-12 rounded-full bg-signal text-white flex items-center justify-center mx-auto mb-4">
                <Lock className="size-6" />
              </div>
              <h2 className="font-display text-2xl font-bold uppercase text-enamel">
                Candidate Account Required
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-steel leading-relaxed max-w-md mx-auto">
                To maintain physical repair bench standards and prevent spam inquiries, you must sign in or register a verified technician profile to apply.
              </p>

              <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href={`/login?next=/apply/${jobId}`}
                  className="w-full sm:w-auto rounded-machined bg-signal px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
                >
                  Sign In as Candidate &rarr;
                </Link>
                <Link
                  href={`/signup?next=/apply/${jobId}`}
                  className="w-full sm:w-auto rounded-machined border border-enamel bg-transparent px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:bg-chalk transition-all"
                >
                  Create Technician Profile
                </Link>
              </div>

              <div className="mt-5 pt-4 border-t border-hairline font-mono text-[11px] text-steel-soft">
                Zero application surcharges &middot; Direct workshop WhatsApp connection on shortlisting
              </div>
            </div>
          ) : success ? (
            <div className="rounded-machined border border-verdigris/30 bg-chalk p-8 shadow-bench max-w-2xl mx-auto text-center">
              <div className="size-14 rounded-full bg-verdigris-wash border border-verdigris/30 text-verdigris flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="size-8" />
              </div>
              <span className="font-mono text-[10px] text-verdigris font-bold uppercase tracking-wider">
                Bench Ticket Dispatched
              </span>
              <h2 className="font-display text-2xl font-bold uppercase text-enamel mt-1">
                Application Submitted Successfully!
              </h2>
              <p className="mt-2 text-xs sm:text-sm text-steel leading-relaxed max-w-md mx-auto">
                Your credentials and repair specialties have been routed directly to the workshop lead at <strong className="text-enamel">{job.fixer_profiles?.shop_name}</strong>.
              </p>

              <div className="mt-6 rounded-machined border border-hairline bg-bench p-4 max-w-sm mx-auto text-left font-mono text-xs">
                <div className="text-[10px] text-steel-soft uppercase">Application Status</div>
                <div className="font-bold text-enamel mt-0.5">● Under Workshop Review</div>
                <div className="text-[10px] text-steel-soft mt-2">Next Step</div>
                <div className="text-steel mt-0.5">The shop lead will contact you via WhatsApp / Phone on {candidatePhone}.</div>
              </div>

              <div className="mt-6 flex justify-center gap-3">
                <Link
                  href="/"
                  className="rounded-machined bg-enamel px-6 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-all"
                >
                  Browse More Bench Openings
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              {/* Application Form */}
              <div className="lg:col-span-7">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {error && (
                    <div className="flex items-start gap-3 rounded-machined border border-rust/30 bg-rust-wash p-4 text-xs text-rust">
                      <AlertCircle className="size-4 shrink-0 mt-0.5" />
                      <span>{error}</span>
                    </div>
                  )}

                  <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench">
                    <div className="flex items-center gap-2 border-b border-hairline pb-3 mb-5">
                      <Briefcase className="size-4 text-signal" />
                      <h2 className="font-display text-base font-semibold uppercase tracking-wide text-enamel">
                        Candidate Credentials &amp; Contact
                      </h2>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Full Legal / Trade Name <span className="text-rust">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={candidateName}
                          onChange={(e) => setCandidateName(e.target.value)}
                          placeholder="e.g. Rahul Sharma"
                          className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                            Primary Phone Number <span className="text-rust">*</span>
                          </label>
                          <input
                            type="tel"
                            required
                            value={candidatePhone}
                            onChange={(e) => setCandidatePhone(e.target.value)}
                            placeholder="+91 98765 43210"
                            className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                          />
                        </div>

                        <div>
                          <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                            WhatsApp for Interview Setup
                          </label>
                          <input
                            type="tel"
                            value={candidateWhatsapp}
                            onChange={(e) => setCandidateWhatsapp(e.target.value)}
                            placeholder="Leave blank if same as phone"
                            className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Bench Experience Level
                        </label>
                        <select
                          value={experienceYears}
                          onChange={(e) => setExperienceYears(e.target.value)}
                          className="w-full rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel font-mono focus:border-signal focus:bg-chalk focus:outline-none"
                        >
                          <option value="Trainee / Fresher (0-1 yr)">Trainee / Fresher (0-1 yr)</option>
                          <option value="Junior Tech (1-3 yrs)">Junior Tech (1-3 yrs)</option>
                          <option value="Senior Specialist (3-5 yrs)">Senior Specialist (3-5 yrs)</option>
                          <option value="Master Lead (5+ yrs)">Master Lead (5+ yrs)</option>
                        </select>
                      </div>

                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-2">
                          Repair Disciplines &amp; Bench Tool Proficiencies
                        </label>
                        <div className="flex flex-wrap gap-2">
                          {SPECIALTY_OPTIONS.map((spec) => {
                            const isSelected = specialties.includes(spec);
                            return (
                              <button
                                key={spec}
                                type="button"
                                onClick={() => toggleSpecialty(spec)}
                                className={`rounded border px-2.5 py-1 text-xs font-mono transition-all cursor-pointer ${
                                  isSelected
                                    ? "border-signal bg-signal-wash text-signal font-bold shadow-xs"
                                    : "border-hairline bg-bench text-steel hover:bg-chalk"
                                }`}
                              >
                                {isSelected ? "✓ " : "+ "}
                                {spec}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Portfolio / Repair Photos Link (Optional)
                        </label>
                        <div className="relative">
                          <Link2 className="absolute left-3 top-3 size-4 text-steel-soft" />
                          <input
                            type="url"
                            value={portfolioUrl}
                            onChange={(e) => setPortfolioUrl(e.target.value)}
                            placeholder="https://instagram.com/myrepairs or Google Drive link"
                            className="w-full pl-9 rounded-machined border border-hairline bg-bench/50 px-3.5 py-2.5 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block font-mono text-xs font-semibold uppercase tracking-wider text-enamel mb-1.5">
                          Workbench Message / Diagnostic Experience
                        </label>
                        <textarea
                          rows={4}
                          value={coverNote}
                          onChange={(e) => setCoverNote(e.target.value)}
                          placeholder="Detail your station setup, microscopes you use, and typical troubleshooting speed..."
                          className="w-full rounded-machined border border-hairline bg-bench/50 p-3 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:bg-chalk focus:outline-none focus:ring-1 focus:ring-signal transition-all"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="font-mono text-[11px] text-steel-soft">
                      Signed in as: <span className="text-enamel font-bold">{user.email}</span>
                    </div>

                    <button
                      type="submit"
                      disabled={submitting}
                      className="flex items-center justify-center gap-2 rounded-machined bg-signal px-8 py-3.5 font-display text-sm font-semibold uppercase tracking-wider text-white shadow-lift hover:bg-signal-lift transition-all disabled:opacity-50 cursor-pointer active:scale-95"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="size-4 animate-spin" />
                          <span>Transmitting Application...</span>
                        </>
                      ) : (
                        <>
                          <span>Submit Bench Application</span>
                          <ArrowRight className="size-4" />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>

              {/* Real-time Candidate Card Preview */}
              <div className="lg:col-span-5 sticky top-24">
                <div className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench">
                  <div className="flex items-center justify-between border-b border-hairline pb-3 mb-4">
                    <div className="flex items-center gap-2">
                      <Award className="size-4 text-signal" />
                      <span className="font-display text-xs font-bold uppercase tracking-wider text-enamel">
                        Candidate Profile Preview
                      </span>
                    </div>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-verdigris bg-verdigris-wash border border-verdigris/20 px-2 py-0.5 rounded font-bold">
                      WORKSHOP VIEW
                    </span>
                  </div>

                  <div className="rounded-machined border border-hairline bg-bench p-4 shadow-sm">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="flex size-10 items-center justify-center rounded-machined bg-enamel text-bench font-mono font-bold text-sm">
                        {candidateName ? candidateName.charAt(0).toUpperCase() : "C"}
                      </div>
                      <div>
                        <div className="font-display text-base font-bold uppercase text-enamel">
                          {candidateName || "Candidate Full Name"}
                        </div>
                        <div className="font-mono text-[11px] text-steel-soft">
                          {experienceYears} &middot; {user.email}
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-hairline pt-2.5">
                      <span className="font-mono text-[10px] text-steel-soft uppercase block mb-1.5 font-bold">
                        Specialties Claimed ({specialties.length})
                      </span>
                      <div className="flex flex-wrap gap-1">
                        {specialties.map((s) => (
                          <span
                            key={s}
                            className="rounded bg-chalk border border-hairline px-2 py-0.5 font-mono text-[9px] text-enamel"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="mt-3 border-t border-hairline pt-2.5">
                      <span className="font-mono text-[10px] text-steel-soft uppercase block mb-1 font-bold">
                        Applicant Workbench Note
                      </span>
                      <p className="text-xs text-steel line-clamp-3 leading-relaxed">
                        {coverNote || "No message written yet."}
                      </p>
                    </div>

                    {candidatePhone && (
                      <div className="mt-3 border-t border-hairline pt-2 flex items-center justify-between text-xs font-mono text-steel">
                        <span>📞 {candidatePhone}</span>
                        <span className="text-verdigris font-semibold">Direct WhatsApp Route</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
