import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { AlertTriangle, ExternalLink, Plus } from "lucide-react";

import { ServiceForm } from "@/components/dashboard/expert/service-form";
import { ServiceList } from "@/components/dashboard/expert/service-list";
import { PageHeader } from "@/components/dashboard/page-header";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth/session";
import { getMyShop } from "@/lib/dashboard/claims";
import { listShopServices } from "@/lib/dashboard/expert";
import { getCategories } from "@/lib/queries/search";

export const metadata: Metadata = {
  title: "Services",
  robots: { index: false, follow: false },
};

/**
 * The service catalogue.
 *
 * The one page on the expert dashboard that gates everything else: a booking is
 * a request for a *service*, so a shop with an empty catalogue cannot receive
 * one however good its profile is. That is why the empty state here is a
 * sentence about consequences rather than a shrug, and why a catalogue where
 * every row is switched off gets its own warning — it is the same dead end
 * reached a different way, and nothing else on the dashboard would say so.
 *
 * Both reads go out together: the catalogue and the category list have no
 * dependency on one another, and `getCategories` degrades to `[]` before the
 * migration runs, which leaves the form's category select holding only its
 * "No category" option rather than breaking the page.
 */
export default async function ExpertServicesPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/dashboard/expert/services");

  // Already read by the layout's ownership gate and memoised for the request,
  // so this is a narrowing step rather than a second query. A null shop cannot
  // reach here — the gate renders the claim screen instead of these children.
  const shop = await getMyShop(user.id);
  if (!shop) redirect("/join");

  const [services, categories] = await Promise.all([
    listShopServices(shop.id),
    getCategories(),
  ]);

  // Narrowed at the boundary: the form only ever offers a name against an id,
  // and the rest of a category row has no business in the client bundle.
  const categoryOptions = categories.map((category) => ({
    id: category.id,
    name: category.name,
  }));

  const liveCount = services.filter((service) => service.is_active).length;
  const allSwitchedOff = services.length > 0 && liveCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow="Your shop"
        title="Services"
        description={
          services.length === 0
            ? "What you fix, what it costs and how long it takes. Customers book a service, not a shop."
            : "Customers book these. The order below is the order they see them in."
        }
        actions={
          <>
            <ServiceForm fixerId={shop.id} categories={categoryOptions}>
              <Button variant="primary" size="sm">
                <Plus aria-hidden />
                Add service
              </Button>
            </ServiceForm>
            <Button asChild variant="outline" size="sm">
              <Link href={`/expert/${shop.slug}`}>
                <ExternalLink aria-hidden />
                Public page
              </Link>
            </Button>
          </>
        }
      />

      {services.length > 0 ? (
        <p className="font-mono text-eyebrow uppercase tracking-[0.14em] text-steel">
          {liveCount} of {services.length} bookable
        </p>
      ) : null}

      {/* Every row switched off is the empty catalogue in disguise — the shop
          looks stocked from in here and takes no bookings at all. */}
      {allSwitchedOff ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-machined border border-rust/30 bg-rust-wash px-3 py-2.5 text-sm leading-relaxed text-rust"
        >
          <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0" />
          Every service is switched off, so nobody can book you. Switch at least one
          back on to start taking work again.
        </p>
      ) : null}

      <ServiceList
        fixerId={shop.id}
        services={services}
        categories={categoryOptions}
      />
    </div>
  );
}
