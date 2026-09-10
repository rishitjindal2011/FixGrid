import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://iusbwebxzrjwwfquscfp.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Iml1c2J3ZWJ4enJqd3dmcXVzY2ZwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NzEzNDUsImV4cCI6MjEwMDA0NzM0NX0.J7a2aVCo2oUoJj70LE9g7H4YNElJEz9XgovC4MY4hUE";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface ShopInventoryItem {
  id: string;
  fixer_id: string;
  category_id: string | null;
  sku: string | null;
  name: string;
  description: string | null;
  brand: string | null;
  condition: "new" | "refurbished" | "used";
  unit_price: number | null;
  currency: string;
  quantity: number;
  low_stock_threshold: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  fixer_profiles?: {
    shop_name: string;
    slug: string;
    address: string;
    verified: boolean;
    rating_avg: number;
    rating_count: number;
    contact_phone: string | null;
  } | null;
}

export async function getActiveInventory(): Promise<ShopInventoryItem[]> {
  try {
    const { data: items, error } = await supabase
      .from("shop_inventory")
      .select("*, fixer_profiles:fixer_profiles!shop_inventory_fixer_fkey(shop_name, slug, address, verified, rating_avg, rating_count, contact_phone)")
      .eq("is_active", true)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load inventory from Supabase with join, trying fallback:", error);
      const { data: rawItems } = await supabase.from("shop_inventory").select("*").eq("is_active", true);
      if (!rawItems || rawItems.length === 0) return [];
      
      const fixerIds = Array.from(new Set(rawItems.map(i => i.fixer_id)));
      const { data: shops } = await supabase
        .from("fixer_profiles")
        .select("id, shop_name, slug, address, verified, rating_avg, rating_count, contact_phone")
        .in("id", fixerIds);
        
      const shopMap = new Map((shops || []).map(s => [s.id, s]));

      return rawItems.map(i => ({
        ...i,
        fixer_profiles: shopMap.get(i.fixer_id) || null
      })) as ShopInventoryItem[];
    }

    return (items as unknown as ShopInventoryItem[]) || [];
  } catch (err) {
    console.error("Error in getActiveInventory:", err);
    return [];
  }
}
