import * as React from "react";
import { ShieldCheck, Cpu, Gauge, Truck, Sparkles } from "lucide-react";

export function QualityBanner() {
  const mandates = [
    {
      icon: Gauge,
      title: "Multimeter & Jig Testing",
      desc: "Every display, battery, and logic module is tested on active workshop rigs prior to customer pickup or courier dispatch.",
      accent: "text-signal bg-signal-wash border-signal/20",
    },
    {
      icon: ShieldCheck,
      title: "Smart Escrow Protection",
      desc: "Funds are locked in FixGrid escrow. Payout is released to the workshop only after the buyer confirms correct installation.",
      accent: "text-verdigris bg-verdigris-wash border-verdigris/20",
    },
    {
      icon: Cpu,
      title: "Anti-Counterfeit Grading",
      desc: "Strict distinction between Original Pulls (Grade A+), Factory OEM modules, and third-party replacements.",
      accent: "text-enamel bg-bench border-hairline",
    },
    {
      icon: Truck,
      title: "Rapid Local Bench Pickup",
      desc: "Need the part immediately? Walk directly into the certified workshop address and collect it from the bench.",
      accent: "text-signal bg-signal-wash border-signal/20",
    },
  ];

  return (
    <section id="quality" className="border-t border-hairline bg-bench/50 py-16 relative overflow-hidden">
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <span className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-chalk px-3 py-1 font-mono text-eyebrow font-semibold uppercase tracking-wider text-enamel shadow-xs mb-3">
            <Sparkles className="size-3 text-signal" /> The FixGrid Hardware Covenant
          </span>
          <h2 className="font-display text-3xl sm:text-4xl font-semibold uppercase tracking-tight text-enamel">
            Engineered for Precision &amp; Trust
          </h2>
          <p className="mt-3 text-sm sm:text-base text-steel leading-relaxed">
            Zero counterfeit components, verified workshop origins, and guaranteed compatibility testing.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {mandates.map((m, idx) => {
            const Icon = m.icon;
            return (
              <div
                key={idx}
                className="rounded-machined border border-hairline bg-chalk p-6 shadow-bench hover:shadow-lift transition-all flex flex-col justify-between"
              >
                <div>
                  <div className={`flex size-10 items-center justify-center rounded-machined border ${m.accent} mb-4 shadow-xs`}>
                    <Icon className="size-5" />
                  </div>
                  <h3 className="font-display text-base font-semibold uppercase tracking-tight text-enamel">
                    {m.title}
                  </h3>
                  <p className="mt-2 text-xs text-steel leading-relaxed">
                    {m.desc}
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
