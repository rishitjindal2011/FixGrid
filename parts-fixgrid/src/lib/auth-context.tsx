"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export interface WorkshopProfile {
  id: string;
  shop_name: string;
  slug: string;
  address?: string;
  verified?: boolean;
  owner_id?: string;
  contact_phone?: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  workshop: WorkshopProfile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string, shopName?: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  createWorkshop: (shopName: string, address?: string, phone?: string) => Promise<{ error: string | null; workshop?: WorkshopProfile }>;
  refreshWorkshop: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [workshop, setWorkshop] = useState<WorkshopProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchWorkshopForUser = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from("fixer_profiles")
        .select("id, shop_name, slug, address, verified, owner_id")
        .eq("owner_id", userId)
        .maybeSingle();

      if (!error && data) {
        setWorkshop(data as WorkshopProfile);
      } else {
        setWorkshop(null);
      }
    } catch (err) {
      console.error("Error fetching workshop profile:", err);
      setWorkshop(null);
    }
  }, []);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchWorkshopForUser(session.user.id);
      }
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        await fetchWorkshopForUser(session.user.id);
      } else {
        setWorkshop(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [fetchWorkshopForUser]);

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        await fetchWorkshopForUser(data.user.id);
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to sign in";
      return { error: message };
    }
  };

  const signUp = async (email: string, password: string, shopName?: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            shop_name: shopName || "Parts & Hardware Bench",
          },
        },
      });

      if (error) {
        return { error: error.message };
      }

      if (data.user && shopName) {
        const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString().slice(-4);
        const res = await fetch("/api/auth/workshop", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: data.user.id,
            shopName,
            slug,
          }),
        });
        const resData = await res.json();
        if (resData.workshop) {
          setWorkshop(resData.workshop);
        }
      }

      return { error: null };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to create account";
      return { error: message };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setSession(null);
    setWorkshop(null);
  };

  const createWorkshop = async (shopName: string, address?: string, phone?: string) => {
    if (!user) return { error: "You must be signed in to register a workshop" };

    try {
      const slug = shopName.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + "-" + Date.now().toString().slice(-4);
      const res = await fetch("/api/auth/workshop", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId: user.id,
          shopName,
          slug,
          address: address || "Hardware Surplus Bench",
          contactPhone: phone,
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        return { error: resData.error || "Failed to register workshop" };
      }

      setWorkshop(resData.workshop);
      return { error: null, workshop: resData.workshop };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Network error creating workshop";
      return { error: message };
    }
  };

  const refreshWorkshop = async () => {
    if (user) {
      await fetchWorkshopForUser(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        workshop,
        loading,
        signIn,
        signUp,
        signOut,
        createWorkshop,
        refreshWorkshop,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
