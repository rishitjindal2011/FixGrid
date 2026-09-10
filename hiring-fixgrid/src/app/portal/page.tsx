"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Wrench,
  Briefcase,
  Inbox,
  Plus,
  Settings,
  ShieldCheck,
  Building2,
  Users,
  Phone,
  MessageSquare,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Sparkles,
  Search,
  Filter,
  LogOut,
  MapPin,
  Lock,
  Tag,
  Check,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { supabase, type ShopJob } from "@/lib/supabase";

interface CandidateApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  candidateName: string;
  candidateEmail?: string;
  candidatePhone: string;
  candidateWhatsapp?: string;
  experienceYears: string;
  specialties: string[];
  portfolioUrl?: string;
  coverNote: string;
  status: string;
  created_at: string;
}

export default function WorkshopPortalPage() {
  const router = useRouter();
  const { user, workshop, loading: authLoading, signOut } = useAuth();

  const [activeTab, setActiveTab] = useState<"jobs" | "applications" | "settings">("jobs");
  const [jobs, setJobs] = useState<ShopJob[]>([]);
  const [applications, setApplications] = useState<CandidateApplication[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const [appSearch, setAppSearch] = useState("");
  const [appFilter, setAppFilter] = useState("all");

  const [togglingJobId, setTogglingJobId] = useState<string | null>(null);

  useEffect(() => {
    async function loadPortalData() {
      if (!workshop?.id) {
        setLoadingData(false);
        return;
      }

      setLoadingData(true);
      try {
        // 1. Fetch Workshop Jobs
        const { data: jobRows } = await supabase
          .from("shop_jobs")
          .select("*")
          .eq("fixer_id", workshop.id)
          .order("created_at", { ascending: false });

        if (jobRows) {
          setJobs(jobRows as ShopJob[]);
        }

        // 2. Fetch Received Inquiries / Candidate Applications
        const res = await fetch(`/api/applications?fixerId=${workshop.id}`);
        const appRes = await res.json();
        if (appRes.applications) {
          setApplications(appRes.applications);
        }
      } catch (err) {
        console.error("Error loading portal data:", err);
      } finally {
        setLoadingData(false);
      }
    }

    if (!authLoading) {
      loadPortalData();
    }
  }, [workshop?.id, authLoading]);

  const toggleJobStatus = async (jobId: string, currentStatus: boolean) => {
    setTogglingJobId(jobId);
    try {
      const { error } = await supabase
        .from("shop_jobs")
        .update({ is_active: !currentStatus })
        .eq("id", jobId);

      if (!error) {
        setJobs(jobs.map((j) => (j.id === jobId ? { ...j, is_active: !currentStatus } : j)));
      }
    } catch (err) {
      console.error("Failed to toggle job active status:", err);
    } finally {
      setTogglingJobId(null);
    }
  };

  const filteredApplications = useMemo(() => {
    return applications.filter((app) => {
      if (appFilter !== "all" && app.status.toLowerCase() !== appFilter.toLowerCase()) {
        return false;
      }
      if (appSearch.trim()) {
        const q = appSearch.toLowerCase().trim();
        const matchesName = app.candidateName.toLowerCase().includes(q);
        const matchesRole = app.jobTitle.toLowerCase().includes(q);
        const matchesPhone = app.candidatePhone.includes(q);
        const matchesSpec = app.specialties.some((s) => s.toLowerCase().includes(q));
        if (!matchesName && !matchesRole && !matchesPhone && !matchesSpec) {
          return false;
        }
      }
      return true;
    });
  }, [applications, appFilter, appSearch]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center">
        <div className="flex items-center gap-2 text-sm font-mono text-steel">
          <Loader2 className="size-4 animate-spin text-signal" />
          <span>Verifying Workshop Bench Credentials...</span>
        </div>
      </div>
    );
  }

  if (!user || !workshop) {
    return (
      <div className="min-h-screen bg-bench flex items-center justify-center p-4">
        <div className="rounded-machined border border-hairline bg-chalk p-8 max-w-md w-full shadow-bench text-center">
          <Lock className="size-8 text-signal mx-auto mb-3" />
          <h2 className="font-display text-2xl font-bold uppercase text-enamel">
            Workshop Authentication Required
          </h2>
          <p className="mt-2 text-xs text-steel leading-relaxed">
            You must be signed in with an authorized workshop bench profile to access recruitment operations and received candidate inquiries.
          </p>
          <div className="mt-6 flex flex-col gap-2.5">
            <Link
              href="/login?next=/portal"
              className="w-full rounded-machined bg-signal px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
            >
              Sign In to Workshop Portal &rarr;
            </Link>
            <Link
              href="/signup?next=/portal"
              className="w-full rounded-machined border border-hairline bg-bench px-5 py-2.5 font-display text-xs font-semibold uppercase tracking-wider text-enamel hover:bg-chalk transition-all"
            >
              Register New Workshop
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bench text-enamel flex flex-col">
      {/* Top Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
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
                    WORKSHOP PORTAL
                  </span>
                </div>
                <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                  hiring.vytron.me
                </span>
              </div>
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/post"
              className="inline-flex items-center gap-1.5 rounded-machined bg-signal px-3.5 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all active:scale-95"
            >
              <Plus className="size-3.5 stroke-[3]" />
              <span className="hidden sm:inline">Post Bench Vacancy</span>
            </Link>

            <Link
              href="/"
              className="font-mono text-xs text-steel hover:text-enamel transition-colors uppercase tracking-wider hidden sm:block"
            >
              &larr; View Public Catalog
            </Link>
          </div>
        </div>
      </header>

      {/* Main Portal Dashboard with Sidebar */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Sidebar */}
          <aside className="lg:col-span-3 sticky top-24">
            <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench flex flex-col gap-4">
              {/* Workshop Identity Mini-Card */}
              <div className="border-b border-hairline pb-4">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-machined bg-enamel text-bench font-mono font-bold text-sm">
                    {workshop.shop_name.charAt(0).toUpperCase()}
                  </div>
                  <div className="overflow-hidden">
                    <div className="flex items-center gap-1">
                      <span className="font-display text-sm font-bold uppercase text-enamel truncate">
                        {workshop.shop_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 text-[10px] font-mono text-verdigris">
                      <ShieldCheck className="size-3" />
                      <span>VERIFIED WORKSHOP</span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-[11px] font-mono text-steel-soft truncate">
                  {workshop.address || "Industrial Electronics District"}
                </div>
              </div>

              {/* Navigation Tabs */}
              <nav className="flex flex-col gap-1">
                <button
                  onClick={() => setActiveTab("jobs")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "jobs"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Briefcase className="size-4" />
                    <span>Bench Vacancies</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      activeTab === "jobs" ? "bg-bench text-enamel" : "bg-bench text-steel"
                    }`}
                  >
                    {jobs.length}
                  </span>
                </button>

                <button
                  onClick={() => setActiveTab("applications")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "applications"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Inbox className="size-4" />
                    <span>Inquiries Received</span>
                  </span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                      applications.length > 0
                        ? "bg-signal text-white"
                        : activeTab === "applications"
                        ? "bg-bench text-enamel"
                        : "bg-bench text-steel"
                    }`}
                  >
                    {applications.length}
                  </span>
                </button>

                <Link
                  href="/post"
                  className="flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium text-steel hover:bg-bench hover:text-enamel transition-all"
                >
                  <span className="flex items-center gap-2">
                    <Plus className="size-4 text-signal" />
                    <span>Post New Bench Seat</span>
                  </span>
                  <span className="text-steel-soft">&rarr;</span>
                </Link>

                <button
                  onClick={() => setActiveTab("settings")}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-machined text-xs font-mono font-medium transition-all cursor-pointer ${
                    activeTab === "settings"
                      ? "bg-enamel text-bench font-bold shadow-xs"
                      : "text-steel hover:bg-bench hover:text-enamel"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Settings className="size-4" />
                    <span>Workshop Settings</span>
                  </span>
                </button>
              </nav>

              <div className="pt-3 border-t border-hairline">
                <button
                  onClick={async () => {
                    await signOut();
                    router.push("/");
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-mono text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                >
                  <LogOut className="size-3.5" />
                  <span>Bench Sign Out</span>
                </button>
              </div>
            </div>
          </aside>

          {/* Main Dashboard Workspace */}
          <main className="lg:col-span-9">
            {/* TAB 1: BENCH VACANCIES */}
            {activeTab === "jobs" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                  <div>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                      Active Bench Vacancies
                    </h1>
                    <p className="text-xs text-steel mt-0.5">
                      Broadcast technician seats to micro-soldering and logic board specialists across India.
                    </p>
                  </div>

                  <Link
                    href="/post"
                    className="inline-flex items-center gap-1.5 rounded-machined bg-signal px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all"
                  >
                    <Plus className="size-3.5 stroke-[3]" />
                    <span>New Bench Vacancy</span>
                  </Link>
                </div>

                {/* Metrics Summary Strip */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Live Openings</span>
                    <div className="font-display text-2xl font-bold text-enamel mt-1">
                      {jobs.filter((j) => j.is_active).length}
                    </div>
                  </div>
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Total Applications Received</span>
                    <div className="font-display text-2xl font-bold text-signal mt-1">
                      {applications.length}
                    </div>
                  </div>
                  <div className="rounded-machined border border-hairline bg-chalk p-4 shadow-bench">
                    <span className="font-mono text-[10px] uppercase text-steel-soft">Escrow Protection</span>
                    <div className="font-display text-2xl font-bold text-verdigris mt-1">
                      100% Active
                    </div>
                  </div>
                </div>

                {/* Vacancy List */}
                {jobs.length === 0 ? (
                  <div className="rounded-machined border border-hairline bg-chalk p-12 text-center shadow-bench flex flex-col items-center">
                    <Briefcase className="size-8 text-steel-soft mb-3" />
                    <h3 className="font-display text-lg font-bold uppercase text-enamel">
                      No Vacancies Published Yet
                    </h3>
                    <p className="text-xs text-steel mt-1 max-w-sm">
                      Your workshop has no active bench openings broadcast to candidates.
                    </p>
                    <Link
                      href="/post"
                      className="mt-4 rounded-machined bg-signal px-5 py-2 font-display text-xs font-semibold uppercase text-white hover:bg-signal-lift transition-colors"
                    >
                      Create First Bench Vacancy
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="rounded-machined border border-hairline bg-chalk p-5 shadow-bench flex flex-col md:flex-row md:items-center justify-between gap-4"
                      >
                        <div className="space-y-1.5 flex-1">
                          <div className="flex items-center gap-2">
                            <span
                              className={`rounded px-2 py-0.5 font-mono text-[10px] font-bold uppercase ${
                                job.is_active
                                  ? "bg-verdigris-wash border border-verdigris/30 text-verdigris"
                                  : "bg-bench border border-hairline text-steel-soft"
                              }`}
                            >
                              {job.is_active ? "● Broadcasting Live" : "Paused / Offline"}
                            </span>
                            <span className="font-mono text-xs text-steel uppercase">
                              {job.job_type.replace("_", " ")}
                            </span>
                          </div>

                          <h3 className="font-display text-lg font-bold uppercase text-enamel">
                            {job.title}
                          </h3>

                          <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-steel">
                            <span>
                              💰{" "}
                              {job.salary_type === "range" && job.salary_min && job.salary_max
                                ? `₹${job.salary_min.toLocaleString("en-IN")} – ₹${job.salary_max.toLocaleString("en-IN")}`
                                : job.salary_min
                                ? `₹${job.salary_min.toLocaleString("en-IN")}`
                                : "Negotiable"}{" "}
                              / {job.salary_period}
                            </span>
                            <span>&middot;</span>
                            <span>📍 {job.work_location === "in_shop" ? "In-Shop Clean Bench" : job.work_location}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            type="button"
                            disabled={togglingJobId === job.id}
                            onClick={() => toggleJobStatus(job.id, job.is_active)}
                            className="rounded-machined border border-hairline bg-bench hover:bg-chalk px-3 py-1.5 font-mono text-xs text-enamel transition-colors cursor-pointer"
                          >
                            {togglingJobId === job.id
                              ? "Updating..."
                              : job.is_active
                              ? "Pause Vacancy"
                              : "Activate"}
                          </button>

                          <Link
                            href={`/apply/${job.id}`}
                            target="_blank"
                            className="inline-flex items-center gap-1 rounded-machined bg-enamel px-3.5 py-1.5 font-display text-xs font-semibold uppercase tracking-wider text-bench hover:bg-enamel-lift transition-colors"
                          >
                            <span>Preview</span>
                            <ExternalLink className="size-3" />
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: INQUIRIES & APPLICATIONS RECEIVED */}
            {activeTab === "applications" && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-hairline pb-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-signal font-bold">
                        CANDIDATE PIPELINE
                      </span>
                      <span className="rounded-full bg-signal px-2 py-0.2 font-mono text-[9px] font-bold text-white">
                        {applications.length} Received
                      </span>
                    </div>
                    <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                      Inquiries &amp; Applications Received
                    </h1>
                    <p className="text-xs text-steel mt-0.5">
                      Review incoming technician credentials, examine repair portfolios, and initiate direct workshop interviews.
                    </p>
                  </div>
                </div>

                {/* Filters Strip */}
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 size-3.5 text-steel-soft" />
                    <input
                      type="text"
                      value={appSearch}
                      onChange={(e) => setAppSearch(e.target.value)}
                      placeholder="Search candidates by name, skill, or role..."
                      className="w-full pl-8 rounded-machined border border-hairline bg-chalk px-3 py-1.5 text-xs text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    {["all", "pending review", "shortlisted", "hired"].map((status) => (
                      <button
                        key={status}
                        onClick={() => setAppFilter(status)}
                        className={`rounded border px-2.5 py-1 text-xs font-mono capitalize transition-all cursor-pointer ${
                          appFilter === status
                            ? "bg-enamel text-bench border-enamel font-bold"
                            : "bg-chalk text-steel border-hairline hover:bg-bench"
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Applications Stream */}
                {filteredApplications.length === 0 ? (
                  <div className="rounded-machined border border-hairline bg-chalk p-12 text-center shadow-bench flex flex-col items-center">
                    <Inbox className="size-8 text-steel-soft mb-3" />
                    <h3 className="font-display text-lg font-bold uppercase text-enamel">
                      No Applications in this View
                    </h3>
                    <p className="text-xs text-steel mt-1 max-w-sm">
                      When candidates apply via your vacancy links, their credentials, diagnostic notes, and portfolio links will stream here automatically.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {filteredApplications.map((app) => {
                      const cleanPhone = app.candidatePhone.replace(/[^0-9]/g, "");
                      const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(
                        `Hello ${app.candidateName}, this is ${workshop.shop_name}. We reviewed your application for the ${app.jobTitle} position on FixGrid.`
                      )}`;

                      return (
                        <div
                          key={app.id}
                          className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-hairline pb-4">
                            <div className="flex items-start gap-3">
                              <div className="flex size-11 shrink-0 items-center justify-center rounded-machined bg-enamel text-bench font-mono font-bold text-base">
                                {app.candidateName.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h3 className="font-display text-lg font-bold uppercase text-enamel">
                                    {app.candidateName}
                                  </h3>
                                  <span className="rounded bg-signal-wash border border-signal/20 px-2 py-0.5 font-mono text-[9px] font-bold uppercase text-signal">
                                    {app.experienceYears}
                                  </span>
                                </div>
                                <div className="font-mono text-xs text-steel mt-0.5">
                                  Applied for: <strong className="text-enamel">{app.jobTitle}</strong>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2">
                              <span className="rounded bg-verdigris-wash border border-verdigris/30 px-2.5 py-1 font-mono text-[10px] text-verdigris font-bold uppercase">
                                {app.status || "Pending Review"}
                              </span>
                            </div>
                          </div>

                          {/* Specialties Badges */}
                          {app.specialties && app.specialties.length > 0 && (
                            <div>
                              <span className="font-mono text-[10px] uppercase text-steel-soft font-bold block mb-1.5">
                                Verified Bench Proficiencies:
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {app.specialties.map((spec) => (
                                  <span
                                    key={spec}
                                    className="rounded bg-bench border border-hairline px-2 py-0.5 font-mono text-[10px] text-enamel"
                                  >
                                    {spec}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cover Note */}
                          <div className="rounded-machined border border-hairline bg-bench/50 p-3 text-xs text-steel leading-relaxed">
                            <span className="font-mono text-[10px] text-steel-soft uppercase font-bold block mb-1">
                              Applicant Statement:
                            </span>
                            {app.coverNote}
                          </div>

                          {/* Action Footer: Call, WhatsApp, External Links */}
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-2 border-t border-hairline">
                            <div className="flex items-center gap-3 text-xs font-mono text-steel">
                              <span>📞 {app.candidatePhone}</span>
                              {app.portfolioUrl && (
                                <a
                                  href={app.portfolioUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-signal hover:underline flex items-center gap-1 font-semibold"
                                >
                                  <span>Portfolio Proof</span>
                                  <ExternalLink className="size-3" />
                                </a>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <a
                                href={whatsappUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 rounded-machined bg-[#25D366] px-4 py-2 font-mono text-xs font-bold text-white shadow-sm hover:bg-[#1EBE5D] transition-colors"
                              >
                                <MessageSquare className="size-3.5 fill-current" />
                                <span>WhatsApp Candidate</span>
                              </a>

                              <a
                                href={`tel:${cleanPhone}`}
                                className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench px-3 py-2 font-mono text-xs text-enamel hover:bg-chalk transition-colors"
                              >
                                <Phone className="size-3.5" />
                                <span>Call</span>
                              </a>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* TAB 4: WORKSHOP SETTINGS */}
            {activeTab === "settings" && (
              <div className="space-y-6">
                <div className="border-b border-hairline pb-4">
                  <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-enamel">
                    Workshop Profile &amp; Bench Settings
                  </h1>
                  <p className="text-xs text-steel mt-0.5">
                    Manage your verified repair facility information displayed to candidates.
                  </p>
                </div>

                <div className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench space-y-4 max-w-xl">
                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase text-steel mb-1">
                      Workshop Legal Trade Name
                    </label>
                    <input
                      type="text"
                      disabled
                      value={workshop.shop_name}
                      className="w-full rounded-machined border border-hairline bg-bench/60 px-3.5 py-2 text-sm text-enamel opacity-90 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase text-steel mb-1">
                      Physical Laboratory Address
                    </label>
                    <input
                      type="text"
                      disabled
                      value={workshop.address || "Industrial Electronics District"}
                      className="w-full rounded-machined border border-hairline bg-bench/60 px-3.5 py-2 text-sm text-enamel opacity-90 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-xs font-semibold uppercase text-steel mb-1">
                      Owner Email Session
                    </label>
                    <input
                      type="text"
                      disabled
                      value={user.email}
                      className="w-full rounded-machined border border-hairline bg-bench/60 px-3.5 py-2 text-sm text-enamel opacity-90 font-mono"
                    />
                  </div>

                  <div className="pt-3 border-t border-hairline flex items-center gap-2 text-xs font-mono text-verdigris">
                    <ShieldCheck className="size-4" />
                    <span>Physical Workshop Verification Escrow Active &middot; FixGrid ID: #{workshop.id.slice(0, 8)}</span>
                  </div>
                </div>
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
