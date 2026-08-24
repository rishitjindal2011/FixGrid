import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Site-wide 404. Reached for any path that isn't an expert, a CMS page, or a
 * known route — including a `seo_redirects` source that was deleted.
 */
export default function NotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-display">This page isn&apos;t here</h1>
      <p className="mt-4 leading-relaxed text-steel">
        The address may be mistyped, or the page may have been retired. The directory is
        the best place to pick the thread back up.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Button asChild size="lg">
          <Link href="/search">Find a repair expert</Link>
        </Button>
        <Button asChild variant="secondary" size="lg">
          <Link href="/">Back to the home page</Link>
        </Button>
      </div>
    </div>
  );
}
