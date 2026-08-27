import * as React from "react";
import { getTranslations } from "next-intl/server";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Clock,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Sparkles,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  JOB_TYPE_LABELS,
  SALARY_PERIOD_LABELS,
  WORK_LOCATION_LABELS,
  type ShopJobRow,
} from "@/lib/types/marketplace";

export async function PublicJobs({
  shopName,
  jobs,
}: {
  shopName: string;
  jobs: ShopJobRow[];
}) {
  const t = await getTranslations("jobs");

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-machined border border-hairline bg-surface p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-surface-raised text-steel">
          <Briefcase className="size-6" />
        </div>
        <h3 className="mt-4 font-display font-semibold text-lg text-enamel">
          {t("noVacanciesTitle")}
        </h3>
        <p className="mt-1.5 max-w-sm text-sm text-steel">
          {t("noVacanciesBody", { shopName })}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h2 className="font-display font-semibold text-xl text-enamel">
          {t("hiringHeading", { shopName })}
        </h2>
        <p className="text-sm text-steel">
          {t("hiringIntro")}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {jobs.map((job) => (
          <PublicJobCard key={job.id} shopName={shopName} job={job} />
        ))}
      </div>
    </div>
  );
}

async function PublicJobCard({
  shopName,
  job,
}: {
  shopName: string;
  job: ShopJobRow;
}) {
  const t = await getTranslations("jobs");

  // Format salary display
  let salaryText = t("salaryNegotiable");
  if (job.salary_type === "fixed" && job.salary_min) {
    salaryText = `₹${job.salary_min.toLocaleString("en-IN")} ${
      SALARY_PERIOD_LABELS[job.salary_period] ?? ""
    }`;
  } else if (
    job.salary_type === "range" &&
    (job.salary_min || job.salary_max)
  ) {
    const min = job.salary_min ? `₹${job.salary_min.toLocaleString("en-IN")}` : "₹0";
    const max = job.salary_max ? `₹${job.salary_max.toLocaleString("en-IN")}` : t("open");
    salaryText = `${min} – ${max} ${
      SALARY_PERIOD_LABELS[job.salary_period] ?? ""
    }`;
  } else if (job.salary_type === "commission") {
    salaryText = t("commission");
  }

  // Pre-filled WhatsApp message
  const whatsappNumber = (job.contact_whatsapp || job.contact_phone || "")
    .replace(/[^0-9]/g, "");
  const whatsappText = encodeURIComponent(
    t("whatsappMessage", { title: job.title, shopName }),
  );
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${whatsappText}`
    : null;

  return (
    <div className="flex flex-col justify-between gap-5 rounded-machined border border-hairline bg-surface p-6 shadow-sm transition-all hover:border-cyan/40">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <h3 className="font-display font-semibold text-lg text-enamel">
              {job.title}
            </h3>
            <div className="flex flex-wrap items-center gap-2 text-xs text-steel">
              <span className="flex items-center gap-1 font-medium text-cyan">
                <Briefcase className="size-3.5" />
                {JOB_TYPE_LABELS[job.job_type] ?? job.job_type}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <MapPin className="size-3.5 text-indigo" />
                {WORK_LOCATION_LABELS[job.work_location] ?? job.work_location}
              </span>
              {job.experience_level && job.experience_level !== "any" && (
                <>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Clock className="size-3.5 text-steel" />
                    {t("experience", { level: job.experience_level })}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Salary Pill */}
          <div className="flex flex-col items-end gap-1 rounded-machined border border-emerald/20 bg-emerald-wash px-3.5 py-2 text-right">
            <span className="font-display font-semibold text-sm text-emerald">
              {salaryText}
            </span>
            {job.salary_negotiable && (
              <span className="text-[11px] text-muted-foreground">
                {t("negotiableNote")}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="text-sm leading-relaxed text-steel-soft">
          <p className="whitespace-pre-line">{job.description}</p>
        </div>

        {/* Skills Required */}
        {job.skills_required && job.skills_required.length > 0 && (
          <div className="flex flex-col gap-1.5 pt-2">
            <span className="font-mono text-[11px] uppercase tracking-wider text-steel">
              {t("skills")}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {job.skills_required.map((skill, idx) => (
                <span
                  key={idx}
                  className="rounded-machined border border-hairline bg-surface-raised px-2.5 py-1 text-xs text-enamel"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
        <span className="text-xs text-steel">
          {t("postedBy", { shopName })}
        </span>

        <div className="flex flex-wrap items-center gap-2.5">
          {whatsappUrl && (
            <Button asChild variant="primary" size="sm" className="bg-[#25D366] text-white hover:bg-[#20bd5a]">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5"
              >
                <MessageCircle className="size-4" />
                {t("applyWhatsapp")}
              </a>
            </Button>
          )}

          {job.contact_phone && (
            <Button asChild variant="outline" size="sm">
              <a href={`tel:${job.contact_phone}`} className="flex items-center gap-1.5">
                <Phone className="size-4" />
                {t("call", { phone: job.contact_phone })}
              </a>
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
