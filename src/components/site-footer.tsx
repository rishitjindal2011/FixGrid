import Link from "next/link";
import { SITE_NAME } from "@/lib/site";

const COLUMNS: Array<{ heading: string; links: Array<{ label: string; href: string }> }> = [
  {
    heading: "Find a repair",
    links: [
      { label: "Browse all experts", href: "/search" },
      // Slugs must match `CATEGORY_SEEDS` in scripts/seed-content.ts, which is
      // what actually lands in `repair_categories`. These previously read
      // "phone-repair" / "appliance-repair" / "bicycle-repair" — no such rows,
      // so all three filtered the directory down to nothing.
      { label: "Phone repair", href: "/search?category=phones" },
      { label: "Appliance repair", href: "/search?category=appliances" },
      { label: "Bicycle repair", href: "/search?category=bicycles" },
    ],
  },
  {
    heading: "For repair shops",
    links: [
      { label: "List your shop", href: "/join" },
      { label: "How verification works", href: "/verification" },
    ],
  },
  {
    heading: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Privacy", href: "/privacy" },
      { label: "Terms", href: "/terms" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-hairline bg-chalk">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-xl uppercase text-enamel">{SITE_NAME}</p>
            <p className="mt-2 max-w-xs text-sm leading-relaxed text-steel">
              Verified local repair experts, with real hours and real reviews.
            </p>
          </div>

          {COLUMNS.map((column) => (
            <nav key={column.heading} aria-label={column.heading}>
              <p className="eyebrow">{column.heading}</p>
              <ul className="mt-3 space-y-2">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-steel transition-colors hover:text-signal"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <p className="mt-12 border-t border-hairline pt-6 font-mono text-eyebrow uppercase text-steel-soft">
          © {new Date().getFullYear()} {SITE_NAME}
        </p>
      </div>
    </footer>
  );
}
