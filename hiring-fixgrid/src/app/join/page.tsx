"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, 
  MapPin, 
  Phone, 
  Mail, 
  Lock, 
  FileText, 
  Upload, 
  CheckCircle2, 
  ShieldCheck, 
  Cpu, 
  Sparkles, 
  AlertCircle, 
  X, 
  ArrowRight,
  Clock,
  Briefcase
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { useAuth } from "@/lib/auth-context";

interface UploadedFile {
  name: string;
  size: number;
  type: string;
  base64: string;
}

export default function WorkshopJoinPage() {
  const { user } = useAuth();
  
  // Form fields
  const [shopName, setShopName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactEmail, setContactEmail] = useState(user?.email || "");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [cityState, setCityState] = useState("");
  const [specialization, setSpecialization] = useState("Micro-Soldering & Logic Board Diagnostics");
  const [benchCapacity, setBenchCapacity] = useState("4");
  const [notes, setNotes] = useState("");
  
  // File attachments
  const [files, setFiles] = useState<UploadedFile[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Submission state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    shopId: string;
    claimId: string;
    slug: string;
  } | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError(null);
    const chosen = e.target.files;
    if (!chosen || chosen.length === 0) return;

    if (files.length + chosen.length > 5) {
      setUploadError("Maximum 5 evidence documents/photos allowed.");
      return;
    }

    Array.from(chosen).forEach((file) => {
      if (file.size > 5 * 1024 * 1024) {
        setUploadError(`File ${file.name} exceeds the 5MB size ceiling.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        setFiles((prev) => [
          ...prev,
          {
            name: file.name,
            size: file.size,
            type: file.type,
            base64: reader.result as string,
          },
        ]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (files.length === 0) {
      setError("Please attach at least one piece of physical evidence (storefront photo, workbench photo, or GST/registration certificate).");
      return;
    }

    setLoading(true);

    try {
      const fullAddress = cityState ? `${address}, ${cityState}` : address;
      const res = await fetch("/api/join/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          shopName,
          legalName,
          taxId,
          address: fullAddress,
          contactPhone,
          contactEmail,
          password: password || undefined,
          specialization,
          benchCapacity,
          notes,
          evidenceBase64: files,
          userId: user?.id,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit workshop application.");
      }

      setSubmittedData(data);
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 antialiased selection:bg-orange-500 selection:text-white">
      <Navbar />

      <main className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">
        {submittedData ? (
          /* SUCCESS RECEIPT STATE */
          <div className="max-w-2xl mx-auto bg-neutral-900/90 border border-neutral-800 rounded-2xl p-8 sm:p-10 shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
            <div className="w-16 h-16 bg-emerald-500/10 border border-emerald-500/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-400">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="text-center space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-mono font-medium text-emerald-400">
                APPLICATION SECURELY QUEUED
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
                Workshop Verification Transmitted
              </h1>
              <p className="text-neutral-400 text-sm leading-relaxed max-w-lg mx-auto">
                Your laboratory onboarding dossier for <span className="text-white font-semibold">{shopName}</span> has been securely submitted to the FixGrid Administration Console.
              </p>
            </div>

            <div className="mt-8 bg-neutral-950/70 border border-neutral-800/80 rounded-xl p-5 space-y-3 text-xs font-mono">
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-500">PORTAL ORIGIN</span>
                <span className="text-indigo-400 font-bold">hiring.vytron.me</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-500">PUBLIC STATUS</span>
                <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                  Hidden (Pending Review)
                </span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-500">CLAIM ID</span>
                <span className="text-neutral-300 truncate max-w-[200px]">{submittedData.claimId}</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-neutral-800/60">
                <span className="text-neutral-500">REGISTERED SLUG</span>
                <span className="text-neutral-300">/{submittedData.slug}</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span className="text-neutral-500">EVIDENCE ATTACHED</span>
                <span className="text-emerald-400 font-bold">{files.length} documents</span>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-orange-500/5 border border-orange-500/20 p-4 text-xs text-orange-300 leading-relaxed flex items-start gap-3">
              <Clock className="w-4 h-4 text-orange-400 shrink-0 mt-0.5" />
              <div>
                <strong>Next Steps:</strong> FixGrid administrators audit physical bench evidence and legal filings within 12–24 business hours. Once accepted in the admin console, your workshop listing and hiring vacancies will be automatically published.
              </div>
            </div>

            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link
                href="/portal"
                className="flex-1 inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-orange-600 hover:bg-orange-500 text-white font-semibold text-sm transition-colors shadow-lg shadow-orange-600/20"
              >
                Go to Workshop Portal
                <ArrowRight className="w-4 h-4" />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center justify-center px-5 py-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 font-semibold text-sm transition-colors border border-neutral-700"
              >
                Browse Hiring Stream
              </Link>
            </div>
          </div>
        ) : (
          /* FORM & OVERVIEW TWO-COLUMN LAYOUT */
          <div className="grid gap-12 lg:grid-cols-[1fr_32rem] items-start">
            {/* Left Column: Information & Trust Requirements */}
            <div className="space-y-8">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-mono font-semibold text-orange-400 mb-4">
                  <span className="w-2 h-2 rounded-full bg-orange-500 animate-pulse" />
                  WORKSHOP VERIFICATION & ONBOARDING DESK
                </div>
                <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                  List your laboratory or service bench on FixGrid
                </h1>
                <p className="mt-4 text-base sm:text-lg text-neutral-400 leading-relaxed">
                  Join the verified network of precision repair centers. To safeguard technicians and ensure zero fake job openings, all workshops require legal identity vetting and physical workbench evidence prior to activation.
                </p>
              </div>

              {/* Requirement Cards */}
              <div className="space-y-4">
                <div className="flex gap-4 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center shrink-0 text-orange-400">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Physical Bench & Tooling Evidence
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      Upload clear photographs of your actual service stations, microscope setups, thermal cameras, soldering jigs, or storefront trade signboard.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0 text-blue-400">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Legal Entity & Tax Credentials
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      Provide your official Trade License, GSTIN, Company PAN, or commercial registration number to authenticate your establishment.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-5 rounded-2xl bg-neutral-900/60 border border-neutral-800">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400">
                    <Briefcase className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-white">
                      Direct Technician Recruitment
                    </h3>
                    <p className="mt-1 text-xs sm:text-sm text-neutral-400 leading-relaxed">
                      Once verified by admin, post hiring openings, review candidate micro-soldering portfolios, and hire pre-vetted hardware specialists.
                    </p>
                  </div>
                </div>
              </div>

              {/* Admin Note Notice */}
              <div className="p-4 rounded-xl bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400 leading-relaxed">
                <span className="text-neutral-200 font-semibold">Security Protocol:</span> Applications are reviewed directly in the FixGrid Admin Console. Your bench profile remains in private draft status until approved by our compliance team.
              </div>
            </div>

            {/* Right Column: Full Verification Submission Form */}
            <div className="bg-neutral-900/90 border border-neutral-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
              <div className="mb-6">
                <h2 className="text-xl font-bold tracking-tight text-white">
                  Workshop Onboarding Form
                </h2>
                <p className="text-xs text-neutral-400 mt-1">
                  All fields are reviewed by platform administrators before activation.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Workshop & Legal Identity */}
                <div className="space-y-3">
                  <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold border-b border-neutral-800 pb-1">
                    1. Commercial & Legal Identity
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Workshop / Laboratory Trade Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      placeholder="e.g. Apex Micro-Soldering & Precision Lab"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Registered Legal Entity Name
                      </label>
                      <input
                        type="text"
                        value={legalName}
                        onChange={(e) => setLegalName(e.target.value)}
                        placeholder="e.g. Apex Tech Solutions LLP"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        GSTIN / Tax Registration ID *
                      </label>
                      <input
                        type="text"
                        required
                        value={taxId}
                        onChange={(e) => setTaxId(e.target.value)}
                        placeholder="e.g. 07AABCA1234F1Z5 or Trade Reg"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Contact & Access Credentials */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold border-b border-neutral-800 pb-1">
                    2. Primary Contact & Bench Access
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Primary Phone / WhatsApp *
                      </label>
                      <input
                        type="tel"
                        required
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder="+91 98765 43210"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Official Workshop Email *
                      </label>
                      <input
                        type="email"
                        required
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="lead@apexmicro.com"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>

                  {!user && (
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Bench Account Password *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••••••"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                      />
                      <span className="text-[10px] text-neutral-500 mt-1 block">Used to access your workshop recruitment portal.</span>
                    </div>
                  )}
                </div>

                {/* 3. Physical Bench Address */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold border-b border-neutral-800 pb-1">
                    3. Physical Laboratory Location
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      Street Address / Workshop Location *
                    </label>
                    <textarea
                      required
                      rows={2}
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Shop 14, Electronics Market, Sector 18"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-neutral-300 mb-1">
                      City, State & Postal PIN *
                    </label>
                    <input
                      type="text"
                      required
                      value={cityState}
                      onChange={(e) => setCityState(e.target.value)}
                      placeholder="e.g. Noida, Uttar Pradesh - 201301"
                      className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                    />
                  </div>
                </div>

                {/* 4. Capabilities & Scope */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold border-b border-neutral-800 pb-1">
                    4. Specialization & Bench Capacity
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Primary Specialization
                      </label>
                      <select
                        value={specialization}
                        onChange={(e) => setSpecialization(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white focus:outline-none focus:border-orange-500 transition-colors"
                      >
                        <option value="Micro-Soldering & Logic Board Diagnostics">Micro-Soldering & Logic Board</option>
                        <option value="BGA Rework & Chipset Replacement">BGA Rework & Chipset Replacement</option>
                        <option value="Screen Refurbishment & OCA Lamination">Screen Refurbishment & OCA</option>
                        <option value="Automotive ECU & Precision Hardware">Automotive ECU & Precision Hardware</option>
                        <option value="OEM Parts Distribution & Reclamation">OEM Parts Distribution</option>
                        <option value="General Multi-Brand Hardware Service">General Multi-Brand Service</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-neutral-300 mb-1">
                        Active Workbench Stations
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={benchCapacity}
                        onChange={(e) => setBenchCapacity(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-sm text-white placeholder-neutral-600 font-mono focus:outline-none focus:border-orange-500 transition-colors"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Evidence & Document Upload */}
                <div className="space-y-3 pt-2">
                  <div className="text-xs font-mono uppercase tracking-wider text-orange-400 font-bold border-b border-neutral-800 pb-1 flex items-center justify-between">
                    <span>5. Physical Bench & Legal Evidence *</span>
                    <span className="text-[10px] text-neutral-400 font-normal">Max 5 files (JPG, PNG, PDF)</span>
                  </div>

                  <div className="p-4 border-2 border-dashed border-neutral-800 rounded-2xl bg-neutral-950/50 hover:bg-neutral-950 hover:border-neutral-700 transition-all text-center">
                    <Upload className="w-6 h-6 text-neutral-400 mx-auto mb-2" />
                    <label className="cursor-pointer text-xs font-medium text-orange-400 hover:text-orange-300">
                      <span>Click to upload evidence documents or photos</span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,application/pdf"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </label>
                    <p className="text-[11px] text-neutral-500 mt-1">
                      Storefront board photo, microscope/soldering station photo, or GST/Trade certificate
                    </p>
                  </div>

                  {uploadError && (
                    <p className="text-xs text-red-400">{uploadError}</p>
                  )}

                  {files.length > 0 && (
                    <ul className="space-y-2">
                      {files.map((file, idx) => (
                        <li
                          key={idx}
                          className="flex items-center justify-between px-3 py-2 rounded-xl bg-neutral-950 border border-neutral-800 text-xs"
                        >
                          <span className="truncate max-w-[240px] text-neutral-300 font-mono">
                            {file.name}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-neutral-500 font-mono text-[10px]">
                              {(file.size / 1024).toFixed(0)} KB
                            </span>
                            <button
                              type="button"
                              onClick={() => removeFile(idx)}
                              className="p-1 hover:text-red-400 text-neutral-500 transition-colors"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* 6. Notes */}
                <div className="pt-2">
                  <label className="block text-xs font-medium text-neutral-300 mb-1">
                    Notes for Administration Reviewers
                  </label>
                  <textarea
                    rows={2}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Additional certifications (e.g. Apple IRP, IPC-7711), years in business, or specific hiring targets..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-neutral-950 border border-neutral-800 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-orange-500 transition-colors"
                  />
                </div>

                <div className="pt-4">
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white font-bold text-sm tracking-wide transition-all shadow-lg shadow-orange-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Submitting Application to Admin Queue...
                      </>
                    ) : (
                      <>
                        Submit Workshop for Administrative Review
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-neutral-500 text-center mt-2.5">
                    Upon submission, your application is reviewed in the Admin Console. Listings become public after approval.
                  </p>
                </div>
              </form>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
