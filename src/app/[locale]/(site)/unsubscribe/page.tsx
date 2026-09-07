import type { Metadata } from "next";
import { UnsubscribeForm } from "@/components/notifications/unsubscribe-form";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Email Preferences & Unsubscribe | FixGrid",
    description: "Manage your email and communication preferences with FixGrid.",
    robots: { index: false, follow: false },
  };
}

interface PageProps {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ email?: string }>;
}

export default async function UnsubscribePage({ searchParams }: PageProps) {
  const { email } = await searchParams;

  return (
    <div className="min-h-[calc(100vh-200px)] bg-slate-950 px-4 py-16 text-slate-100 sm:py-24">
      <UnsubscribeForm initialEmail={email} />
    </div>
  );
}
