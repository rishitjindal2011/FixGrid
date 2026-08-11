import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Plus } from "lucide-react";

import { InventoryForm } from "@/components/dashboard/expert/inventory-form";
import { InventoryList } from "@/components/dashboard/expert/inventory-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listShopInventory } from "@/lib/dashboard/expert";
import { getCategories } from "@/lib/queries/search";

export const metadata: Metadata = {
  title: "Inventory",
  robots: { index: false, follow: false },
};

export default async function ExpertInventoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/inventory");

  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const [inventory, categories] = await Promise.all([
    listShopInventory(shop.id),
    getCategories(),
  ]);

  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const liveCount = inventory.filter((item) => item.is_active).length;
  const allSwitchedOff = inventory.length > 0 && liveCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Inventory"
        description={
          inventory.length === 0
            ? "Parts and stock you sell over the counter. Customers see the name, price and whether it is in stock."
            : "Parts and stock you sell over the counter. Listed items appear on your public page."
        }
        actions={
          <>
            <InventoryForm fixerId={shop.id} categories={categoryOptions}>
              <Button variant="primary" size="sm">
                <Plus aria-hidden />
                Add item
              </Button>
            </InventoryForm>
            <Button asChild variant="outline" size="sm">
              <Link href={`/expert/${shop.slug}?tab=inventory`}>
                <ExternalLink aria-hidden />
                Public page
              </Link>
            </Button>
          </>
        }
      />

      {inventory.length > 0 ? (
        <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
          {liveCount} of {inventory.length} listed
        </p>
      ) : null}

      {allSwitchedOff ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Every item is switched off, so none appear on your public page.
        </p>
      ) : null}

      <InventoryList
        fixerId={shop.id}
        items={inventory}
        categories={categoryOptions}
      />
    </div>
  );
}
