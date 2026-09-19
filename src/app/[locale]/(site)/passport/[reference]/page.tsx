import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Printer,
  Wrench,
  Store,
  Calendar,
  Sparkles,
  ExternalLink,
  Cpu,
  Lock,
  ArrowRight,
} from "lucide-react";

import { getWarrantyPassport } from "@/lib/warranty/passport";
import { formatDateLong, formatMoney } from "@/lib/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ reference: string }>;
}): Promise<Metadata> {
  const { reference } = await params;
  return {
    title: `Digital Warranty Passport ${reference} · FixGrid Trust Shield`,
    description: `Tamper-proof digital warranty passport and verified repair ledger for booking ${reference}. Platform-backed 5-day guarantee and extended workshop warranty.`,
    robots: { index: false, follow: true },
  };
}

export default async function WarrantyPassportPage({
  params,
}: {
  params: Promise<{ locale: string; reference: string }>;
}) {
  const { reference } = await params;
  const passport = await getWarrantyPassport(reference);

  if (!passport) {
    notFound();
  }

  const isActive = passport.status === "active";
  const isExpired = passport.status === "expired";
  const isDisputed = passport.status === "disputed";

  return (
    <div className="min-h-screen bg-canvas pb-16 pt-8">
      {/* Container */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        
        {/* Navigation Breadcrumb */}
        <div className="mb-6 flex items-center justify-between print:hidden">
          <Link
            href="/"
            className="inline-flex items-center gap-2 font-display text-sm uppercase tracking-wide text-steel hover:text-signal"
          >
            ← FixGrid Network
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="gap-1.5"
              // In client browser, this triggers native print
              onClick={undefined}
              asChild
            >
              <a href="javascript:window.print()">
                <Printer className="size-4" />
                <span>Print Certificate</span>
              </a>
            </Button>
          </div>
        </div>

        {/* Certificate Card Container */}
        <div className="overflow-hidden rounded-2xl border-2 border-hairline bg-chalk shadow-2xl transition-all print:border-black print:shadow-none">
          
          {/* Top Security Banner */}
          <div className="relative border-b border-hairline bg-gradient-to-r from-enamel via-slate-900 to-enamel px-6 py-6 text-white sm:px-8">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="size-6 text-[#f97316]" />
                  <span className="font-mono text-xs uppercase tracking-widest text-[#fdba74]">
                    FixGrid Shield Certified
                  </span>
                </div>
                <h1 className="mt-1 font-display text-2xl uppercase tracking-tight text-white sm:text-3xl">
                  Digital Warranty Passport
                </h1>
                <p className="font-mono text-xs tracking-wider text-slate-400">
                  PASSPORT ID: <span className="text-white">{passport.passportId}</span>
                </p>
              </div>

              {/* Status Badge */}
              <div className="flex shrink-0">
                {isActive && (
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/80 px-4 py-1.5 text-emerald-400 shadow-sm">
                    <span className="relative flex size-2.5">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex size-2.5 rounded-full bg-emerald-500"></span>
                    </span>
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Active Warranty
                    </span>
                  </div>
                )}
                {isExpired && (
                  <div className="flex items-center gap-2 rounded-full border border-rose-500/30 bg-rose-950/80 px-4 py-1.5 text-rose-400 shadow-sm">
                    <AlertTriangle className="size-3.5" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Warranty Closed
                    </span>
                  </div>
                )}
                {isDisputed && (
                  <div className="flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-950/80 px-4 py-1.5 text-amber-400 shadow-sm">
                    <Clock className="size-3.5" />
                    <span className="font-mono text-xs font-bold uppercase tracking-wider">
                      Under Mediation
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Body Section */}
          <div className="p-6 sm:p-8">
            
            {/* Countdown / Guarantee Banner */}
            <div className="mb-8 rounded-xl border border-[#f97316]/30 bg-gradient-to-br from-orange-50/60 to-white p-5 dark:from-orange-950/20 dark:to-bench">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#ea580c]">
                    <Sparkles className="size-4" />
                    <span>Coverage Window</span>
                  </div>
                  <div className="mt-1 flex items-baseline gap-2">
                    <span className="font-display text-3xl font-extrabold text-enamel">
                      {passport.daysRemaining} Days Left
                    </span>
                    <span className="text-xs text-steel">
                      (Expires {formatDateLong(passport.expiresAt)})
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-steel">
                    Universal 5-day FixGrid platform shield + {passport.extendedShopDays}-day verified workshop coverage.
                  </p>
                </div>

                {/* Scannable QR Code */}
                <div className="flex flex-col items-center gap-1.5 self-center rounded-lg border border-hairline bg-white p-2.5 shadow-sm sm:self-auto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={passport.qrDataUrl}
                    alt={`QR Passport ${passport.reference}`}
                    className="size-28 rounded"
                  />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-steel">
                    Scan to Verify
                  </span>
                </div>
              </div>
            </div>

            {/* Hardware & Repair Ledger */}
            <div className="mb-8 grid gap-6 sm:grid-cols-2">
              
              {/* Device & Service Info */}
              <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-bench p-5">
                <div className="flex items-center gap-2 border-b border-hairline pb-3 font-display text-xs uppercase tracking-wider text-enamel">
                  <Cpu className="size-4 text-[#ea580c]" />
                  <span>Hardware Record</span>
                </div>
                
                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Serviced Device
                  </label>
                  <p className="font-semibold text-enamel">{passport.deviceName}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Repair Service
                  </label>
                  <p className="text-sm text-enamel">{passport.serviceName}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Total Settled Cost
                  </label>
                  <p className="font-mono text-base font-bold text-enamel">
                    {formatMoney(passport.repairCostPaise)}
                  </p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Completion Timestamp
                  </label>
                  <p className="font-mono text-xs text-steel">
                    {formatDateLong(passport.completedAt)}
                  </p>
                </div>
              </div>

              {/* Verified Workshop Info */}
              <div className="flex flex-col gap-4 rounded-xl border border-hairline bg-bench p-5">
                <div className="flex items-center gap-2 border-b border-hairline pb-3 font-display text-xs uppercase tracking-wider text-enamel">
                  <Store className="size-4 text-[#ea580c]" />
                  <span>Certified Workshop</span>
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-enamel">{passport.shop.name}</span>
                    {passport.shop.verified && (
                      <Badge variant="verified" className="text-[10px]">
                        Verified
                      </Badge>
                    )}
                    {passport.shop.isPro && (
                      <Badge variant="signal" className="text-[10px]">
                        Shop Pro
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 text-xs text-steel">{passport.shop.address}</p>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Escrow Verification
                  </label>
                  <div className="mt-1 flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400">
                    <CheckCircle2 className="size-3.5" />
                    <span>Two-Party OTP Handshake Cleared</span>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold uppercase tracking-wider text-steel">
                    Direct Contact
                  </label>
                  <p className="font-mono text-xs text-enamel">
                    {passport.shop.phone || "Protected via FixGrid Escrow"}
                  </p>
                </div>

                <div className="pt-1">
                  <Link
                    href={`/expert/${passport.shop.slug}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-[#ea580c] hover:underline"
                  >
                    <span>View Workshop Profile</span>
                    <ExternalLink className="size-3" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Quality Assurance Checklist */}
            <div className="mb-8 rounded-xl border border-hairline bg-canvas p-5">
              <h3 className="flex items-center gap-2 font-display text-xs uppercase tracking-wider text-enamel">
                <CheckCircle2 className="size-4 text-emerald-500" />
                <span>Verified Diagnostic & Integrity Checks</span>
              </h3>
              <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
                {passport.testedComponents.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-xs text-steel">
                    <span className="size-1.5 rounded-full bg-[#ea580c]" />
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Cryptographic Authenticity Signature */}
            <div className="rounded-xl border border-dashed border-hairline bg-bench p-4">
              <div className="flex items-start gap-3">
                <Lock className="mt-0.5 size-4 shrink-0 text-steel" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[11px] font-bold uppercase tracking-wider text-steel">
                      Tamper-Evident SHA-256 Fingerprint
                    </span>
                    <span className="font-mono text-[10px] text-emerald-600">
                      CRYPTOGRAPHICALLY SEALED
                    </span>
                  </div>
                  <p className="mt-1 break-all font-mono text-[11px] tracking-wider text-steel">
                    {passport.signature}
                  </p>
                  <p className="mt-2 text-[10px] text-steel-soft">
                    This passport is immutably generated by FixGrid. Any altered serial, tampered date, or unverified claims will invalidate the platform guarantee.
                  </p>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="mt-8 flex flex-col gap-3 pt-4 sm:flex-row sm:items-center sm:justify-between print:hidden">
              <Button asChild variant="outline" className="gap-2">
                <Link href="/">
                  <span>Find Other Repairers</span>
                </Link>
              </Button>

              {isActive && (
                <Button asChild className="gap-2 bg-[#ea580c] hover:bg-[#c2410c] text-white">
                  <Link href={`/dashboard/warranty/new?booking=${passport.reference}`}>
                    <ShieldCheck className="size-4" />
                    <span>Raise Platform Shield Claim</span>
                  </Link>
                </Button>
              )}
            </div>

          </div>
        </div>

        {/* Footer info */}
        <p className="mt-6 text-center text-xs text-steel print:hidden">
          Powered by FixGrid Decentralized Trust Infrastructure · <Link href="/" className="underline hover:text-signal">www.vytron.me</Link>
        </p>

      </div>
    </div>
  );
}
