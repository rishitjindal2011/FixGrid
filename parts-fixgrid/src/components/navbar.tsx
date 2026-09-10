"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Cpu,
  Plus,
  ShieldCheck,
  ArrowUpRight,
  Package,
  LogOut,
  ChevronDown,
  Lock,
  Store,
  ShoppingCart,
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { useCart } from "@/lib/cart-context";

export function Navbar() {
  const { user, workshop, signOut } = useAuth();
  const { totalItems } = useCart();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 w-full border-b border-hairline bg-chalk/95 backdrop-blur shadow-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand & Subdomain Badge */}
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-3 transition-opacity hover:opacity-90 group"
          >
            <div className="flex size-9 items-center justify-center rounded-machined bg-enamel text-bench shadow-sm group-hover:bg-enamel-lift transition-colors">
              <Cpu className="size-4 text-signal" />
            </div>
            <div className="flex flex-col leading-none">
              <div className="flex items-center gap-1.5">
                <span className="font-display text-xl font-bold tracking-tight text-enamel uppercase">
                  FIX<span className="text-signal">GRID</span>
                </span>
                <span className="rounded bg-signal-wash border border-signal/20 px-1.5 py-0.5 font-mono text-[9px] font-bold tracking-wider text-signal uppercase">
                  PARTS &amp; SUPPLY
                </span>
              </div>
              <span className="font-mono text-[10px] text-steel-soft tracking-wider">
                parts.vytron.me
              </span>
            </div>
          </Link>

          {/* Telemetry Indicator */}
          <div className="hidden lg:flex items-center gap-2 rounded-machined border border-hairline bg-bench px-2.5 py-1 text-xs">
            <span className="relative flex size-2">
              <span className="animate-ping absolute inline-flex size-full rounded-full bg-verdigris opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-verdigris" />
            </span>
            <span className="font-mono text-[11px] font-medium text-enamel uppercase tracking-wider">
              Workshop Shelves Live
            </span>
          </div>
        </div>

        {/* Navigation Links & Action */}
        <nav className="flex items-center gap-3 sm:gap-4">
          <a
            href="#quality"
            className="hidden md:inline-flex items-center gap-1.5 text-xs font-mono font-medium text-steel hover:text-enamel transition-colors uppercase tracking-wider"
          >
            <ShieldCheck className="size-4 text-verdigris" />
            Quality Mandates
          </a>

          <a
            href="http://localhost:3003"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:inline-flex items-center gap-1 text-xs font-mono font-medium text-steel hover:text-enamel transition-colors uppercase tracking-wider"
          >
            <Package className="size-3.5 text-signal" />
            Bench Careers
            <ArrowUpRight className="size-3 text-steel-soft" />
          </a>

          {/* Interactive Cart Button with Badge */}
          <Link
            href="/cart"
            className="relative flex items-center gap-1.5 rounded-machined border border-hairline bg-bench hover:bg-chalk px-3 py-2 text-xs font-mono font-medium text-enamel transition-colors shadow-xs"
            title="Bench Cart"
          >
            <ShoppingCart className="size-4 text-signal" />
            <span className="hidden sm:inline font-bold">Cart</span>
            {totalItems > 0 && (
              <span className="flex size-5 items-center justify-center rounded-full bg-signal font-mono text-[10px] font-bold text-white shadow-xs animate-in zoom-in-75">
                {totalItems}
              </span>
            )}
          </Link>

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
                      href="/list"
                      onClick={() => setDropdownOpen(false)}
                      className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-enamel hover:bg-bench rounded transition-colors"
                    >
                      <Plus className="size-3.5 text-signal" />
                      <span>List Surplus Stock</span>
                    </Link>

                    <a
                      href="http://localhost:3000/dashboard/expert/inventory"
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
              className="inline-flex items-center gap-1.5 rounded-machined border border-hairline bg-bench hover:bg-chalk px-3 py-1.5 font-mono text-xs font-medium text-enamel transition-colors shadow-sm"
            >
              <Lock className="size-3 text-signal" />
              <span>Workshop Sign In</span>
            </Link>
          )}

          {/* Primary Action Button: Link to /list */}
          <Link
            href="/list"
            className="inline-flex items-center gap-1.5 rounded-machined bg-signal px-3 sm:px-4 py-2 font-display text-xs font-semibold uppercase tracking-wider text-white shadow-sm hover:bg-signal-lift transition-all active:scale-95 whitespace-nowrap"
          >
            <Plus className="size-3.5 stroke-[3]" />
            <span className="hidden sm:inline">List Surplus Stock</span>
            <span className="sm:hidden">List Stock</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
