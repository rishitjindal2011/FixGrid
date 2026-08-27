"use client";

import * as React from "react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { useTranslations } from "next-intl";
import { AlertTriangle, Briefcase, CheckCircle2 } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { Input, Select } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { BOOKING_INITIAL_STATE } from "@/lib/bookings/state";
import { saveJobItem } from "@/lib/dashboard/expert-actions";
import {
  type JobType,
  type WorkLocation,
  type SalaryType,
  type SalaryPeriod,
} from "@/lib/types/marketplace";

export interface EditableJobItem {
  id: string;
  title: string;
  job_type: JobType;
  work_location: WorkLocation;
  experience_level: string;
  salary_type: SalaryType;
  salary_min: number | null;
  salary_max: number | null;
  salary_period: SalaryPeriod;
  salary_negotiable: boolean;
  description: string;
  skills_required: string[];
  contact_phone: string | null;
  contact_whatsapp: string | null;
  contact_email: string | null;
  is_active: boolean;
}

const JOB_TYPE_ORDER: readonly JobType[] = [
  "full_time",
  "part_time",
  "contract",
  "apprenticeship",
];

const WORK_LOCATION_ORDER: readonly WorkLocation[] = [
  "in_shop",
  "on_field",
  "hybrid",
];

const SALARY_TYPE_ORDER: readonly SalaryType[] = [
  "negotiable",
  "fixed",
  "range",
  "commission",
];

const SALARY_PERIOD_ORDER: readonly SalaryPeriod[] = [
  "month",
  "week",
  "day",
  "per_job",
];

