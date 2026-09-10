"use client";

import React, { useState } from "react";
import { X, ShieldCheck, Cpu, Lock, ArrowRight, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultMode?: "signin" | "signup";
  onSuccess?: () => void;
}

export function AuthModal({ isOpen, onClose, defaultMode = "signin", onSuccess }: AuthModalProps) {
  const { signIn, signUp, createWorkshop, user, workshop } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "register_workshop">(defaultMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [shopName, setShopName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signIn(email, password);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg("Workshop inventory credentials verified. Access granted.");
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        if (onSuccess) onSuccess();
      }, 900);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await signUp(email, password, shopName);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg("Workshop parts account created! Welcome to FixGrid Exchange.");
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        if (onSuccess) onSuccess();
      }, 1100);
    }
  };

  const handleRegisterWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const res = await createWorkshop(shopName, address, phone);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else {
      setSuccessMsg("Workshop registered and authenticated for hardware listing!");
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
        if (onSuccess) onSuccess();
      }, 900);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-zinc-700/80 bg-zinc-900 shadow-2xl z-10 font-sans text-zinc-100 animate-in fade-in zoom-in-95 duration-150">
        {/* Schematic Top Accent Banner */}
        <div className="relative border-b border-zinc-800 bg-zinc-950/80 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="flex size-9 items-center justify-center rounded-lg border border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Cpu className="size-4.5" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-amber-400 font-semibold">
                    PARTS INVENTORY AUTH
                  </span>
                  <span className="inline-block size-1.5 rounded-full bg-amber-400 animate-pulse" />
                </div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  {mode === "signin" && "Workshop Sign In"}
                  {mode === "signup" && "Create Workshop Account"}
                  {mode === "register_workshop" && "Register Parts Bench"}
                </h2>
              </div>
            </div>

            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-800 hover:text-white transition-colors"
            >
              <X className="size-5" />
            </button>
          </div>

          {/* Mode Tabs */}
          {(!user || mode !== "register_workshop") && (
            <div className="mt-4 flex rounded-lg border border-zinc-800 bg-zinc-900/90 p-0.5 text-xs font-medium">
              <button
                type="button"
                onClick={() => { setMode("signin"); setError(null); }}
                className={`flex-1 rounded-md py-1.5 text-center transition-all ${
                  mode === "signin"
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setMode("signup"); setError(null); }}
                className={`flex-1 rounded-md py-1.5 text-center transition-all ${
                  mode === "signup"
                    ? "bg-amber-500/15 text-amber-300 font-semibold border border-amber-500/30 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                }`}
              >
                Register Workshop
              </button>
            </div>
          )}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {error && (
            <div className="mb-4 flex items-start gap-2.5 rounded-lg border border-rose-500/30 bg-rose-500/10 p-3 text-xs text-rose-300">
              <AlertCircle className="size-4 shrink-0 text-rose-400 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="mb-4 flex items-center gap-2.5 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-300">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* If user is signed in but has no workshop registered */}
          {user && !workshop && (
            <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs">
              <p className="font-semibold text-amber-300">Active User: {user.email}</p>
              <p className="text-zinc-300 mt-1">
                To list components and surplus inventory, register your workshop bench details below:
              </p>
            </div>
          )}

          {/* SIGN IN FORM */}
          {mode === "signin" && !user && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                  Workshop Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="parts@workshop.fixgrid"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <div>
                <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                  Bench Password
                </label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Verifying Hardware ID...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Parts Bench</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* SIGN UP / REGISTER WORKSHOP FORM */}
          {((mode === "signup" && !user) || (user && !workshop)) && (
            <form onSubmit={user ? handleRegisterWorkshop : handleSignUp} className="space-y-4">
              <div>
                <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                  Workshop / Shop Name
                </label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  placeholder="e.g., Prime Logic Reclaim & Spares"
                  className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                />
              </div>

              {!user && (
                <>
                  <div>
                    <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      Contact Email
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="spares@primelogic.com"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      Password (min 6 characters)
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </>
              )}

              {user && (
                <>
                  <div>
                    <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      Workshop Location / City
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g., Lamington Road, Mumbai"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>

                  <div>
                    <label className="block font-mono text-[11px] font-medium text-zinc-400 uppercase mb-1.5">
                      Direct WhatsApp / Phone for Inquiries
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+91 98765 43210"
                      className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:border-amber-400 focus:outline-none focus:ring-1 focus:ring-amber-400"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 rounded-lg border border-amber-400/40 bg-gradient-to-b from-amber-400 to-amber-500 px-4 py-2.5 text-sm font-semibold text-zinc-950 shadow hover:from-amber-300 hover:to-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50 transition-all cursor-pointer"
              >
                {loading ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    <span>Registering Workshop...</span>
                  </>
                ) : (
                  <>
                    <span>{user ? "Save Workshop Profile" : "Register & Sign Up"}</span>
                    <ArrowRight className="size-4" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* If already fully signed in with workshop */}
          {user && workshop && (
            <div className="space-y-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
                  <ShieldCheck className="size-5" />
                  <span>Inventory Desk Authenticated</span>
                </div>
                <div className="mt-2 text-xs space-y-1 text-zinc-300">
                  <p><strong className="text-white">Workshop:</strong> {workshop.shop_name}</p>
                  <p><strong className="text-white">Account:</strong> {user.email}</p>
                  <p><strong className="text-white">Profile Slug:</strong> /{workshop.slug}</p>
                </div>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onSuccess) onSuccess();
                  }}
                  className="flex-1 rounded-lg border border-amber-400 bg-amber-400 py-2 text-center text-xs font-semibold text-zinc-950 hover:bg-amber-300"
                >
                  Proceed to List Hardware
                </button>
              </div>
            </div>
          )}

          {/* Schematic Footnote */}
          <div className="mt-5 border-t border-zinc-800/80 pt-4 flex items-center justify-between text-[11px] text-zinc-400">
            <span className="flex items-center gap-1 font-mono">
              <Lock className="size-3 text-amber-400/80" />
              FixGrid Supabase Auth
            </span>
            <span className="font-mono text-zinc-400">Domain: parts.vytron.me</span>
          </div>
        </div>
      </div>
    </div>
  );
}
