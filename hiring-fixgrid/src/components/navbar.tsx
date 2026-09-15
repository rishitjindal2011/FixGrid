"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Wrench, Plus, ShieldCheck, ArrowUpRight, Cpu, User, LogOut, ChevronDown, Lock, Store, Briefcase } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { BrandMark } from "@/components/brand-mark";

export function Navbar() {
  const { user, workshop, signOut } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Subdomain Indicator */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2.5 transition-opacity hover:opacity-90 group"
          >
            <BrandMark size="md" className="group-hover:scale-105" />
            <div className="flex items-center gap-2">
              <span className="flex items-baseline font-display text-xl uppercase tracking-tight text-enamel font-bold">
                <span>FIX</span>
                <span className="text-[#0284c7]">GRID</span>
              </span>
              <span className="rounded border border-signal/30 bg-signal-wash px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                HIRING
              </span>
            </div>
          </Link>
        </div>

        {/* Navigation Links & Action */}
        <nav className="flex items-center gap-3 sm:gap-5">
          <Link
            href="/jobs"
            className="hidden sm:inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel hover:text-signal transition-colors font-semibold"
          >
            <Briefcase className="size-3.5 text-signal" />
            Browse Openings
          </Link>

          <Link
            href="/join"
            className="hidden sm:inline-flex items-center gap-1.5 font-display text-xs uppercase tracking-wide text-steel hover:text-signal transition-colors font-semibold"
          >
            <ShieldCheck className="size-3.5 text-signal" />
            Join as Workshop
          </Link>

          <a
            href="http://localhost:3004"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 font-display text-xs uppercase tracking-wide text-steel hover:text-enamel transition-colors"
          >
            <Cpu className="size-3.5 text-signal" />
            <span>Parts &amp; Supply</span>
            <ArrowUpRight className="size-3 text-steel-soft" />
          </a>

          {/* User / Workshop Auth Status */}
          {user ? (
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 rounded-machined border border-hairline bg-bench px-2.5 py-1.5 text-xs text-enamel hover:border-steel-soft transition-colors cursor-pointer"
              >
                <div className="flex size-5 items-center justify-center rounded-full bg-signal text-white font-mono text-[10px] font-bold">
                  {workshop?.shop_name?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase() || "W"}
                </div>
                <div className="text-left hidden sm:block">
                  <div className="font-mono text-[11px] font-bold text-enamel leading-tight">
                    {workshop ? workshop.shop_name : "Bench Lead"}
                  </div>
                  <div className="font-mono text-[9px] text-steel-soft leading-tight truncate max-w-[110px]">
                    {user.email}
                  </div>
                </div>
                <ChevronDown className="size-3 text-steel" />
              </button>

              {/* Dropdown Menu */}
              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 rounded-machined border border-hairline bg-chalk p-2 shadow-lift z-50 text-xs font-sans">
                  <div className="px-3 py-2 border-b border-hairline">
                    <p className="font-mono text-[10px] text-steel-soft uppercase">Signed In As</p>
                    <p className="font-medium text-enamel truncate">{user.email}</p>
                    {workshop && (
                      <div className="mt-1 flex items-center gap-1 text-[11px] text-signal font-mono">
                        <Store className="size-3" />
                        <span className="truncate">{workshop.shop_name}</span>
                      </div>
                    )}
                  </div>

                  <div className="py-1">
                    <Link
                      href="/portal"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-enamel hover:bg-bench rounded transition-colors font-semibold"
                    >
                      <Store className="size-3.5 text-signal" />
                      <span>Workshop Portal</span>
                    </Link>

                    <Link
                      href="/post"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-enamel hover:bg-bench rounded transition-colors"
                    >
                      <Plus className="size-3.5 text-signal" />
                      <span>Post Bench Opening</span>
                    </Link>

                    <a
                      href="http://localhost:3000/dashboard/expert/hiring"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-3 py-1.5 text-left text-enamel hover:bg-bench rounded transition-colors"
                    >
                      <span className="flex items-center gap-2">
                        <Store className="size-3.5 text-steel" />
                        <span>FixGrid Workshop</span>
                      </span>
                      <ArrowUpRight className="size-3 text-steel-soft" />
                    </a>
                  </div>

                  <div className="border-t border-hairline pt-1">
                    <button
                      onClick={async () => {
                        setDropdownOpen(false);
                        await signOut();
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                    >
                      <LogOut className="size-3.5" />
                      <span>Bench Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="inline-flex h-9 items-center justify-center rounded-machined border border-hairline bg-chalk px-3.5 font-display text-xs uppercase tracking-wide text-enamel transition-colors hover:bg-bench"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
