import { getActiveInventory } from "@/lib/supabase";
import { PartsCatalog } from "@/components/parts-catalog";

export const revalidate = 60;

export default async function PartsHomePage() {
  const items = await getActiveInventory();

  return <PartsCatalog initialItems={items} />;
}
