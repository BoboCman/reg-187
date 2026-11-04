import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/AppNav";
import { BrandingForm } from "@/components/policyplan/BrandingForm";

export const metadata = { title: "Letterhead — PolicyPlan" };

export default async function BrandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: branding } = await supabase
    .from("advisor_branding")
    .select("*")
    .eq("advisor_id", user.id)
    .maybeSingle();

  return (
    <div className="min-h-screen bg-[var(--color-background)]">
      <AppNav />
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <h1 className="text-2xl font-semibold text-[var(--color-text-primary)]">Letterhead</h1>
        <p className="mt-1 text-sm text-[var(--color-text-secondary)]">
          How your name, firm and logo appear on every recommendation letter.
        </p>
        <BrandingForm advisorId={user.id} initial={branding ?? null} />
      </main>
    </div>
  );
}
