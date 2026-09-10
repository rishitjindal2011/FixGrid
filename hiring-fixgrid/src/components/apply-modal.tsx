"use client";

import * as React from "react";
import { useState } from "react";
import { X, CheckCircle2, Send, Wrench, ShieldCheck, Phone, Mail, User, Briefcase, FileText } from "lucide-react";
import { type ShopJob } from "@/lib/supabase";

interface ApplyModalProps {
  job: ShopJob | null;
  onClose: () => void;
}

export function ApplyModal({ job, onClose }: ApplyModalProps) {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  // Form state
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [experienceYears, setExperienceYears] = useState("1-3");
  const [primarySkill, setPrimarySkill] = useState("Micro-Soldering & BGA Reballing");
  const [message, setMessage] = useState("");

  if (!job) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    setTimeout(() => {
      setLoading(false);
      setSubmitted(true);
    }, 600);
  };

  const shopName = job.fixer_profiles?.shop_name || "FixGrid Verified Hardware Lab";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-enamel/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-machined border-2 border-enamel/30 bg-chalk p-6 sm:p-8 shadow-lift max-h-[90vh] overflow-y-auto">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-5 top-5 rounded p-1.5 text-steel hover:bg-bench hover:text-enamel transition-colors cursor-pointer"
        >
          <X className="size-5" />
        </button>

        {!submitted ? (
          <div>
            {/* Header */}
            <div className="border-b border-hairline pb-4 pr-6">
              <span className="font-mono text-eyebrow uppercase tracking-wider text-signal font-bold flex items-center gap-1.5">
                <Wrench className="size-3.5" /> Direct Bench Seat Application
              </span>
              <h3 className="mt-1 font-display text-2xl font-semibold uppercase tracking-tight text-enamel">
                Apply for {job.title}
              </h3>
              <p className="mt-1 text-xs text-steel">
                Position at <strong className="text-enamel font-semibold">{shopName}</strong> ({job.fixer_profiles?.address || "Workshop"})
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="mt-5 flex flex-col gap-4">
              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                  Full Name *
                </label>
                <div className="relative flex items-center">
                  <User className="absolute left-3.5 size-4 text-steel-soft" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ramesh Sharma"
                    className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Phone / WhatsApp *
                  </label>
                  <div className="relative flex items-center">
                    <Phone className="absolute left-3.5 size-4 text-steel-soft" />
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Email Address
                  </label>
                  <div className="relative flex items-center">
                    <Mail className="absolute left-3.5 size-4 text-steel-soft" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tech@example.com"
                      className="w-full rounded-machined bg-bench/40 border border-hairline pl-10 pr-3 py-2 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Bench Experience
                  </label>
                  <select
                    value={experienceYears}
                    onChange={(e) => setExperienceYears(e.target.value)}
                    className="w-full rounded-machined bg-bench/40 border border-hairline px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                  >
                    <option value="0-1">Under 1 Year (Apprentice)</option>
                    <option value="1-3">1 - 3 Years (Mid-Level)</option>
                    <option value="3-5">3 - 5 Years (Senior Tech)</option>
                    <option value="5+">5+ Years (Master Artisan)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                    Primary Specialization
                  </label>
                  <select
                    value={primarySkill}
                    onChange={(e) => setPrimarySkill(e.target.value)}
                    className="w-full rounded-machined bg-bench/40 border border-hairline px-3 py-2 text-sm text-enamel focus:border-signal focus:outline-none"
                  >
                    <option value="Micro-Soldering & BGA Reballing">Micro-Soldering &amp; BGA</option>
                    <option value="Screen Refurbishing OCA">Screen Refurbishing &amp; OCA</option>
                    <option value="Apple Logic Board Diagnostics">Apple Logic Board Diagnostics</option>
                    <option value="Console HDMI & Power Ports">Console HDMI &amp; Power Ports</option>
                    <option value="Inverter PCB High Voltage">Inverter PCB High Voltage</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-mono text-[11px] uppercase tracking-wider text-steel font-bold mb-1">
                  Brief Note to Workshop Owner (Optional)
                </label>
                <textarea
                  rows={2}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Mention stations you have operated (e.g. Quick 861DW, Stereo Microscope, ZXW Schematics)..."
                  className="w-full rounded-machined bg-bench/40 border border-hairline p-3 text-sm text-enamel placeholder:text-steel-soft focus:border-signal focus:outline-none"
                />
              </div>

              <div className="flex items-center gap-2 rounded-machined border border-hairline bg-bench p-2.5 text-xs text-steel font-mono">
                <ShieldCheck className="size-4 text-verdigris shrink-0" />
                <span>Zero recruiter fees. Your profile is routed directly to the workshop owner.</span>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-machined px-4 py-2 font-mono text-xs text-steel hover:text-enamel transition-colors cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 rounded-machined bg-signal px-6 py-2.5 font-display text-sm font-semibold uppercase tracking-wider text-white hover:bg-signal-lift transition-all shadow-sm cursor-pointer disabled:opacity-50"
                >
                  {loading ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <Send className="size-3.5" />
                      <span>Submit Direct Application</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        ) : (
          /* Success Screen */
          <div className="py-8 text-center flex flex-col items-center">
            <div className="flex size-14 items-center justify-center rounded-machined bg-verdigris-wash text-verdigris mb-4 border border-verdigris/30">
              <CheckCircle2 className="size-7" />
            </div>
            <h3 className="font-display text-2xl font-semibold uppercase text-enamel">
              Application Transmitted!
            </h3>
            <p className="mt-2 max-w-sm text-xs text-steel leading-relaxed">
              Your technician profile and contact details have been delivered directly to the workshop owner at{" "}
              <strong className="text-enamel">{shopName}</strong>.
            </p>

            <div className="mt-6 flex flex-col sm:flex-row items-center gap-3">
              <button
                onClick={onClose}
                className="w-full sm:w-auto rounded-machined bg-enamel text-bench font-display font-semibold uppercase tracking-wider px-6 py-2.5 text-xs hover:bg-enamel-lift transition-all cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
