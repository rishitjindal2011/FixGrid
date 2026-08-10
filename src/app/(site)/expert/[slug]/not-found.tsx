import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Empty and error states are directional, not apologetic: say what happened,
 * then give one clear way forward.
 */
export default function ExpertNotFound() {
  return (
    <div className="mx-auto max-w-lg px-4 py-24 text-center">
      <p className="eyebrow">Not in the registry</p>
      <h1 className="mt-3 text-display">This shop isn&apos;t listed</h1>
      <p className="mt-4 leading-relaxed text-steel">
        The listing may have been removed, or the link may be out of date. Browse the
        directory to find another repair expert nearby.
      </p>
      <Button asChild size="lg" className="mt-8">
        <Link href="/search">Browse repair experts</Link>
      </Button>
    </div>
  );
}
