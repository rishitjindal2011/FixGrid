import { getActiveInventory } from "@/lib/supabase";
import { PartsLandingPage } from "@/components/landing-page";

export const revalidate = 60;

export const metadata = {
  title: "FixGrid Parts & Supply — India's Verified Hardware & Component Exchange",
  description: "Direct-from-bench OEM donor pulls, tested PMIC silicon, battery packs, and repair lab rework supplies. Sourced from certified workshops across India with escrow protection.",
};

export default async function PartsHomePage() {
  const items = await getActiveInventory();

  return <PartsLandingPage featuredItems={items} totalCount={items.length} />;
}