export function JobForm({
  fixerId,
  item = null,
  children,
}: {
  fixerId: string;
  item?: EditableJobItem | null;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const [state, formAction] = useActionState(saveJobItem, BOOKING_INITIAL_STATE);

  const tJobType = useTranslations("jobTypes");
  const tWorkLoc = useTranslations("workLocations");
  const tSalaryPeriod = useTranslations("salaryPeriods");

  const [salaryType, setSalaryType] = React.useState<SalaryType>(
    item?.salary_type ?? "negotiable",
  );

  const isEditing = Boolean(item);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>

      <DialogContent className="max-w-xl">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-machined bg-cyan/10 text-cyan">
              <Briefcase className="size-4" />
            </div>
            <DialogTitle>
              {isEditing ? "Edit Job Vacancy" : "Post a Job Opening"}
            </DialogTitle>
          </div>
          <DialogDescription>
            {isEditing
              ? "Update job details, salary, and requirements for this role."
              : "Post an open technician, assistant, or apprentice position. 100% free for your shop."}
          </DialogDescription>
        </DialogHeader>

        {state.success ? (
          <div className="flex flex-col gap-4 p-6">
            <div className="flex items-start gap-3 rounded-machined border border-emerald/30 bg-emerald-wash p-4 text-emerald">
              <CheckCircle2 className="mt-0.5 size-5 shrink-0" />
              <div>
                <p className="font-display font-medium text-sm">
                  {state.message ?? "Job vacancy saved successfully."}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Applicants will see this on your public shop profile.
                </p>
              </div>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="primary" onClick={() => setOpen(false)}>
                  Done
                </Button>
              </DialogClose>
            </DialogFooter>
          </div>
        ) : (
          <form action={formAction}>
            <input type="hidden" name="fixerId" value={fixerId} />
            {item?.id && <input type="hidden" name="id" value={item.id} />}

            <DialogBody className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto px-6 py-4">
              {state.error ? (
                <div
                  role="alert"
                  className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash p-3 text-sm text-rust"
                >
                  <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                  <p>{state.error}</p>
                </div>
              ) : null}

              {/* Title */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-title">
                  Job Title <span className="text-rust">*</span>
                </Label>
                <Input
                  id="job-title"
                  name="title"
                  placeholder="e.g. Smartphone Technician / Soldering Expert"
                  defaultValue={item?.title ?? ""}
                  required
                />
              </div>

              {/* Type & Location */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="job-type">
                    Employment Type <span className="text-rust">*</span>
                  </Label>
                  <Select
                    id="job-type"
                    name="jobType"
                    defaultValue={item?.job_type ?? "full_time"}
                  >
                    {JOB_TYPE_ORDER.map((jt) => (
                      <option key={jt} value={jt}>
                        {tJobType(jt)}
                      </option>
                    ))}
                  </Select>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="job-location">
                    Work Location <span className="text-rust">*</span>
                  </Label>
                  <Select
                    id="job-location"
                    name="workLocation"
                    defaultValue={item?.work_location ?? "in_shop"}
                  >
                    {WORK_LOCATION_ORDER.map((loc) => (
                      <option key={loc} value={loc}>
                        {tWorkLoc(loc)}
                      </option>
                    ))}
                  </Select>
                </div>
              </div>

              {/* Experience */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-exp">Experience Required</Label>
                <Input
                  id="job-exp"
                  name="experienceLevel"
                  placeholder="e.g. Fresher / 1-2 Years / 3+ Years"
                  defaultValue={item?.experience_level ?? "any"}
                />
              </div>

              {/* Salary Section */}
              <div className="rounded-machined border border-hairline bg-surface p-3.5">
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="job-salary-type">Salary Type</Label>
                      <Select
                        id="job-salary-type"
                        name="salaryType"
                        value={salaryType}
                        onChange={(e) =>
                          setSalaryType(e.target.value as SalaryType)
                        }
                      >
                        {SALARY_TYPE_ORDER.map((st) => (
                          <option key={st} value={st}>
                            {st === "negotiable"
                              ? "Negotiable"
                              : st === "fixed"
                              ? "Fixed Amount"
                              : st === "range"
                              ? "Salary Range"
                              : "Commission / Per Job"}
                          </option>
                        ))}
                      </Select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="job-salary-period">Payment Period</Label>
                      <Select
                        id="job-salary-period"
                        name="salaryPeriod"
                        defaultValue={item?.salary_period ?? "month"}
                      >
                        {SALARY_PERIOD_ORDER.map((p) => (
                          <option key={p} value={p}>
                            {tSalaryPeriod(p)}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </div>

                  {salaryType !== "negotiable" && (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="job-salary-min">
                          {salaryType === "range"
                            ? "Minimum Salary (₹)"
                            : "Amount (₹)"}
                        </Label>
                        <Input
                          id="job-salary-min"
                          name="salaryMin"
                          type="number"
                          min="0"
                          placeholder="e.g. 20000"
                          defaultValue={item?.salary_min ?? ""}
                        />
                      </div>

                      {salaryType === "range" && (
                        <div className="flex flex-col gap-1.5">
                          <Label htmlFor="job-salary-max">Maximum Salary (₹)</Label>
                          <Input
                            id="job-salary-max"
                            name="salaryMax"
                            type="number"
                            min="0"
                            placeholder="e.g. 35000"
                            defaultValue={item?.salary_max ?? ""}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-2 pt-1">
                    <Switch
                      id="job-negotiable"
                      name="salaryNegotiable"
                      defaultChecked={item?.salary_negotiable ?? true}
                    />
                    <Label htmlFor="job-negotiable" className="cursor-pointer text-xs text-muted-foreground">
                      Salary is negotiable based on candidate experience
                    </Label>
                  </div>
                </div>
              </div>

              {/* Skills */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-skills">
                  Key Skills (comma separated)
                </Label>
                <Input
                  id="job-skills"
                  name="skills"
                  placeholder="e.g. Soldering, Screen Repair, Motherboard Diagnostics"
                  defaultValue={item?.skills_required?.join(", ") ?? ""}
                />
              </div>

              {/* Description */}
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="job-desc">
                  Role Description & Timings <span className="text-rust">*</span>
                </Label>
                <Textarea
                  id="job-desc"
                  name="description"
                  rows={4}
                  placeholder="Describe key responsibilities, working hours, and what you are looking for..."
                  defaultValue={item?.description ?? ""}
                  required
                />
              </div>

              {/* Contact Information */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="job-phone">Contact Phone</Label>
                  <Input
                    id="job-phone"
                    name="contactPhone"
                    placeholder="e.g. +91 98765 43210"
                    defaultValue={item?.contact_phone ?? ""}
                  />
                </div>

                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="job-whatsapp">WhatsApp for Applications</Label>
                  <Input
                    id="job-whatsapp"
                    name="contactWhatsapp"
                    placeholder="e.g. +91 98765 43210"
                    defaultValue={item?.contact_whatsapp ?? ""}
                  />
                </div>
              </div>
            </DialogBody>

            <DialogFooter className="px-6 py-4">
              <DialogClose asChild>
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </DialogClose>
              <SubmitButton isEditing={isEditing} />
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}

function SubmitButton({ isEditing }: { isEditing: boolean }) {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" variant="primary" disabled={pending}>
      {pending
        ? isEditing
          ? "Saving..."
          : "Posting..."
        : isEditing
        ? "Save Changes"
        : "Post Job Vacancy"}
    </Button>
  );
}
