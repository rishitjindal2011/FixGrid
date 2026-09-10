import * as React from "react";
import { ShieldCheck, Cpu, Banknote, Award, Sparkles } from "lucide-react";

export function StandardsBanner() {
  const standards = [
    {
      icon: Cpu,
      title: "ESD & Station Rigor",
      desc: "Workshops must maintain grounded ESD benches, optical microscopes, and temperature-governed hot-air rework setups.",
      accent: "text-signal bg-signal-wash border-signal/20",
    },
    {
      icon: Banknote,
      title: "Transparent Compensation",
      desc: "Zero hidden agency cuts. Wages, per-repair splits, and overtime are governed by clear written workshop agreements.",
      accent: "text-verdigris bg-verdigris-wash border-verdigris/20",
    },
    {
      icon: ShieldCheck,
      title: "Schematics & Diagnostic Autonomy",
      desc: "Technicians receive full access to boardview files, ZXW/XinZhiZao schematics, and proper multimeter/oscilloscope testing jigs.",
      accent: "text-enamel bg-bench border-hairline",
    },
    {
      icon: Award,
      title: "Skill Level Certification",
      desc: "Advance from L1 modular tech to L3 micro-soldering artisan with verified FixGrid bench accreditation badges.",
      accent: "text-signal bg-signal-wash border-signal/20",
    },
  ];

  return (
    <section id="standards" className="border-t border-hairline bg-bench/50 py-16 relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 font-mono text-eyebrow font-semibold uppercase tracking-wider text-enamel shadow-xs mb-3">
            <Sparkles className="size-3 text-signal" /> The FixGrid Bench Covenant
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-enamel">
            Engineered for Hardware Artisans
          </h2>
          <p className="mt-3 text-sm sm:text-base text-steel leading-relaxed">
            FixGrid ensures every technician works in a professional, safety-tested environment with
            transparent remuneration and zero recruiter commissions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {standards.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench hover:shadow-lift transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`flex size-10 items-center justify-center rounded-machined border ${s.accent} mb-4 shadow-xs`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold uppercase tracking-tight text-enamel">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-xs text-steel leading-relaxed">
                    {s.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
