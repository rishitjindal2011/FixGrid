"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import {
  BadgeCheck,
  Briefcase,
  Building2,
  Clock,
  Edit2,
  Eye,
  EyeOff,
  IndianRupee,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogBody,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import {
  deleteJobItem,
  toggleJobActive,
} from "@/lib/dashboard/expert-actions";
import {
  JOB_TYPE_LABELS,
  SALARY_PERIOD_LABELS,
  WORK_LOCATION_LABELS,
  type ShopJobRow,
} from "@/lib/types/marketplace";
import { JobForm } from "@/components/dashboard/expert/job-form";

export function JobList({
  fixerId,
  jobs,
}: {
  fixerId: string;
  jobs: ShopJobRow[];
}) {
  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-machined border border-dashed border-hairline bg-surface p-12 text-center">
        <div className="flex size-12 items-center justify-center rounded-full bg-cyan/10 text-cyan">
          <Briefcase className="size-6" />
        </div>
        <h3 className="mt-4 font-display font-semibold text-lg text-enamel">
          No Job Openings Posted Yet
        </h3>
        <p className="mt-1.5 max-w-md text-sm text-steel">
          Looking for a technician, repair assistant, or apprentice? Post a free job opening and candidates in your area can discover and apply directly.
        </p>
        <div className="mt-6">
          <JobForm fixerId={fixerId}>
            <Button variant="primary">
              <Plus className="size-4" />
              Post First Opening
            </Button>
          </JobForm>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {jobs.map((job) => (
        <JobCard key={job.id} fixerId={fixerId} job={job} />
      ))}
    </div>
  );
}

function JobCard({
  fixerId,
  job,
}: {
  fixerId: string;
  job: ShopJobRow;
}) {
  const [toggleState, toggleAction] = useActionState(
    toggleJobActive,
    BOOKING_INITIAL_STATE,
  );
  const [deleteState, deleteAction] = useActionState(
    deleteJobItem,
    BOOKING_INITIAL_STATE,
  );

  const [deleteOpen, setDeleteOpen] = React.useState(false);

  // Format salary display
  let salaryText = "Salary Negotiable";
  if (job.salary_type === "fixed" && job.salary_min) {
    salaryText = `₹${job.salary_min.toLocaleString("en-IN")} ${
      SALARY_PERIOD_LABELS[job.salary_period] ?? ""
    }`;
  } else if (
    job.salary_type === "range" &&
    (job.salary_min || job.salary_max)
  ) {
    const min = job.salary_min ? `₹${job.salary_min.toLocaleString("en-IN")}` : "₹0";
    const max = job.salary_max ? `₹${job.salary_max.toLocaleString("en-IN")}` : "Open";
    salaryText = `${min} – ${max} ${
      SALARY_PERIOD_LABELS[job.salary_period] ?? ""
    }`;
  } else if (job.salary_type === "commission") {
    salaryText = "Commission / Per Job Basis";
  }

  return (
    <div
      className={`relative flex flex-col justify-between gap-4 rounded-machined border bg-surface p-5 transition-all ${
        job.is_active
          ? "border-hairline shadow-sm"
          : "border-hairline/60 opacity-75"
      }`}
    >
      <div className="flex flex-col gap-3">
        {/* Top bar: Title + Badges + Toggle Switch */}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h4 className="font-display font-semibold text-base text-enamel">
                {job.title}
              </h4>
              <Badge variant={job.is_active ? "verified" : "neutral"}>
                {job.is_active ? "Active • Listed" : "Paused • Hidden"}
              </Badge>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-0.5 text-xs text-steel">
              <span className="flex items-center gap-1">
                <Briefcase className="size-3.5 text-cyan" />
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
                    {job.experience_level}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Active Status Toggle */}
          <form action={toggleAction} className="flex items-center gap-2">
            <input type="hidden" name="id" value={job.id} />
            <input
              type="hidden"
              name="active"
              value={job.is_active ? "off" : "on"}
            />
            <label
              htmlFor={`toggle-${job.id}`}
              className="cursor-pointer text-xs font-mono uppercase tracking-wider text-steel"
            >
              {job.is_active ? "Live" : "Paused"}
            </label>
            <Switch
              id={`toggle-${job.id}`}
              checked={job.is_active}
              onCheckedChange={() => {
                const form = document.getElementById(
                  `toggle-form-${job.id}`,
                ) as HTMLFormElement | null;
                form?.requestSubmit();
              }}
              aria-label="Toggle job active status"
            />
          </form>
          <form
            id={`toggle-form-${job.id}`}
            action={toggleAction}
            className="hidden"
          >
            <input type="hidden" name="id" value={job.id} />
            <input
              type="hidden"
              name="active"
              value={job.is_active ? "off" : "on"}
            />
          </form>
        </div>

        {/* Salary Highlight */}
        <div className="flex flex-wrap items-center gap-2 rounded-machined bg-surface-raised px-3 py-2 text-xs">
          <span className="font-semibold text-emerald">
            💰 {salaryText}
          </span>
          {job.salary_negotiable && (
            <span className="text-muted-foreground">• Negotiable</span>
          )}
        </div>

        {/* Description */}
        <p className="line-clamp-2 text-sm text-steel-soft">
          {job.description}
        </p>

        {/* Skills Chips */}
        {job.skills_required && job.skills_required.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {job.skills_required.map((skill, idx) => (
              <span
                key={idx}
                className="rounded-machined border border-hairline bg-surface px-2 py-0.5 font-mono text-[11px] text-steel"
              >
                {skill}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Footer: Contacts & Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-3">
        <div className="flex flex-wrap items-center gap-3 text-xs text-steel">
          {job.contact_phone && (
            <span className="flex items-center gap-1">
              <Phone className="size-3.5 text-steel" />
              {job.contact_phone}
            </span>
          )}
          {job.contact_whatsapp && (
            <span className="flex items-center gap-1">
              <MessageCircle className="size-3.5 text-emerald" />
              WhatsApp ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Edit Job */}
          <JobForm fixerId={fixerId} item={job}>
            <Button variant="outline" size="sm">
              <Edit2 className="size-3.5" />
              Edit
            </Button>
          </JobForm>

          {/* Delete Dialog */}
          <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
            <DialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-rust hover:bg-rust-wash">
                <Trash2 className="size-3.5" />
              </Button>
            </DialogTrigger>

            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Delete Job Opening?</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete <strong>{job.title}</strong>? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>

              <form action={deleteAction}>
                <input type="hidden" name="id" value={job.id} />
                <DialogFooter className="mt-4">
                  <DialogClose asChild>
                    <Button type="button" variant="outline">
                      Cancel
                    </Button>
                  </DialogClose>
                  <DeleteButton />
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>
    </div>
  );
}

function DeleteButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="danger" disabled={pending}>
      {pending ? "Deleting..." : "Delete Opening"}
    </Button>
  );
}
