import { getActiveInventory } from "@/lib/supabase";
import { PartsCatalog } from "@/components/parts-catalog";

export const revalidate = 60;

export const metadata = {
  title: "Component & Parts Catalog — FixGrid Parts & Supply",
  description: "Browse verified OEM screen pulls, PMIC silicon, battery packs, and repair lab consumables sourced from certified workshop benches across India.",
};

export default async function CatalogPage() {
  const items = await getActiveInventory();

  return <PartsCatalog initialItems={items} />;
}
