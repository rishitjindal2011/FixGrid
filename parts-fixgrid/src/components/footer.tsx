import * as React from "react";
import { Cpu, ArrowUpRight, ShieldCheck } from "lucide-react";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-hairline bg-enamel text-bench py-14">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 pb-10 border-b border-enamel-lift">
          {/* Col 1: Brand */}
          <div className="md:col-span-2">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8 items-center justify-center rounded-machined bg-bench text-enamel font-bold shadow-xs">
                <Cpu className="size-4 text-signal" />
              </div>
              <span className="font-display text-xl font-bold uppercase tracking-tight text-bench">
                FIX<span className="text-signal">GRID</span> PARTS &amp; SUPPLY
              </span>
            </div>
            <p className="mt-3 text-xs text-bench/70 max-w-md leading-relaxed">
              FixGrid Parts is the certified hardware replacement exchange. Connecting verified workshop
              inventory with repair technicians, electronics hobbyists, and consumers with 0% advance risk escrow.
            </p>
            <div className="mt-4 flex items-center gap-2 text-xs text-bench/80">
              <ShieldCheck className="size-4 text-verdigris" />
              <span className="font-mono text-[11px]">All inventory matched to physical workshop bench stock</span>
            </div>
          </div>

          {/* Col 2: Ecosystem */}
          <div>
            <span className="font-mono text-eyebrow uppercase tracking-wider text-bench/60 font-bold block mb-4">
              FixGrid Ecosystem
            </span>
            <ul className="space-y-2.5 text-xs">
              <li>
                <a
                  href="https://vytron.me"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal transition-colors inline-flex items-center gap-1.5 text-bench/90"
                >
                  FixGrid Repair Platform
                  <ArrowUpRight className="size-3 text-bench/50" />
                </a>
              </li>
              <li>
                <a
                  href="http://localhost:3003"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal transition-colors inline-flex items-center gap-1.5 text-bench/90"
                >
                  Bench Careers &amp; Hiring
                  <ArrowUpRight className="size-3 text-bench/50" />
                </a>
              </li>
              <li>
                <a
                  href="https://vytron.me/search"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-signal transition-colors inline-flex items-center gap-1.5 text-bench/70"
                >
                  Find Nearby Workshops
                </a>
              </li>
            </ul>
          </div>

          {/* Col 3: For Workshops */}
          <div>
            <span className="font-mono text-eyebrow uppercase tracking-wider text-bench/60 font-bold block mb-4">
              Workshop Inventory
            </span>
            <ul className="space-y-2.5 text-xs text-bench/70">
              <li>
                <a href="https://vytron.me/dashboard" className="hover:text-bench transition-colors">
                  Workshop Owner Sign-In
                </a>
              </li>
              <li>
                <a href="#quality" className="hover:text-bench transition-colors">
                  Component Quality Mandates
                </a>
              </li>
              <li>
                <a href="mailto:parts@vytron.me" className="hover:text-bench transition-colors">
                  Parts Distribution Inquiry
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 font-mono text-[11px] text-bench/50">
          <p>© {new Date().getFullYear()} FixGrid · parts.vytron.me. All rights reserved.</p>
          <div className="flex items-center gap-1.5">
            <span>Crafted for hardware repair artisans on</span>
            <span className="text-bench font-bold">vytron.me</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
