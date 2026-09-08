"use client";

import { useTransition } from "react";
import { setAuthProvider } from "@/lib/actions/auth-provider";
import { Label } from "@/components/ui/label";

export function AuthToggle({ currentProvider }: { currentProvider: "supabase" | "clerk" }) {
  const [isPending, startTransition] = useTransition();

  const handleToggle = (provider: "supabase" | "clerk") => {
    if (provider === currentProvider) return;
    startTransition(async () => {
      try {
        await setAuthProvider(provider);
      } catch (err) {
        console.error(err);
        alert("Failed to update auth provider.");
      }
    });
  };

  return (
    <div className="flex flex-col gap-2">
      <Label className="text-sm font-medium text-steel">Authentication Provider</Label>
      <div className="flex w-full items-center gap-1 rounded-md border border-hairline bg-bench p-1 sm:w-auto">
        <button
          disabled={isPending}
          onClick={() => handleToggle("supabase")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            currentProvider === "supabase"
              ? "bg-white text-enamel shadow-sm"
              : "text-steel hover:text-enamel hover:bg-chalk"
          }`}
        >
          Supabase (Native)
        </button>
        <button
          disabled={isPending}
          onClick={() => handleToggle("clerk")}
          className={`flex-1 rounded px-3 py-1.5 text-sm font-medium transition-colors ${
            currentProvider === "clerk"
              ? "bg-white text-enamel shadow-sm"
              : "text-steel hover:text-enamel hover:bg-chalk"
          }`}
        >
          Clerk
        </button>
      </div>
    </div>
  );
}
